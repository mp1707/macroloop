// deno-lint-ignore-file
// @ts-nocheck
// Unified image-based nutrition estimation (DE/EN) using OpenAI Responses + Zod Structured Outputs
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
    systemPrompt: `You are a meticulous nutrition expert for FOOD IMAGE analysis. Given one image (+ optional user text), return exactly ONE JSON object that matches the Zod schema "NutritionEstimation". No prose, no markdown.

GENERAL RULES
- Follow the schema exactly (no extra keys). Integers only; round half up.
- Units: "g", "ml", "piece" (lowercase, singular). Normalize synonyms: "pcs" → "piece".
- Totals (calories, protein, carbs, fat) must be coherent: kcal ≈ 4*protein + 4*carbs + 9*fat.
- Always estimate exactly what is visible in the image. If a whole bagel is visible in the image, you should estimate a whole bagel. If a whole bagel is visible in the image, but the user has added information about the consumed quantity via text, such as "ate half" or "half bagel," then you should return "Half Bagel" as the title of the meal and estimate the nutritional values for a half bagel.
- If the image is NOT food: empty foodComponents and all totals 0 with a clear title "🚫 not food".

SPECIFIC RULES FOR FOODCOMPONENTS
- The name of a foodComponent must exclusively consist of the ingredient and NOT the manner in which the ingredient is served. No details that are irrelevant to the nutritional values. Good example: "smoked pork loin", Bad example: "smoked pork loin (slices)".
- No ambiguous entries with multiple options; decide on one ingredient. Reduce the name of the foodComponent to the minimum necessary for estimating the nutritional values. Good example: "Yogurt sauce", Bad example: "Cream/Yogurt sauce (white, in separate bowl)".
- Prefer specific names: "grilled chicken breast", "cooked white rice", etc.
- Do not invent hidden ingredients (oil, butter, etc.) unless clearly visible.

NULLABLE FIELDS (must always be present but may be null)
- For any component:
  - If unit === "piece", set "recommendedMeasurement" to an exact measurable alternative (e.g., { "amount": 180, "unit": "g" }).
  - Otherwise set "recommendedMeasurement": null.
- "macrosPerReferencePortion": include ONLY if an exact nutrition label with numeric macros and a clear basis is visible; otherwise null.
  - When present, "referencePortionAmount" must be just the numeric amount + unit (e.g., "40 g", "100 ml").

Estimation Guide
- foodComponents: Identify 1–10 visible key elements. Estimate quantities based on plate size, common cutlery sizes, visible labels in the image, etc.
- generatedTitle: A suitable emoji + 1–3 concise words (no punctuation).
- Keep output concise and realistic.

OUTPUT
- Return only the JSON object, no trailing text.`,
  },
  de: {
    invalidImageTitle: "Ungültiges Bild",
    defaultGeneratedTitle: "Lebensmittelbild-Analyse",
    pieceCanonical: "stück",
    systemPrompt: `Du bist eine akribische Ernährungsexpertin für die ANALYSE VON ESSENSBILDERN. Erhalte ein Bild (+ optionalen Nutzertext) und gib exakt EIN JSON-Objekt zurück, das dem Zod-Schema "NutritionEstimation" entspricht. Keine Prosa, kein Markdown.

ALLGEMEINE REGELN
- Schema strikt einhalten (keine zusätzlichen Schlüssel). Nur ganze Zahlen; kaufmännisch runden (0,5 aufrunden).
- Einheiten: "g", "ml", "stück" (klein, Singular). Synonyme normalisieren: "pcs" → "stück", "stk" → "stück", "st." → "stück".
- Summen (calories, protein, carbs, fat) müssen konsistent sein: kcal ≈ 4*protein + 4*carbs + 9*fat.
- Schätze immer genau das was auf dem Bild sichtbar ist. Wenn auf dem Bild ein ganzer Bagel sichtbar ist, sollst du einen ganzen Bagel schätzen. Wenn auf dem Bild zwar ein ganzer Bagel sichtbar ist, der User aber infos zur verzehrten Menge via Text hinzugefügt hat "Hälfte gegessen" oder "halber Bagel", dann sollst du als titel der Mahlzeit auch "Halber Bagel" zurückgeben und die Nährwerte für einen halben Bagel schätzen.
- Falls das Bild KEIN Essen zeigt: foodComponents leer und alle Summen 0 mit klarem Titel "🚫 kein Essen".

SPEZIFISCHE REGELN FÜR FOODCOMPONENTS
- Der Name einer foodComponent umfasst ausschließlich die Zutat und NICHT die Art wie die Zutat serviert wird. Keine Details, die nichts mit den Nährwerten zu tun haben. Beispiel gut "geräucherte Schweinelende", Beispiel schlecht: "geräucherte Schweinelende (Scheiben)".
- Keine unklaren Einträge mit mehreren Möglichkeiten, entscheide dich für eine Zutat. Reduziere den namen der foodComponent auf das Minimum, das für die Schätzung der Nährwerte relevant ist. Beispiel gut: "Joghurtsauce", Beispiel schlecht: "Sahne-/Joghurtsauce (weiß, in extra Schale)". 
- Bevorzuge spezifische Namen: "gegrillte Hähnchenbrust", "gekochter weißer Reis", etc.
- Keine versteckten Zutaten (Öl, Butter, etc.) erfinden, es sei denn eindeutig sichtbar.

DEUTSCHLAND-PRIORITÄT
- Priorisiere Zutaten, Produkte und Gerichte, die in Deutschland üblich/verfügbar sind, und referenziere nach Möglichkeit Nährwertangaben/Portionen, wie sie in Deutschland/EU gängig sind. Vermeide US-spezifische Produkte, die hier typischerweise nicht erhältlich sind.

NULLBARE FELDER (müssen immer vorhanden sein, dürfen aber null sein)
- Für jede Komponente:
  - Wenn unit === "stück", setze "recommendedMeasurement" auf eine exakt messbare Alternative (z. B. { "amount": 180, "unit": "g" }).
  - Andernfalls "recommendedMeasurement": null.
- "macrosPerReferencePortion": NUR aufnehmen, wenn ein exaktes Nährwertetikett mit numerischen Makros und klarer Bezugsgröße eindeutig sichtbar ist; sonst null.
  - Wenn vorhanden, muss "referencePortionAmount" nur die Zahl + Einheit enthalten (z. B. "40 g", "100 ml").

SCHÄTZLEITFADEN
- foodComponents: 1–10 sichtbare Schlüsselelemente identifizieren. Mengen anhand Tellergröße, gängiger Besteckgrößen, sichtbarer Etiketten im Bild etc. abschätzen.
- generatedTitle: ein passendes Emoji + 1–3 knappe Wörter (keine Interpunktion).
- Ausgaben knapp und realistisch halten.

AUSGABE
- Gib ausschließlich das JSON-Objekt zurück, ohne nachfolgenden Text.`,
  },
};
// OpenAI client
const openai = new OpenAI();
// ---------- Zod schema (use a superset for units; we canonicalize later) ----------
const RecommendedMeasurement = z.object({
  amount: z.number().int().nonnegative(),
  unit: z.enum(["g", "ml"]),
});
const FoodComponent = z.object({
  name: z.string(),
  amount: z.number().int().nonnegative(),
  unit: z.enum(["g", "ml", "piece", "stück"]),
  // REQUIRED by schema but nullable in model output; we keep it optional in the final sanitized payload
  recommendedMeasurement: RecommendedMeasurement.nullable(),
});
const MacrosPerReferencePortion = z.object({
  referencePortionAmount: z.string(),
  caloriesForReferencePortion: z.number().int().nonnegative(),
  proteinForReferencePortion: z.number().int().nonnegative(),
  carbsForReferencePortion: z.number().int().nonnegative(),
  fatForReferencePortion: z.number().int().nonnegative(),
});
const NutritionEstimation = z.object({
  generatedTitle: z.string(),
  foodComponents: z.array(FoodComponent),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
  // REQUIRED but nullable in model output; we include it only if present after sanitization
  macrosPerReferencePortion: MacrosPerReferencePortion.nullable(),
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
  if (u === "g" || u === "gram" || u === "grams") return "g";
  // milliliters
  if (u === "ml" || u === "milliliter" || u === "milliliters") return "ml";
  // handle piece synonyms (both languages)
  const pieceSynonyms = new Set([
    "piece",
    "pieces",
    "pc",
    "pcs",
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
- Wenn du die Einheit 'stück' verwendest, füge ZUSÄTZLICH 'recommendedMeasurement' mit exakter Menge+Einheit hinzu (z. B. g oder ml).
- Wenn ein klares, exaktes Nährwertetikett sichtbar ist, füge 'macrosPerReferencePortion' mit einer exakten 'referencePortionAmount' wie '40 g' oder '100 ml' und ganzzahligen Makros für diese Portion hinzu.

Benutzerkontext:
Titel: ${t}
Beschreibung: ${d}`;
  }
  // EN default
  return `Analyze this food image and estimate its nutritional content.
- If you use 'piece' as a unit, ALSO include recommendedMeasurement with an exact amount+unit (e.g., g or ml).
- If a clear, exact nutrition label is visible, include macrosPerReferencePortion with an exact referencePortionAmount like '40 g' or '100 ml' and integer macros for that portion.

User context:
Title: ${t}
Description: ${d}`;
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
    // Build locale-specific user prompt (single, readable template)
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
        format: zodTextFormat(NutritionEstimation, "nutrition_estimate"),
      },
      top_p: 1,
    });
    // Parse structured output
    const nutrition =
      response.output_parsed ?? JSON.parse(response.output_text || "{}");
    // Allowed units (accept superset; canonicalize per locale)
    const allowedUnits = ["g", "ml", "piece", "stück"];
    const exactUnits = ["g", "ml"];
    // Sanitize components into our final payload (canonicalize units per locale)
    const sanitizedComponents = Array.isArray(nutrition.foodComponents)
      ? nutrition.foodComponents
          .map((comp) => {
            const baseUnit = normalizeUnit(String(comp.unit || ""), L);
            const base = {
              name: String(comp.name || "Unknown Item"),
              amount: Math.max(0, Number(comp.amount) || 0),
              unit: allowedUnits.includes(baseUnit)
                ? baseUnit
                : L.pieceCanonical,
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
            return base;
          })
          .filter((c) => c.name && c.name !== "Unknown Item")
      : [];
    // Optional macrosPerReferencePortion passthrough (include only if valid)
    let sanitizedReferenceMacros;
    if (
      nutrition.macrosPerReferencePortion &&
      typeof nutrition.macrosPerReferencePortion === "object"
    ) {
      const m = nutrition.macrosPerReferencePortion;
      const amountStr = String(m.referencePortionAmount || "").trim();
      const cal = Math.max(
        0,
        Math.round(Number(m.caloriesForReferencePortion) || 0)
      );
      const pro = Math.max(
        0,
        Math.round(Number(m.proteinForReferencePortion) || 0)
      );
      const car = Math.max(
        0,
        Math.round(Number(m.carbsForReferencePortion) || 0)
      );
      const fat = Math.max(
        0,
        Math.round(Number(m.fatForReferencePortion) || 0)
      );
      if (amountStr) {
        sanitizedReferenceMacros = {
          referencePortionAmount: amountStr,
          caloriesForReferencePortion: cal,
          proteinForReferencePortion: pro,
          carbsForReferencePortion: car,
          fatForReferencePortion: fat,
        };
      }
    }
    // Final result payload with localized default title
    const result = {
      generatedTitle: nutrition.generatedTitle || L.defaultGeneratedTitle,
      foodComponents: sanitizedComponents,
      calories: Math.max(0, Math.round(nutrition.calories || 0)),
      protein: Math.max(0, Math.round(nutrition.protein || 0)),
      carbs: Math.max(0, Math.round(nutrition.carbs || 0)),
      fat: Math.max(0, Math.round(nutrition.fat || 0)),
    };
    if (sanitizedReferenceMacros) {
      result.macrosPerReferencePortion = sanitizedReferenceMacros;
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // In case of any error, fall back to a localized "invalid image" response
    console.warn("Error validating AI response, using fallback:", error);
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
