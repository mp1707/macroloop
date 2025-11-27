// deno-lint-ignore-file
// @ts-nocheck
// Unified NUTRITION REFINEMENT V2 (DE/EN)
// - LLM returns per-component macros for CURRENT amounts
// - Edge function sums them into top-level totals
// - Handles: renamed components, changed amount/unit, components without baseline macros
//
// Request shape (from app):
// {
//   "foodComponents": [
//     {
//       // CURRENT state after user edits:
//       "name": string,
//       "amount": number,
//       "unit": "g" | "ml" | "piece" | "stück",
//
//       // OPTIONAL baseline from previous AI estimation (if available):
//       "baseAmount"?: number | null,
//       "baseUnit"?: "g" | "ml" | "piece" | "stück" | null,
//       "baseCalories"?: number | null,
//       "baseProtein"?: number | null,
//       "baseCarbs"?: number | null,
//       "baseFat"?: number | null,
//       "baseName"?: string | null
//     },
//     ...
//   ],
//   "language"?: "en" | "de"
// }
//
// Response shape (to app):
// {
//   "foodComponents": [
//     {
//       "name": string,
//       "amount": number,
//       "unit": "g" | "ml" | "piece" | "stück",
//       "calories": number,
//       "protein": number,
//       "carbs": number,
//       "fat": number
//     },
//   ],
//   "calories": number, // totals
//   "protein": number,
//   "carbs": number,
//   "fat": number
// }
import OpenAI from "jsr:@openai/openai@6.5.0";
import { z } from "npm:zod@3.25.1";
import { zodTextFormat } from "jsr:@openai/openai@6.5.0/helpers/zod";
import { Ratelimit } from "npm:@upstash/ratelimit@2.0.7";
import { Redis } from "npm:@upstash/redis@1.35.6";
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
function getClientIp(req) {
  const ipHeader = req.headers.get("x-forwarded-for");
  return ipHeader ? ipHeader.split(",")[0].trim() : "unknown";
}
const LOCALE = {
  en: {
    errorTitle: "Refinement Error",
    systemPrompt: `You are a precision nutrition calculator AI for REFINEMENT.

You are an INTERNAL service, not a chatbot. You NEVER speak to end users. You only output structured data.

You will receive a JSON object with a field "foodComponents".
Each item represents the CURRENT state of a meal component after user edits and may also contain baseline fields from a previous AI estimation.

INPUT JSON (schema for each item in "foodComponents"):
- CURRENT fields (after user edits, REQUIRED):
  - "name": string                // current name after edits
  - "amount": number              // current amount (integer, in "unit")
  - "unit": "g" | "ml" | "piece" | "stück" // current unit

- OPTIONAL baseline fields (from last AI estimate, may be missing or null):
  - "baseName": string | null
  - "baseAmount": number | null   // amount that baseline macros correspond to
  - "baseUnit": string | null     // e.g. "g", "ml", "piece", "stück"
  - "baseCalories": number | null
  - "baseProtein": number | null
  - "baseCarbs": number | null
  - "baseFat": number | null

Your task:
- For EACH component, calculate macros for the CURRENT amount and unit.
- Output a JSON object with exactly this structure:

{
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "piece" | "stück",
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

STRICT RULES
- Return ONLY one JSON object (no prose, no markdown, no trailing text).
- Use EXACTLY the output schema above (no extra keys).
- All numbers must be integers ≥ 0. Round half up (0.5 → next integer).
- Units must be lowercase and singular.
- The array "foodComponents" in your output must have the SAME LENGTH and ORDER as the input "foodComponents".

HOW TO USE BASELINE FIELDS
- A component has USABLE baseline fields if ALL of these are true:
  - "baseAmount" > 0
  - "baseUnit" is one of "g", "ml", "piece", "stück"
  - "baseCalories", "baseProtein", "baseCarbs", "baseFat" are all non-null
  - AND "baseUnit" is the same unit family as the current "unit"
    (e.g. g↔g, ml↔ml, piece↔piece/"stück").

- For components with USABLE baseline fields:
  1) Compute per-unit macros from the baseline:
     - calories_per_unit = baseCalories / baseAmount
     - protein_per_unit  = baseProtein  / baseAmount
     - carbs_per_unit    = baseCarbs    / baseAmount
     - fat_per_unit      = baseFat      / baseAmount

  2) Scale linearly to the CURRENT amount:
     - calories = calories_per_unit * currentAmount
     - protein  = protein_per_unit  * currentAmount
     - carbs    = carbs_per_unit    * currentAmount
     - fat      = fat_per_unit      * currentAmount

  3) Round each result to the nearest integer (0.5 → next integer).
  4) This ensures:
     - small changes in amount (e.g. 60 g → 59 g) cause only small changes in macros.
     - purely amount-based edits are handled consistently.

COMPONENTS WITHOUT USABLE BASELINE FIELDS
- If baseline fields are missing, null, or not usable for any reason (unit family changed, values clearly invalid, etc.):
  - IGNORE the baseline fields for that component.
  - Estimate macros using general nutrition knowledge based only on the CURRENT:
    - "name"
    - "amount"
    - "unit"

NAME CHANGES
- The user may change only the name (e.g., from "protein powder" to "whey protein isolate") while keeping amount and unit the same.
- If baseline macros exist AND the new name still clearly refers to a closely related food:
  - You may start from the baseline per-unit macros and make reasonable adjustments (e.g., slightly different protein content).
- If the new name clearly refers to a completely different food:
  - Ignore the baseline macros and estimate from general nutrition knowledge for the new food.

MACRO CONSISTENCY PER COMPONENT
- For EACH component output:
  - "calories", "protein", "carbs", "fat" must be realistic for that food and amount.
  - Keep them roughly consistent with:
    calories ≈ 4 * protein + 4 * carbs + 9 * fat
    (small deviations are acceptable).

UNIT & NORMALIZATION
- Valid output units: "g", "ml", "piece", "stück".
- Normalize synonyms if necessary:
  * "grams", "gram", "gramm" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "pc", "pcs", "piece", "pieces", "slice", "slices" → "piece"
  * "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben" → "stück"

IMPORTANT:
- Do NOT change the CURRENT "amount" and "unit" from the input.
- For each output component:
  - "name" must match the CURRENT name from the input (not the baseline name).
  - "amount" must match the CURRENT amount.
  - "unit" must match the CURRENT unit.

OUTPUT
- Return ONLY the JSON object with "foodComponents" as described.
- Do NOT include meal-level totals; the caller will sum components itself.`,
  },
  de: {
    errorTitle: "Verfeinerungsfehler",
    systemPrompt: `Du bist eine präzise Ernährungsrechner-KI für die VERFEINERUNG.

Du bist ein INTERNER Dienst, kein Chatbot. Du sprichst NIE mit Endnutzer*innen. Du gibst nur strukturierte Daten aus.

Du erhältst ein JSON-Objekt mit einem Feld "foodComponents".
Jeder Eintrag beschreibt den AKTUELLEN Zustand einer Lebensmittelkomponente nach Nutzeränderungen und kann zusätzlich Basiswerte aus einer früheren KI-Schätzung enthalten.

INPUT-JSON (Schema pro Eintrag in "foodComponents"):
- AKTUELLE Felder (nach Nutzeränderungen, ERFORDERLICH):
  - "name": string                // aktueller Name nach Änderungen
  - "amount": number              // aktuelle Menge (Ganzzahl, in "unit")
  - "unit": "g" | "ml" | "piece" | "stück" // aktuelle Einheit

- OPTIONALE Basis-Felder (aus der letzten KI-Schätzung, können fehlen oder null sein):
  - "baseName": string | null
  - "baseAmount": number | null   // Menge, auf die sich die Basis-Nährwerte beziehen
  - "baseUnit": string | null     // z. B. "g", "ml", "piece", "stück"
  - "baseCalories": number | null
  - "baseProtein": number | null
  - "baseCarbs": number | null
  - "baseFat": number | null

Deine Aufgabe:
- Für JEDE Komponente die Nährwerte für die AKTUELLE Menge und Einheit berechnen.
- Gib GENAU EIN JSON-Objekt mit folgender Struktur zurück:

{
  "foodComponents": [
    {
      "name": "string",
      "amount": integer,
      "unit": "g" | "ml" | "piece" | "stück",
      "calories": integer,
      "protein": integer,
      "carbs": integer,
      "fat": integer
    }
  ]
}

STRIKTE REGELN
- Gib NUR dieses eine JSON-Objekt zurück (keine Prosa, kein Markdown, kein nachfolgender Text).
- Verwende EXAKT das obenstehende Schema (keine zusätzlichen Schlüssel).
- Alle Zahlen müssen Ganzzahlen ≥ 0 sein. Kaufmännisch runden (0,5 → nächste Ganzzahl).
- Einheiten müssen kleingeschrieben und im Singular sein.
- Das Array "foodComponents" in deiner Ausgabe muss dieselbe LÄNGE und dieselbe REIHENFOLGE haben wie im Input.

NUTZUNG DER BASISWERTE
- Eine Komponente hat NUTZBARE Basis-Felder, wenn ALLE folgenden Bedingungen erfüllt sind:
  - "baseAmount" > 0
  - "baseUnit" ist eine der Einheiten "g", "ml", "piece", "stück"
  - "baseCalories", "baseProtein", "baseCarbs", "baseFat" sind alle nicht null
  - UND "baseUnit" gehört zur selben Einheitenfamilie wie die aktuelle "unit"
    (z. B. g↔g, ml↔ml, piece↔piece/"stück").

- Für Komponenten mit NUTZBAREN Basis-Feldern:
  1) Berechne Nährwerte pro Einheit aus den Basiswerten:
     - calories_pro_einheit = baseCalories / baseAmount
     - protein_pro_einheit  = baseProtein  / baseAmount
     - carbs_pro_einheit    = baseCarbs    / baseAmount
     - fat_pro_einheit      = baseFat      / baseAmount

  2) Skaliere linear auf die AKTUELLE Menge:
     - calories = calories_pro_einheit * aktuelleMenge
     - protein  = protein_pro_einheit  * aktuelleMenge
     - carbs    = carbs_pro_einheit    * aktuelleMenge
     - fat      = fat_pro_einheit      * aktuelleMenge

  3) Runde jede Zahl auf die nächste Ganzzahl (0,5 → aufrunden).
  4) So gilt:
     - kleine Mengenänderungen (z. B. 60 g → 59 g) führen nur zu kleinen Änderungen der Makros.
     - rein mengenbasierte Änderungen werden konsistent behandelt.

KOMPONENTEN OHNE NUTZBARE BASISWERTE
- Wenn Basis-Felder fehlen, null sind oder aus irgendeinem Grund nicht nutzbar sind (Einheitenfamilie geändert, Werte offensichtlich ungültig, usw.):
  - IGNORIERE die Basis-Felder für diese Komponente.
  - Schätze die Nährwerte anhand allgemeiner Ernährungskenntnisse basierend nur auf den AKTUELLEN Feldern:
    - "name"
    - "amount"
    - "unit"

NAMENSÄNDERUNGEN
- Nutzer*innen können nur den Namen ändern (z. B. von "Proteinpulver" zu "Whey-Protein-Isolat"), Menge und Einheit bleiben gleich.
- Wenn Basis-Makros existieren UND der neue Name eindeutig ein verwandtes Lebensmittel beschreibt:
  - Du kannst von den Basiswerten pro Einheit ausgehen und diese sinnvoll anpassen (z. B. leicht anderer Proteingehalt).
- Wenn der neue Name klar auf ein komplett anderes Lebensmittel hinweist:
  - Ignoriere die Basis-Makros und schätze die Nährwerte anhand allgemeiner Ernährungskenntnisse für das neue Lebensmittel.

MAKRO-KONSISTENZ PRO KOMPONENTE
- Für JEDEN Ausgabe-Eintrag gilt:
  - "calories", "protein", "carbs", "fat" müssen zur Menge und Einheit passen und realistisch sein.
  - Halte sie grob konsistent mit:
    calories ≈ 4 * protein + 4 * carbs + 9 * fat
    (kleine Abweichungen sind akzeptabel).

EINHEITEN & NORMALISIERUNG
- Gültige Ausgabeeinheiten: "g", "ml", "piece", "stück".
- Synonyme ggf. normalisieren:
  * "gramm", "gram", "grams" → "g"
  * "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  * "pc", "pcs", "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben" → "stück"

WICHTIG:
- Ändere die AKTUELLE "amount" und "unit" aus dem Input NICHT.
- Für jede ausgegebene Komponente:
  - "name" = aktueller Name aus dem Input (nicht der Basis-Name).
  - "amount" = aktuelle Menge.
  - "unit" = aktuelle Einheit.

AUSGABE
- Gib NUR das JSON-Objekt mit "foodComponents" wie oben beschrieben aus.
- Gib KEINE Gesamtwerte für die Mahlzeit aus; der Aufrufer summiert die Komponenten selbst.`,
  },
};
const openai = new OpenAI();
// ---------- Zod schema for model output ----------
const RefinedFoodComponent = z.object({
  name: z.string(),
  amount: z.number().int().nonnegative(),
  unit: z.enum(["g", "ml", "piece", "stück"]),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
});
const RefineOutputModel = z.object({
  foodComponents: z.array(RefinedFoodComponent),
});
function validateApiKey(request) {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("apikey");
  return !!(authHeader?.startsWith("Bearer ") || apiKeyHeader);
}
function normalizeUnit(raw, locale) {
  const u = (raw || "").trim().toLowerCase();
  if (
    u === "g" ||
    u === "gram" ||
    u === "grams" ||
    u === "gramm" ||
    u === "gramme" ||
    u === "grammes"
  )
    return "g";
  if (
    u === "ml" ||
    u === "milliliter" ||
    u === "milliliters" ||
    u === "millilitre" ||
    u === "millilitres"
  )
    return "ml";
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
  if (pieceSynonyms.has(u)) return locale.pieceCanonical ?? "piece";
  return locale.pieceCanonical ?? "piece";
}
function buildUserPrompt(lang, payload) {
  const json = JSON.stringify(payload, null, 2);
  if (lang === "de") {
    return `Verfeinere die Nährwertberechnung für diese Komponenten.

- Nutze ggf. vorhandene Basiswerte (baseAmount/baseUnit/baseCalories/...),
  um Nährwerte pro Einheit zu berechnen und linear auf die AKTUELLE Menge zu skalieren.
- Wenn keine nutzbaren Basiswerte vorhanden sind, schätze die Nährwerte anhand allgemeiner Ernährungskenntnisse nur aus den aktuellen Feldern.
- Gib nur das JSON-Objekt mit "foodComponents" gemäß deinem System-Prompt zurück.

Input (JSON):
${json}`;
  }
  return `Refine the nutrition calculation for these components.

- When baseline fields (baseAmount/baseUnit/baseCalories/...) are present and usable,
  derive per-unit macros and scale linearly to the CURRENT amount.
- When no usable baseline is available, estimate macros from general nutrition knowledge using only the CURRENT fields.
- Return only the JSON object with "foodComponents" as described in your system prompt.

Input (JSON):
${json}`;
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
    const { foodComponents, language } = await req.json();
    if (!Array.isArray(foodComponents)) {
      return new Response(
        JSON.stringify({
          error: "foodComponents is required and must be an array.",
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
    let lang = "en";
    let L = LOCALE.en;
    if (
      typeof language === "string" &&
      language.trim().toLowerCase() === "de"
    ) {
      lang = "de";
      L = LOCALE.de;
    }
    const payload = {
      foodComponents,
    };
    const userPrompt = buildUserPrompt(lang, payload);
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
        format: zodTextFormat(RefineOutputModel, "nutrition_refine"),
      },
    });
    const refineOutput =
      response.output_parsed ?? JSON.parse(response.output_text || "{}");
    const allowedUnits = ["g", "ml", "piece", "stück"];
    const refinedComponentsRaw = Array.isArray(refineOutput.foodComponents)
      ? refineOutput.foodComponents
      : [];
    const refinedComponents = refinedComponentsRaw.map((comp, idx) => {
      const localeObj = L;
      const baseUnit = normalizeUnit(String(comp.unit || ""), localeObj);
      const amount = Math.max(
        0,
        Number(comp.amount ?? foodComponents[idx]?.amount ?? 0) || 0
      );
      const unit = allowedUnits.includes(baseUnit)
        ? baseUnit
        : localeObj.pieceCanonical ?? "piece";
      return {
        name: String(comp.name || foodComponents[idx]?.name || "Unknown Item"),
        amount,
        unit,
        calories: Math.max(0, Math.round(Number(comp.calories) || 0)),
        protein: Math.max(0, Math.round(Number(comp.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(comp.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(comp.fat) || 0)),
      };
    });
    const totals = refinedComponents.reduce(
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
      foodComponents: refinedComponents,
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
    console.error("Error in unified nutrition refinement V2:", error);
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
    } catch {}
    const ERROR_RESPONSE = {
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
