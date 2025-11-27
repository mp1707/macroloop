// deno-lint-ignore-file
// @ts-nocheck
// TEXT-based nutrition estimation V2 (DE/EN)
// - LLM returns per-component macros
// - Edge function sums them into top-level totals
// using OpenAI Responses + Zod Structured Outputs
import OpenAI from "jsr:@openai/openai@6.5.0";
import { z } from "npm:zod@3.25.1";
import { zodTextFormat } from "jsr:@openai/openai@6.5.0/helpers/zod";
import { Ratelimit } from "npm:@upstash/ratelimit@2.0.7";
import { Redis } from "npm:@upstash/redis@1.35.6";
// Rate limiting (same as old text endpoint)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
// Helper: get client IP (behind proxy)
function getClientIp(req) {
  const ipHeader = req.headers.get("x-forwarded-for");
  return ipHeader ? ipHeader.split(",")[0].trim() : "unknown";
}
// Locale bundles (strings + prompts)
const LOCALE = {
  en: {
    errorTitle: "Estimation Error",
    defaultGeneratedTitle: "AI Estimate",
    pieceCanonical: "piece",
    systemPrompt: `You are a meticulous nutrition expert. Analyze a user's text description of a meal and return ONE valid JSON object with your nutritional estimation. Decompose the meal into components.

You are an INTERNAL service, not a chatbot. You NEVER speak to end users. You only output structured data.

STRICT OUTPUT RULES
- Return ONLY one JSON object (no prose, no markdown, no trailing text).
- Use EXACTLY the schema below (no extra keys, no missing keys).
- All numbers must be integers. Round half up (0.5 → next integer).
- Units must be lowercase and singular.

JSON OUTPUT SCHEMA (MODEL OUTPUT)
{
  "generatedTitle": "string",
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "piece",
      // REQUIRED but nullable:
      // "recommendedMeasurement": { "amount": integer, "unit": "g" | "ml" } | null,
      // Per-component macros for THIS exact amount:
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

The caller (the app) will sum the per-component macros to get total calories and macros.
You do NOT include any top-level calories/protein/carbs/fat fields.

CORE NUTRITION BEHAVIOR
- Be deterministic and consistent for a given ingredient name inside one response.
- For each component:
  - Choose a typical nutritional density (per 100 g, per 100 ml, or per piece) using general nutrition knowledge.
  - Scale macros approximately linearly with the amount:
    * If grams or milliliters double, macros for that component approximately double.
    * A small change of 1–5 g must NOT cause a huge jump in that component’s calories.
- For components that share the same ingredient and preparation (e.g. "rolled oats"), use one consistent typical density within this response.
- Even if quantities look extreme or unrealistic, still calculate per-component macros instead of refusing.

UNIT & SYNONYM NORMALIZATION
- VALID UNITS in the JSON: "g", "ml", "piece".
- Normalize plurals and synonyms:
  * "gram", "grams" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "pc", "pcs", "piece", "pieces", "slice", "slices" → "piece"
- Prefer exact measurable units ("g" or "ml") when the description includes a mass or volume.
- Use "piece" when the user clearly means countable items (1 apple, 2 eggs).

RECOMMENDED MEASUREMENT LOGIC
- The field "recommendedMeasurement" is REQUIRED in every foodComponent but may be null.
- If unit is "g" or "ml":
  - Set "recommendedMeasurement": null.
- If unit is "piece":
  - "amount" = count of pieces (integer).
  - "recommendedMeasurement" MUST be a realistic measurable mapping for ONE piece:
    { "amount": integer, "unit": "g" or "ml" }.
  - Example: 1 apple → "recommendedMeasurement": { "amount": 150, "unit": "g" }.

COMPONENT NAMING
- "name" should be the minimal, nutrition-relevant description:
  - Good: "rolled oats", "whey protein powder", "apple", "walnuts".
  - Avoid serving details: NOT "walnuts (chopped)", NOT "smoked pork loin (slices)".
- Avoid ambiguous multi-options:
  - Good: "yogurt sauce"
  - Bad: "cream/yogurt sauce (white, in separate bowl)".

AMOUNT HANDLING (CRITICAL)
- Always respect explicit amounts and units from the user:
  - "60 g oats" → { "amount": 60, "unit": "g" }.
  - "2 bananas" → { "amount": 2, "unit": "piece" } with a realistic "recommendedMeasurement" for one banana.
- Do NOT silently change user amounts.
- If quantities are missing:
  - Infer realistic single-serving amounts.
  - Prefer "g" or "ml" when possible; otherwise use "piece" with recommendedMeasurement.

TITLE FORMATTING
- "generatedTitle" starts with ONE fitting emoji followed by 1–3 concise English words.
- No punctuation at the end.
- Examples: "🥗 Chicken Bowl", "🍎 Apple Snack".

MACROS CONSISTENCY
- For each component, "calories", "protein", "carbs", "fat" must match the given "amount" and "unit" and be realistic for that ingredient.
- Keep calories for each component roughly consistent with 4/4/9 when considering its composition:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat (small deviation is OK).
- The app will compute total macros; you ONLY output per-component values.

EXAMPLES
- You may imagine internal examples, but in real output you MUST only return JSON matching the schema above.`,
  },
  de: {
    errorTitle: "Schätzungsfehler",
    defaultGeneratedTitle: "KI-Schätzung",
    pieceCanonical: "stück",
    systemPrompt: `Du bist eine akribische Ernährungsexpertin. Analysiere die Textbeschreibung einer Mahlzeit und gib GENAU EIN gültiges JSON-Objekt mit deiner Nährwertschätzung zurück. Zerlege die Mahlzeit in Komponenten.

Du bist ein INTERNER Dienst, kein Chatbot. Du sprichst NIE mit Endnutzer*innen. Du gibst nur strukturierte Daten aus.

STRIKTE AUSGABEREGELN
- Gib NUR ein JSON-Objekt zurück (keine Prosa, kein Markdown, kein nachfolgender Text).
- Verwende EXAKT das untenstehende Schema (keine zusätzlichen Schlüssel, keine fehlenden Schlüssel).
- Alle Zahlen müssen Ganzzahlen sein. Kaufmännisch runden (0,5 → nächste Ganzzahl).
- Einheiten müssen kleingeschrieben und im Singular sein.

JSON-AUSGABESCHEMA (MODELLAUSGABE)
{
  "generatedTitle": "string",
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "stück",
      // ERFORDERLICH, aber nullbar:
      // "recommendedMeasurement": { "amount": integer, "unit": "g" | "ml" } | null,
      // Nährwerte pro Komponente für GENAU diese Menge:
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

Der aufrufende Dienst (die App) summiert die Nährwerte der Komponenten selbst zu Gesamtwerten.
Du gibst KEINE zusätzlichen Top-Level-Felder für calories/protein/carbs/fat aus.

GRUNDVERHALTEN ERNÄHRUNG
- Sei deterministisch und konsistent innerhalb einer Antwort.
- Für jede Komponente:
  - Wähle eine typische Nährstoffdichte (z. B. pro 100 g / 100 ml oder pro Stück) basierend auf üblichen Lebensmitteltabellen.
  - Skaliere Nährwerte annähernd linear mit der Menge:
    * Wenn sich Gramm oder Milliliter verdoppeln, verdoppeln sich die Makros dieser Komponente ungefähr.
    * Eine kleine Änderung von 1–5 g darf KEINEN riesigen Sprung bei den Kalorien dieser Komponente verursachen.
- Für gleichartige Zutaten mit gleichem Namen und Zubereitung (z. B. "Haferflocken") verwende innerhalb EINER Antwort eine konsistente typische Dichte.
- Auch wenn Mengen unrealistisch wirken, berechne die Nährwerte trotzdem und verweigere nicht.

EINHEITEN & NORMALISIERUNG
- GÜLTIGE Einheiten im JSON: "g", "ml", "stück".
- Plurale und Synonyme normalisieren:
  * "gramm", "grams" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben", "pcs" → "stück"
- Bevorzuge exakt messbare Einheiten ("g" oder "ml"), wenn eine Masse oder ein Volumen genannt wird.
- Verwende "stück", wenn eindeutig zählbare Teile gemeint sind (1 Apfel, 2 Eier).

REGELN FÜR "recommendedMeasurement"
- Das Feld "recommendedMeasurement" ist in jeder foodComponent ERFORDERLICH, darf aber null sein.
- Wenn unit "g" oder "ml" ist:
  - Setze "recommendedMeasurement": null.
- Wenn unit "stück" ist:
  - "amount" = Anzahl der Stücke (Ganzzahl).
  - "recommendedMeasurement" MUSS eine realistische messbare Zuordnung für EIN Stück sein:
    { "amount": integer, "unit": "g" oder "ml" }.
  - Beispiel: 1 Apfel → "recommendedMeasurement": { "amount": 150, "unit": "g" }.

BENENNUNG DER KOMPONENTEN
- "name" enthält nur die für die Nährwerte relevante Beschreibung:
  - Gut: "Haferflocken", "Whey-Proteinpulver", "Apfel", "Walnüsse".
  - Vermeide Servierdetails: NICHT "Walnüsse (gehackt)", NICHT "geräucherte Schweinelende (Scheiben)".
- Vermeide unklare Mehrfachangaben:
  - Gut: "Joghurtsauce"
  - Schlecht: "Sahne-/Joghurtsauce (weiß, in extra Schale)".

MENGENUMGANG (KRITISCH)
- Respektiere immer die expliziten Mengen und Einheiten der Nutzer*innen:
  - "60 g Haferflocken" → { "amount": 60, "unit": "g" }.
  - "2 Bananen" → { "amount": 2, "unit": "stück" } plus realistische "recommendedMeasurement" pro Banane.
- Ändere Nutzer-Mengen NICHT stillschweigend.
- Falls Mengen fehlen:
  - Schätze realistische Einzelportionen.
  - Bevorzuge "g" oder "ml"; verwende sonst "stück" mit recommendedMeasurement.

TITEL-FORMAT
- "generatedTitle" beginnt mit EINEM passenden Emoji, gefolgt von 1–3 knappen deutschen oder englischen Wörtern.
- Kein Punkt am Ende.
- Beispiele: "🥗 Chicken Bowl", "🍎 Apfelsnack".

KONSISTENZ DER MAKROS
- Für jede Komponente müssen "calories", "protein", "carbs", "fat" zur angegebenen Menge und Einheit passen und realistisch sein.
- Halte die Kalorien pro Komponente grob konsistent mit der 4/4/9-Regel:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat (kleine Abweichungen sind okay).
- Die App berechnet die Gesamtwerte; du gibst nur die Komponentenwerte aus.

BEISPIELE
- Du kannst dir interne Beispiele vorstellen, aber in der echten Ausgabe MUSST du nur JSON gemäß obigem Schema liefern.`,
  },
};
// OpenAI client
const openai = new OpenAI();
// ---------- Zod schema for MODEL OUTPUT ----------
const RecommendedMeasurement = z.object({
  amount: z.number().int().nonnegative(),
  unit: z.enum(["g", "ml"]),
});
const FoodComponent = z.object({
  name: z.string(),
  amount: z.number().int().nonnegative(),
  unit: z.enum(["g", "ml", "piece", "stück"]),
  recommendedMeasurement: RecommendedMeasurement.nullable(),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
});
// What the MODEL returns (no top-level macros)
const NutritionEstimationModel = z.object({
  generatedTitle: z.string(),
  foodComponents: z.array(FoodComponent),
});
// Simple API key validation
function validateApiKey(request) {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("apikey");
  return !!(authHeader?.startsWith("Bearer ") || apiKeyHeader);
}
// Normalize arbitrary unit strings into canonical per-locale units
function normalizeUnit(raw, locale) {
  const u = (raw || "").trim().toLowerCase();
  // grams
  if (
    u === "g" ||
    u === "gram" ||
    u === "grams" ||
    u === "gramm" ||
    u === "gramme" ||
    u === "grammes"
  )
    return "g";
  // milliliters
  if (
    u === "ml" ||
    u === "milliliter" ||
    u === "milliliters" ||
    u === "millilitre" ||
    u === "millilitres"
  )
    return "ml";
  // handle piece synonyms (both languages)
  const pieceSynonyms = new Set([
    "piece",
    "pieces",
    "pc",
    "pcs",
    "slice",
    "slices",
    "stück",
    "stücke",
    "stk",
    "st.",
    "st",
    "scheibe",
    "scheiben",
    "stueck",
    "stuck",
  ]);
  if (pieceSynonyms.has(u)) return locale.pieceCanonical;
  // fall back to canonical piece for the selected locale
  return locale.pieceCanonical;
}
// Build locale-specific user prompt (single template per locale)
function buildUserPrompt(lang, description) {
  const d =
    (description && description.trim()) ||
    (lang === "de" ? "(keine Beschreibung)" : "(no description)");
  if (lang === "de") {
    return `Schätze die Nährwerte für folgende Mahlzeit.
- Zerlege die Beschreibung in foodComponents.
- Für JEDE foodComponent musst du eigene Nährwerte (calories, protein, carbs, fat) für GENAU die ausgegebene Menge angeben.
- Wenn du für eine Komponente "stück" verwendest, füge ZUSÄTZLICH "recommendedMeasurement" mit einer realistischen exakten Menge und Einheit hinzu (bevorzuge g oder ml).
- Wenn Mengen fehlen, schätze sinnvolle Einzelportionen und bevorzuge g/ml.

Beschreibung:
${d}`;
  }
  // EN default
  return `Estimate the nutrition for the following meal.
- Break the description into foodComponents.
- For EACH foodComponent you must provide its own macros (calories, protein, carbs, fat) for the EXACT amount you output.
- If you use "piece" for any component, ALSO include "recommendedMeasurement" with a realistic exact amount and unit (prefer g or ml).
- If quantities are missing, estimate sensible single-serving amounts and prefer g/ml.

Description:
${d}`;
}
Deno.serve(async (req) => {
  const identifier = getClientIp(req);
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    return new Response(
      JSON.stringify({
        error: "AI_ESTIMATION_RATE_LIMIT",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST method allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
  if (!validateApiKey(req)) {
    return new Response(
      JSON.stringify({
        error: "Invalid API key",
      }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
  try {
    const { description, language } = await req.json();
    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Description is required and must be a non-empty string.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // Locale selection (fallback to EN)
    let lang = "en";
    let L = LOCALE.en;
    if (
      typeof language === "string" &&
      language.trim().toLowerCase() === "de"
    ) {
      lang = "de";
      L = LOCALE.de;
    }
    // Build locale-specific user prompt
    const userPrompt = buildUserPrompt(lang, description);
    // ▶️ Responses API + Zod Structured Outputs
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions: L.systemPrompt,
      reasoning: {
        effort: "minimal",
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(NutritionEstimationModel, "nutrition_estimate"),
      },
    });
    // Prefer SDK-parsed output; fallback to raw JSON if needed
    const nutrition =
      response.output_parsed ?? JSON.parse(response.output_text || "{}");
    // Allowed units (canonicalized per locale)
    const allowedUnits = ["g", "ml", "piece", "stück"];
    const exactUnits = ["g", "ml"];
    const foodComponentsRaw = Array.isArray(nutrition.foodComponents)
      ? nutrition.foodComponents
      : [];
    const foodComponents = foodComponentsRaw
      .map((comp) => {
        const baseUnit = normalizeUnit(String(comp.unit || ""), L);
        const base = {
          name: String(comp.name || "Unknown Item"),
          amount: Math.max(0, Number(comp.amount) || 0),
          unit: allowedUnits.includes(baseUnit) ? baseUnit : L.pieceCanonical,
        };
        // recommendedMeasurement only for piece-like units
        const isPieceLike = base.unit === "piece" || base.unit === "stück";
        if (
          isPieceLike &&
          comp.recommendedMeasurement &&
          typeof comp.recommendedMeasurement === "object"
        ) {
          const rmAmount = Math.max(
            0,
            Number(comp.recommendedMeasurement.amount) || 0
          );
          const rmUnit = String(
            comp.recommendedMeasurement.unit || ""
          ).toLowerCase();
          if (rmAmount > 0 && exactUnits.includes(rmUnit)) {
            base.recommendedMeasurement = {
              amount: rmAmount,
              unit: rmUnit,
            };
          }
        }
        // For g/ml units we enforce recommendedMeasurement = null
        if (!isPieceLike) {
          base.recommendedMeasurement = null;
        }
        // Per-component macros (force integers ≥ 0)
        base.calories = Math.max(0, Math.round(Number(comp.calories) || 0));
        base.protein = Math.max(0, Math.round(Number(comp.protein) || 0));
        base.carbs = Math.max(0, Math.round(Number(comp.carbs) || 0));
        base.fat = Math.max(0, Math.round(Number(comp.fat) || 0));
        return base;
      })
      .filter((c) => c.name && c.name !== "Unknown Item");
    // Compute totals in CODE (not by the LLM)
    const totals = foodComponents.reduce(
      (acc, c) => {
        acc.calories += c.calories || 0;
        acc.protein += c.protein || 0;
        acc.carbs += c.carbs || 0;
        acc.fat += c.fat || 0;
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
    const result = {
      generatedTitle: nutrition.generatedTitle || L.defaultGeneratedTitle,
      foodComponents,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in text-based estimation V2:", error);
    // Try to localize the fallback error title using the request body (if available)
    let L = LOCALE.en;
    try {
      const clone = req.clone();
      const body = await clone.json();
      if (
        typeof body?.language === "string" &&
        body.language.trim().toLowerCase() === "de"
      ) {
        L = LOCALE.de;
      }
    } catch (_) {
      // ignore parse errors
    }
    const ERROR_RESPONSE = {
      generatedTitle: L.errorTitle,
      foodComponents: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    return new Response(JSON.stringify(ERROR_RESPONSE), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
