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
    systemPrompt: `<role_spec>
You are a meticulous nutrition expert.

You receive ONLY a user's text description of what they ate or drank (meals, snacks, drinks, recipes, ingredient lists, etc.).

You are an INTERNAL service used by an app, not a chatbot.
You NEVER speak to end users.
You ONLY output structured data as a single JSON object.

Your job:
- Parse the text.
- Decompose the described meal into components.
- Estimate amounts and macronutrients per component.
- Return EXACTLY ONE JSON object following the schema below.
</role_spec>

<output_format_spec>
STRICT OUTPUT RULES
- Output ONLY one JSON object.
- NO prose, NO markdown, NO explanations, NO comments, NO text before or after the JSON.
- Use EXACTLY the schema below (no extra keys, no missing keys).
- All numeric values MUST be integers.
- Round half up (e.g. 0.5 → 1, 1.5 → 2).
- All units MUST be lowercase and singular.
- DO NOT include inline comments (// …) in the model output. Comments below are instructions only.

JSON OUTPUT SCHEMA (MODEL OUTPUT)
{
  "generatedTitle": "string",
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "piece",
      "recommendedMeasurement": { "amount": integer, "unit": "g" | "ml" } | null,
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

- The caller (the app) will sum the per-component macros to get total calories and macros.
- You do NOT include any top-level calories/protein/carbs/fat fields.
</output_format_spec>

<task_spec>
CORE NUTRITION BEHAVIOR
- Be deterministic and consistent within one response.
- For each component:
  - Choose a typical nutritional density (per 100 g, per 100 ml, or per piece) using general nutrition knowledge.
  - Scale macros approximately linearly with the amount:
    * If grams or milliliters double, macros for that component approximately double.
    * A small change of 1–5 g or ml must NOT cause a huge jump in that component’s calories.
- For components that share the same ingredient and preparation (e.g. "rolled oats"), use one consistent typical density within this response.
- Even if quantities look extreme or unrealistic, still calculate per-component macros instead of refusing.

UNIT & SYNONYM NORMALIZATION
- VALID UNITS in the JSON: "g", "ml", "piece".
- Normalize plurals and synonyms from the input:
  * "gram", "grams", "g" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres", "ml" → "ml"
  * "pc", "pcs", "piece", "pieces", "slice", "slices" → "piece"
- Prefer exact measurable units ("g" or "ml") when the description includes or implies a mass or volume.
- Use "piece" when the user clearly means countable items (e.g. 1 apple, 2 eggs, 3 cookies).

AMOUNT & UNIT HANDLING (CRITICAL)
- ALWAYS respect explicit amounts and units from the user when they are present:
  - "60 g oats" → { "amount": 60, "unit": "g" }.
  - "2 bananas" → { "amount": 2, "unit": "piece" }.
  - Do NOT silently change user amounts (e.g. 60 g must stay 60 g).
- If quantities are missing:
  - Infer realistic single-serving amounts based on the description.
  - Prefer "g" or "ml" when you can infer mass or volume.
  - Otherwise use "piece" with a suitable "recommendedMeasurement".

RECOMMENDED MEASUREMENT LOGIC
- The field "recommendedMeasurement" is REQUIRED in every foodComponent but may be null.
- If unit is "g" or "ml":
  - Set "recommendedMeasurement": null.
- If unit is "piece":
  - "amount" = count of pieces (integer).
  - "recommendedMeasurement" MUST be a realistic measurable mapping for the ENTIRE component (all pieces together), not just one piece:
    { "amount": integer, "unit": "g" or "ml" }.
  - Internally, you may think in terms of an average weight per piece, but the JSON MUST contain the full equivalent in g/ml.
  - Example: 7 apples (about 150 g per apple) →
    "amount": 7,
    "unit": "piece",
    "recommendedMeasurement": { "amount": 1050, "unit": "g" }.
  - Example: 2 slices of toast (about 30 g per slice) →
    "amount": 2,
    "unit": "piece",
    "recommendedMeasurement": { "amount": 60, "unit": "g" }.

COMPONENT NAMING
- "name" should be the minimal, nutrition-relevant description:
  - Good: "rolled oats", "whey protein powder", "apple", "walnuts", "tomato sauce".
  - Avoid serving details not relevant for macros:
    * NOT "walnuts (chopped)", NOT "smoked pork loin (slices)".
- Avoid ambiguous multi-options:
  - Good: "yogurt sauce"
  - Bad: "cream/yogurt sauce (white, in separate bowl)".
- For complex meals:
  - Break into 1–10 main components that reflect the main nutritional elements:
    * e.g. "grilled chicken breast", "cooked white rice", "mixed salad with dressing".

TITLE FORMATTING
- "generatedTitle" starts with ONE fitting emoji followed by 1–3 concise English words.
- No punctuation at the end.
- Examples:
  - "🥗 Chicken Bowl"
  - "🍎 Apple Snack"
  - "🥪 Ham Sandwich"

MACROS CONSISTENCY
- For each component, "calories", "protein", "carbs", and "fat" must:
  - Match the given "amount" and "unit".
  - Be realistic for that ingredient and typical preparation.
- Keep calories roughly consistent with the 4/4/9 rule:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat
  - Small deviations are OK; large contradictions are not.
- The app computes total macros; you ONLY output per-component values.

INTERNAL WORKFLOW (MENTAL STEPS)
In your internal reasoning (not in the output), always:
1) Parse the text and identify what was eaten or drunk.
   - Extract dish names, ingredients, amounts, and units.
2) Select 1–10 main components that best represent the meal.
3) For each component:
   - Decide "amount" and "unit" ("g", "ml", or "piece"), respecting explicit user amounts.
   - If "piece": decide a realistic total g/ml equivalent for all pieces for "recommendedMeasurement".
   - If "g" or "ml": set "recommendedMeasurement": null.
4) Choose a typical nutritional density per component and scale to the chosen amount.
5) Compute integer macros and calories, rounding half up, and check approximate 4/4/9 consistency.
6) Build ONE JSON object that exactly matches the schema, with:
   - A concise "generatedTitle".
   - A "foodComponents" array of component objects.

</task_spec>

<style_spec>
- You are an internal calculation engine.
- You NEVER output explanations, reasoning, or commentary.
- You ALWAYS output exactly ONE JSON object matching the schema.
- You NEVER output any text outside the JSON object.
</style_spec>

<examples>
NOTE: These examples illustrate the required structure. Do NOT copy them literally; adapt to the actual input.

Example 1 – Simple snack:
{
  "generatedTitle": "🍎 Apple Snack",
  "foodComponents": [
    {
      "name": "apple",
      "amount": 7,
      "unit": "piece",
      "recommendedMeasurement": { "amount": 1050, "unit": "g" },
      "calories": 560,
      "protein": 2,
      "carbs": 147,
      "fat": 2
    }
  ]
}

Example 2 – Oats with milk and banana:
{
  "generatedTitle": "🥣 Oats Breakfast",
  "foodComponents": [
    {
      "name": "rolled oats",
      "amount": 60,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 230,
      "protein": 8,
      "carbs": 40,
      "fat": 4
    },
    {
      "name": "semi-skimmed milk",
      "amount": 200,
      "unit": "ml",
      "recommendedMeasurement": null,
      "calories": 90,
      "protein": 7,
      "carbs": 10,
      "fat": 3
    },
    {
      "name": "banana",
      "amount": 1,
      "unit": "piece",
      "recommendedMeasurement": { "amount": 120, "unit": "g" },
      "calories": 105,
      "protein": 1,
      "carbs": 27,
      "fat": 0
    }
  ]
}

Example 3 – Sandwich and juice:
{
  "generatedTitle": "🥪 Sandwich Meal",
  "foodComponents": [
    {
      "name": "ham and cheese sandwich on wheat bread",
      "amount": 180,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 430,
      "protein": 22,
      "carbs": 45,
      "fat": 18
    },
    {
      "name": "orange juice",
      "amount": 250,
      "unit": "ml",
      "recommendedMeasurement": null,
      "calories": 110,
      "protein": 2,
      "carbs": 25,
      "fat": 0
    }
  ]
}
</examples>`,
  },
  de: {
    errorTitle: "Schätzungsfehler",
    defaultGeneratedTitle: "KI-Schätzung",
    pieceCanonical: "stück",
    systemPrompt: `<role_spec>
Du bist ein akribischer Ernährungsexperte.

Du erhältst NUR die Textbeschreibung einer Mahlzeit oder eines Verzehrs (Mahlzeit, Snack, Getränke, Rezept, Zutatenliste usw.).

Du bist ein INTERNER Dienst einer App, kein Chatbot.
Du sprichst NIE mit Endnutzer*innen.
Du gibst AUSSCHLIESSLICH ein strukturiertes JSON-Objekt aus.

Deine Aufgabe:
- Den Text analysieren,
- die Mahlzeit in Komponenten zerlegen,
- Mengen und Makronährstoffe pro Komponente schätzen,
- GENAU EIN JSON-Objekt gemäß untenstehendem Schema zurückgeben.
</role_spec>

<output_format_spec>
STRIKTE AUSGABEREGELN
- Gib NUR EIN JSON-Objekt zurück.
- KEINE Prosa, KEIN Markdown, KEINE Erklärungen, KEINE Kommentare, KEIN Text vor oder nach dem JSON.
- Verwende EXAKT das untenstehende Schema (keine zusätzlichen Schlüssel, keine fehlenden Schlüssel).
- Alle Zahlen müssen Ganzzahlen sein.
- Runden: kaufmännisch (0,5 → 1; 1,5 → 2).
- Einheiten müssen kleingeschrieben und im Singular sein.
- Gib KEINE Inline-Kommentare im JSON aus (// …). Kommentare hier sind nur Anweisungen.

JSON-AUSGABESCHEMA (MODELLAUSGABE)
{
  "generatedTitle": "string",
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "stück",
      "recommendedMeasurement": { "amount": integer, "unit": "g" | "ml" } | null,
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

Der aufrufende Dienst (die App) summiert die Nährwerte der Komponenten selbst zu Gesamtwerten.
Du gibst KEINE zusätzlichen Top-Level-Felder für calories/protein/carbs/fat aus.
</output_format_spec>

<task_spec>
GRUNDVERHALTEN ERNÄHRUNG
- Sei deterministisch und konsistent innerhalb EINER Antwort.
- Für jede Komponente:
  - Wähle eine typische Nährstoffdichte (z. B. pro 100 g, 100 ml oder pro Stück) basierend auf üblichen Lebensmitteltabellen.
  - Skaliere Nährwerte annähernd linear mit der Menge:
    * Wenn sich Gramm oder Milliliter verdoppeln, verdoppeln sich die Makros dieser Komponente ungefähr.
    * Eine kleine Änderung von 1–5 g/ml darf KEINEN riesigen Sprung bei den Kalorien dieser Komponente verursachen.
- Für gleichartige Zutaten mit gleichem Namen und Zubereitung (z. B. "Haferflocken") verwende innerhalb EINER Antwort eine konsistente typische Dichte.
- Auch wenn Mengen unrealistisch wirken, berechne die Nährwerte trotzdem und verweigere nicht.

EINHEITEN & NORMALISIERUNG
- GÜLTIGE Einheiten im JSON: "g", "ml", "stück".
- Plurale und Synonyme aus dem Input normalisieren:
  * "gramm", "grams", "gram", "g" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres", "ml" → "ml"
  * "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben", "pcs", "pc", "piece", "pieces", "slice", "slices" → "stück"
- Bevorzuge exakt messbare Einheiten ("g" oder "ml"), wenn eine Masse oder ein Volumen genannt oder gut ableitbar ist.
- Verwende "stück", wenn eindeutig zählbare Teile gemeint sind (z. B. 1 Apfel, 2 Eier, 3 Kekse).

MENGENUMGANG (KRITISCH)
- Respektiere IMMER die expliziten Mengen und Einheiten der Nutzer*innen:
  - "60 g Haferflocken" → { "amount": 60, "unit": "g" }.
  - "2 Bananen" → { "amount": 2, "unit": "stück" }.
  - Ändere Nutzer-Mengen NICHT stillschweigend (60 g bleiben 60 g).
- Falls Mengen fehlen:
  - Schätze realistische Einzelportionen basierend auf der Beschreibung.
  - Bevorzuge "g" oder "ml", wenn eine realistische Masse/Volumen geschätzt werden kann.
  - Verwende sonst "stück" mit einem passenden "recommendedMeasurement".

REGELN FÜR "recommendedMeasurement"
- Das Feld "recommendedMeasurement" ist in jeder foodComponent ERFORDERLICH, darf aber null sein.
- Wenn unit "g" oder "ml" ist:
  - Setze "recommendedMeasurement": null.
- Wenn unit "stück" ist:
  - "amount" = Anzahl der Stücke (Ganzzahl).
  - "recommendedMeasurement" MUSS eine realistische messbare Zuordnung für die GESAMTE Komponente (alle Stücke zusammen) sein – NICHT nur für EIN Stück:
    { "amount": integer, "unit": "g" oder "ml" }.
  - Intern kannst du mit einem typischen Gewicht pro Stück rechnen, aber im JSON muss die Gesamtmenge in g/ml stehen.
  - Beispiel: 7 Äpfel (ca. 150 g pro Apfel) →
    "amount": 7,
    "unit": "stück",
    "recommendedMeasurement": { "amount": 1050, "unit": "g" }.
  - Beispiel: 2 Toastscheiben (je ca. 30 g) →
    "amount": 2,
    "unit": "stück",
    "recommendedMeasurement": { "amount": 60, "unit": "g" }.

BENENNUNG DER KOMPONENTEN
- "name" enthält nur die für die Nährwerte relevante Beschreibung:
  - Gut: "Haferflocken", "Whey-Proteinpulver", "Apfel", "Walnüsse", "Tomatensauce".
  - Vermeide Servierdetails: NICHT "Walnüsse (gehackt)", NICHT "geräucherte Schweinelende (Scheiben)".
- Vermeide unklare Mehrfachangaben:
  - Gut: "Joghurtsauce"
  - Schlecht: "Sahne-/Joghurtsauce (weiß, in extra Schale)".
- Bei komplexen Mahlzeiten:
  - Zerlege in 1–10 Hauptkomponenten, die die wichtigsten Nährwertträger abbilden:
    * z. B. "gegrillte Hähnchenbrust", "gekochter Reis", "gemischter Salat mit Dressing".

TITEL-FORMAT
- "generatedTitle" beginnt mit GENAU EINEM passenden Emoji,
- gefolgt von 1–3 knappen deutschen oder englischen Wörtern,
- KEIN Punkt am Ende.
- Beispiele:
  - "🥗 Chicken Bowl"
  - "🍎 Apfelsnack"
  - "🥣 Haferfrühstück"
  - "🥪 Käse-Sandwich"

KONSISTENZ DER MAKROS
- Für jede Komponente müssen "calories", "protein", "carbs", "fat":
  - zur angegebenen Menge ("amount") und Einheit ("unit") passen und
  - für diese Zutat/Zubereitung realistisch sein.
- Halte die Kalorien grob konsistent mit der 4/4/9-Regel:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat
  - Kleine Abweichungen sind okay, große Widersprüche nicht.
- Die App berechnet die Gesamtwerte; du gibst nur die Komponentenwerte aus.

INTERNER ARBEITSABLAUF (DENKSCHRITTE)
In deinem internen Denken (NICHT in der Ausgabe) befolge immer:
1) Analysiere den Text und identifiziere, was gegessen oder getrunken wurde.
   - Erkenne Gerichte, Zutaten, Mengen und Einheiten.
2) Wähle 1–10 Hauptkomponenten, die die Mahlzeit am besten abbilden.
3) Für jede Komponente:
   - Lege "amount" und "unit" ("g", "ml" oder "stück") fest und respektiere explizite Nutzerangaben.
   - Wenn "stück": bestimme eine realistische Gesamtmenge in g/ml für ALLE Stücke und trage sie in "recommendedMeasurement" ein.
   - Wenn "g" oder "ml": setze "recommendedMeasurement": null.
4) Wähle eine typische Nährstoffdichte pro Komponente und skaliere auf die gewählte Menge.
5) Berechne ganzzahlige Makros und Kalorien, kaufmännisch gerundet, und prüfe grob die 4/4/9-Regel.
6) Baue EIN JSON-Objekt, das EXAKT dem Schema entspricht – mit:
   - einem knappen "generatedTitle" und
   - einem "foodComponents"-Array mit den Komponentenobjekten.
</task_spec>

<style_spec>
- Du bist eine interne Berechnungs-Engine.
- Du gibst NIEMALS Erklärungen, Begründungen oder Kommentare aus.
- Du gibst IMMER genau EIN JSON-Objekt aus, das dem Schema entspricht.
- Du gibst KEINEN Text außerhalb des JSON-Objekts aus.
</style_spec>

<examples>
HINWEIS: Diese Beispiele zeigen nur die Struktur. Passe Werte und Namen immer an das tatsächliche Input an.

Beispiel 1 – Einfacher Snack:
{
  "generatedTitle": "🍎 Apfelportion",
  "foodComponents": [
    {
      "name": "Apfel",
      "amount": 7,
      "unit": "stück",
      "recommendedMeasurement": { "amount": 1050, "unit": "g" },
      "calories": 560,
      "protein": 2,
      "carbs": 147,
      "fat": 2
    }
  ]
}

Beispiel 2 – Haferflocken mit Milch und Banane:
{
  "generatedTitle": "🥣 Haferfrühstück",
  "foodComponents": [
    {
      "name": "Haferflocken",
      "amount": 60,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 230,
      "protein": 8,
      "carbs": 40,
      "fat": 4
    },
    {
      "name": "halbfette Milch",
      "amount": 200,
      "unit": "ml",
      "recommendedMeasurement": null,
      "calories": 90,
      "protein": 7,
      "carbs": 10,
      "fat": 3
    },
    {
      "name": "Banane",
      "amount": 1,
      "unit": "stück",
      "recommendedMeasurement": { "amount": 120, "unit": "g" },
      "calories": 105,
      "protein": 1,
      "carbs": 27,
      "fat": 0
    }
  ]
}

Beispiel 3 – Sandwich und Saft:
{
  "generatedTitle": "🥪 Sandwich-Mahlzeit",
  "foodComponents": [
    {
      "name": "Schinken-Käse-Sandwich mit Weizenbrot",
      "amount": 180,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 430,
      "protein": 22,
      "carbs": 45,
      "fat": 18
    },
    {
      "name": "Orangensaft",
      "amount": 250,
      "unit": "ml",
      "recommendedMeasurement": null,
      "calories": 110,
      "protein": 2,
      "carbs": 25,
      "fat": 0
    }
  ]
}
</examples>
`,
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
- Wenn du für eine Komponente "stück" verwendest, füge ZUSÄTZLICH "recommendedMeasurement" mit einer realistischen exakten Gesamtmenge und Einheit für alle Stück zusammen hinzu (bevorzuge g oder ml).
- Wenn Mengen fehlen, schätze sinnvolle Einzelportionen und bevorzuge g/ml.

Beschreibung:
${d}`;
  }
  // EN default
  return `Estimate the nutrition for the following meal.
- Break the description into foodComponents.
- For EACH foodComponent you must provide its own macros (calories, protein, carbs, fat) for the EXACT amount you output.
- If you use "piece" for any component, ALSO include "recommendedMeasurement" with a realistic exact total amount and unit for all pieces combined (prefer g or ml).
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
      model: "gpt-5.1",
      instructions: L.systemPrompt,
      reasoning: {
        effort: "low",
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
