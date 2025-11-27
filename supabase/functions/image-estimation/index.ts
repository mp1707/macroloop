// deno-lint-ignore-file
// @ts-nocheck
// Unified IMAGE-based nutrition estimation V2 (DE/EN)
// - LLM returns per-component macros
// - Edge function sums components to top-level totals
// using OpenAI Responses + Zod Structured Outputs
import OpenAI from "jsr:@openai/openai@6.5.0";
import { z } from "npm:zod@3.25.1";
import { zodTextFormat } from "jsr:@openai/openai@6.5.0/helpers/zod";
import { Ratelimit } from "npm:@upstash/ratelimit@2.0.7";
import { Redis } from "npm:@upstash/redis@1.35.6";
import { createClient } from "npm:@supabase/supabase-js@2.39.4";
// Supabase client with Service Role key for privileged operations
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      persistSession: false,
    },
  }
);
// Rate limiting
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, "60 s"),
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
    invalidImageTitle: "Invalid Image",
    defaultGeneratedTitle: "Food Image Analysis",
    pieceCanonical: "piece",
    systemPrompt: `You are a meticulous nutrition expert for FOOD IMAGE analysis. Given one image plus optional user text, return exactly ONE JSON object with your nutritional estimation.

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

NON-FOOD IMAGES
- If the image clearly does NOT show food:
  - "generatedTitle": "🚫 not food"
  - "foodComponents": []

CORE NUTRITION BEHAVIOR
- Be deterministic and consistent for a given ingredient name inside one response.
- For each component:
  - Choose a typical nutritional density (per 100 g, per 100 ml, or per piece) using general nutrition knowledge.
  - Scale macros approximately linearly with the amount:
    * If grams or milliliters double, macros for that component approximately double.
    * A small change of 1–5 g must NOT cause a huge jump in that component’s calories.
- For components that share the same ingredient and preparation (e.g. "cooked white rice"), use one consistent typical density within this response.
- Even if amounts look extreme or unrealistic, still calculate per-component macros instead of refusing.

UNIT & SYNONYM NORMALIZATION
- VALID UNITS in the JSON: "g", "ml", "piece".
- Normalize plurals and synonyms:
  * "gram", "grams" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "pc", "pcs", "piece", "pieces", "slice", "slices" → "piece"
- Prefer exact measurable units ("g" or "ml") when you can infer a mass or volume.
- Use "piece" when the item is naturally countable (e.g. 1 apple, 2 meatballs).

RECOMMENDED MEASUREMENT LOGIC
- The field "recommendedMeasurement" is REQUIRED in every foodComponent but may be null.
- If unit is "g" or "ml":
  - Set "recommendedMeasurement": null.
- If unit is "piece":
  - "amount" = count of pieces (integer).
  - "recommendedMeasurement" MUST be a realistic measurable mapping for ONE piece:
    { "amount": integer, "unit": "g" or "ml" }.
  - Example: 1 apple → "recommendedMeasurement": { "amount": 150, "unit": "g" }.

TITLE FORMATTING
- "generatedTitle" starts with ONE fitting emoji followed by 1–3 concise English words.
- No punctuation at the end.
- Examples: "🥗 Chicken Bowl", "🍎 Apple Snack".

COMPONENT NAMING
- "name" should be the minimal, nutrition-relevant description:
  - Good: "grilled chicken breast", "cooked white rice", "apple", "walnuts".
  - Avoid serving details not relevant for macros:
    * NOT "walnuts (chopped)", NOT "smoked pork loin (slices)".
- Avoid ambiguous multi-options:
  - Good: "yogurt sauce"
  - Bad: "cream/yogurt sauce (white, in separate bowl)".

QUANTITY FROM IMAGE & TEXT
- Estimate what the user wants analyzed:
  - If the image shows a whole bagel but the user text says "ate half" or "half bagel":
    - Estimate macros for a half bagel, not a full one.
    - Use an appropriate generatedTitle (e.g. "🥯 Half Bagel").
- Identify 1–10 main visible foodComponents.
- Estimate grams or milliliters based on:
  - plate size,
  - cutlery size,
  - visible packaging,
  - typical serving sizes.
- For "piece" components, use count for "amount" and give a realistic recommendedMeasurement per piece.

MACROS CONSISTENCY (PER COMPONENT)
- For each component, "calories", "protein", "carbs", "fat" must match its "amount" and "unit" and be realistic for that ingredient.
- Keep calories for each component roughly consistent with the 4/4/9 rule:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat (small deviation is OK).

OUTPUT
- The caller will compute meal totals from your per-component values.
- You ONLY output the JSON object matching the schema above.`,
  },
  de: {
    invalidImageTitle: "Ungültiges Bild",
    defaultGeneratedTitle: "Lebensmittelbild-Analyse",
    pieceCanonical: "stück",
    systemPrompt: `Du bist eine akribische Ernährungsexpertin für die ANALYSE VON ESSENSBILDERN. Zu einem Bild (+ optionalem Nutzertext) sollst du GENAU EIN JSON-Objekt mit deiner Nährwertschätzung zurückgeben.

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

NICHT-ESSENSBILDER
- Wenn das Bild eindeutig KEIN Essen zeigt:
  - "generatedTitle": "🚫 kein Essen"
  - "foodComponents": []

GRUNDVERHALTEN ERNÄHRUNG
- Sei deterministisch und konsistent innerhalb einer Antwort.
- Für jede Komponente:
  - Wähle eine typische Nährstoffdichte (z. B. pro 100 g / 100 ml oder pro Stück) basierend auf üblichen Lebensmitteltabellen.
  - Skaliere Nährwerte annähernd linear mit der Menge:
    * Wenn sich Gramm oder Milliliter verdoppeln, verdoppeln sich die Makros dieser Komponente ungefähr.
    * Eine kleine Änderung von 1–5 g darf KEINEN riesigen Sprung bei den Kalorien dieser Komponente verursachen.
- Für gleichartige Zutaten mit gleichem Namen und Zubereitung (z. B. "Haferflocken") verwende innerhalb EINER Antwort eine konsistente typische Dichte.
- Auch wenn Mengen unrealistisch wirken, berechne die Nährwerte trotzdem und verweigere nicht.

DEUTSCHLAND-PRIORITÄT
- Bevorzuge Zutaten, Produkte und Gerichte, die in Deutschland bzw. der EU üblich/verfügbar sind, und nutze gängige Portions- und Nährwertbezüge.
- Vermeide US-spezifische Produkte, die hier typischerweise nicht erhältlich sind.

EINHEITEN & NORMALISIERUNG
- GÜLTIGE Einheiten im JSON: "g", "ml", "stück".
- Plurale und Synonyme normalisieren:
  * "gramm", "grams" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben", "pcs" → "stück"
- Bevorzuge exakt messbare Einheiten ("g" oder "ml"), wenn eine Masse oder ein Volumen erkennbar ist.
- Verwende "stück", wenn eindeutig zählbare Teile gemeint sind (1 Apfel, 2 Frikadellen).

REGELN FÜR "recommendedMeasurement"
- Das Feld "recommendedMeasurement" ist in jeder foodComponent ERFORDERLICH, darf aber null sein.
- Wenn unit "g" oder "ml" ist:
  - Setze "recommendedMeasurement": null.
- Wenn unit "stück" ist:
  - "amount" = Anzahl der Stücke (Ganzzahl).
  - "recommendedMeasurement" MUSS eine realistische messbare Zuordnung für EIN Stück sein:
    { "amount": integer, "unit": "g" oder "ml" }.
  - Beispiel: 1 Apfel → "recommendedMeasurement": { "amount": 150, "unit": "g" }.

TITEL-FORMAT
- "generatedTitle" beginnt mit EINEM passenden Emoji, gefolgt von 1–3 knappen deutschen oder englischen Wörtern.
- Kein Punkt am Ende.
- Beispiele: "🥗 Chicken Bowl", "🍎 Apfelsnack".

BENENNUNG DER KOMPONENTEN
- "name" umfasst ausschließlich die für die Nährwerte relevante Beschreibung:
  - Gut: "gegrillte Hähnchenbrust", "gekochter Reis", "Apfel", "Walnüsse".
  - Vermeide Servierdetails: NICHT "Walnüsse (gehackt)", NICHT "geräucherte Schweinelende (Scheiben)".
- Vermeide unklare Mehrfachangaben:
  - Gut: "Joghurtsauce"
  - Schlecht: "Sahne-/Joghurtsauce (weiß, in extra Schale)".

MENGEN AUS BILD & TEXT
- Schätze die Menge, die die Nutzerin wirklich analysiert haben möchte:
  - Wenn auf dem Bild ein ganzer Bagel zu sehen ist, der Text aber "Hälfte gegessen" oder "halber Bagel" sagt:
    - Schätze die Nährwerte für einen halben Bagel, nicht für einen ganzen.
    - Verwende einen passenden generatedTitle (z. B. "🥯 Halber Bagel").
- Identifiziere 1–10 Hauptkomponenten.
- Schätze Gramm oder Milliliter anhand von:
  - Tellergröße,
  - Besteckgröße,
  - sichtbarer Verpackung,
  - üblichen Portionsgrößen.
- Für "stück"-Komponenten:
  - amount = Anzahl der Stücke,
  - recommendedMeasurement = realistische Gramm-/ml-Angabe pro Stück.

KONSISTENZ DER MAKROS (PRO KOMPONENTE)
- Für jede Komponente müssen "calories", "protein", "carbs", "fat" zur Menge und Einheit passen und realistisch sein.
- Halte die Kalorien pro Komponente grob konsistent mit der 4/4/9-Regel:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat (kleine Abweichungen sind okay).

AUSGABE
- Die App berechnet die Gesamtwerte selbst aus den Komponenten.
- Du gibst nur das JSON-Objekt gemäß obigem Schema aus.`,
  },
};
// OpenAI client
const openai = new OpenAI();
// ---------- Zod schema for model output ----------
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
// Model-level output (no top-level macros)
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
    "stk",
    "st.",
    "st",
    "stück",
    "stueck",
    "stuck",
  ]);
  if (pieceSynonyms.has(u)) return locale.pieceCanonical;
  // fall back to canonical piece for the selected locale
  return locale.pieceCanonical;
}
// Build locale-specific user prompt (single template per locale)
function buildUserPrompt(lang, title, description) {
  const t =
    (title && title.trim()) || (lang === "de" ? "(kein Titel)" : "(no title)");
  const d =
    (description && description.trim()) ||
    (lang === "de" ? "(keine Beschreibung)" : "(no description)");
  if (lang === "de") {
    return `Analysiere dieses Essensbild und schätze den Nährwert ab.
- Zerlege das Bild (ggf. mit Titel/Beschreibung) in foodComponents.
- Für JEDE foodComponent musst du eigene Nährwerte (calories, protein, carbs, fat) für GENAU die ausgegebene Menge angeben.
- Wenn du die Einheit "stück" verwendest, füge ZUSÄTZLICH "recommendedMeasurement" mit exakter Menge+Einheit hinzu (z. B. g oder ml).
- Wenn das Bild eindeutig kein Essen zeigt, gib "generatedTitle": "🚫 kein Essen" und eine leere Liste "foodComponents" zurück.

Benutzerkontext:
Titel: ${t}
Beschreibung: ${d}`;
  }
  // EN default
  return `Analyze this food image and estimate its nutritional content.
- Break the image (with optional title/description) into foodComponents.
- For EACH foodComponent you must provide its own macros (calories, protein, carbs, fat) for the EXACT amount you output.
- If you use "piece" as a unit, ALSO include recommendedMeasurement with an exact amount+unit (e.g., g or ml).
- If the image clearly does not show food, return "generatedTitle": "🚫 not food" and an empty "foodComponents" list.

User context:
Title: ${t}
Description: ${d}`;
}
// Main handler
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const { imagePath, title, description, language } = await req.json();
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
    const bucket = "food-images";
    const expiresIn = 60;
    if (!imagePath?.trim()) {
      return new Response(
        JSON.stringify({
          error: "ImagePath is required",
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
    // Create a signed URL for the provided image
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(imagePath, expiresIn);
    if (error || !data) {
      console.error("Signed URL error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create signed URL",
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
    const imageUrl = data.signedUrl;
    // Build locale-specific user prompt
    const userPrompt = buildUserPrompt(lang, title, description);
    // Call OpenAI Responses API with locale-appropriate system prompt
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
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(NutritionEstimationModel, "nutrition_estimate"),
      },
    });
    // Parse structured output
    const nutrition =
      response.output_parsed ?? JSON.parse(response.output_text || "{}");
    // Allowed units (accept superset; canonicalize per locale)
    const allowedUnits = ["g", "ml", "piece", "stück"];
    const exactUnits = ["g", "ml"];
    // Sanitize components into our final payload (canonicalize units per locale)
    const foodComponentsRaw = Array.isArray(nutrition.foodComponents)
      ? nutrition.foodComponents
      : [];
    const sanitizedComponents = foodComponentsRaw
      .map((comp) => {
        const baseUnit = normalizeUnit(String(comp.unit || ""), L);
        const base = {
          name: String(comp.name || "Unknown Item"),
          amount: Math.max(0, Number(comp.amount) || 0),
          unit: allowedUnits.includes(baseUnit) ? baseUnit : L.pieceCanonical,
        };
        // Only pass through recommendedMeasurement if unit is piece-like
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
          const rmUnitRaw = String(
            comp.recommendedMeasurement.unit || ""
          ).toLowerCase();
          if (rmAmount > 0 && exactUnits.includes(rmUnitRaw)) {
            base.recommendedMeasurement = {
              amount: rmAmount,
              unit: rmUnitRaw,
            };
          }
        }
        // For g/ml units enforce recommendedMeasurement = null
        if (!isPieceLike) {
          base.recommendedMeasurement = null;
        }
        // Per-component macros
        base.calories = Math.max(0, Math.round(Number(comp.calories) || 0));
        base.protein = Math.max(0, Math.round(Number(comp.protein) || 0));
        base.carbs = Math.max(0, Math.round(Number(comp.carbs) || 0));
        base.fat = Math.max(0, Math.round(Number(comp.fat) || 0));
        return base;
      })
      .filter((c) => c.name && c.name !== "Unknown Item");
    // Compute totals from components in CODE (not by the LLM)
    const totals = sanitizedComponents.reduce(
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
    // Final result payload with localized default title
    const result = {
      generatedTitle: nutrition.generatedTitle || L.defaultGeneratedTitle,
      foodComponents: sanitizedComponents,
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
    // In case of any error, fall back to a localized "invalid image" response
    console.warn("Error in image-based estimation V2:", error);
    // Attempt to detect locale again from body if readable; otherwise default EN
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
      // ignore
    }
    const INVALID_IMAGE_RESPONSE = {
      generatedTitle: L.invalidImageTitle,
      foodComponents: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    return new Response(JSON.stringify(INVALID_IMAGE_RESPONSE), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
