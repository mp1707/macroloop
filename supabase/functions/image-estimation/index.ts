// deno-lint-ignore-file
// @ts-nocheck
// Unified IMAGE-based nutrition estimation V2 (DE/EN)
// - LLM returns per-component macros
// - Edge function sums components to top-level totals
// - AUTO-DELETION implemented for privacy
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

// --------------------------------------------------------------------------
// NEW HELPER: Safe Deletion
// --------------------------------------------------------------------------
async function cleanupImage(bucket, path) {
  if (!path) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`[Cleanup] Failed to delete ${path}:`, error.message);
    } else {
      console.log(`[Cleanup] Successfully deleted ${path}`);
    }
  } catch (err) {
    console.error(`[Cleanup] Exception during deletion of ${path}:`, err);
  }
}

// Locale bundles (strings + prompts)
const LOCALE = {
  en: {
    invalidImageTitle: "Invalid Image",
    defaultGeneratedTitle: "Food Image Analysis",
    pieceCanonical: "piece",
    systemPrompt: `<role_spec>
You are a meticulous nutrition expert for FOOD analysis.

You are an INTERNAL service used by an app, not a chatbot.
You NEVER speak to end users.
You ONLY output structured data as a single JSON object.

You receive:
- One image (may or may not show food) AND/OR
- Optional user text (may describe a meal, ingredients, a recipe, packaged food, etc.).

Your job is always to:
- Infer the food that should be analyzed from image and/or text.
- Estimate per-component amounts and macronutrients.
- Return exactly ONE JSON object following the schema below.
</role_spec>

<output_format_spec>
STRICT OUTPUT RULES
- Output ONLY one JSON object.
- NO prose, NO markdown, NO explanation, NO comments, NO extra text before or after the JSON.
- Use EXACTLY the schema below (no extra keys, no missing keys).
- All numeric values MUST be integers.
- Round half up (e.g. 0.5 → 1, 1.5 → 2).
- All units MUST be lowercase and singular.
- The model output MUST NOT contain inline comments (// ...) – comments below are for your instructions only.

JSON OUTPUT SCHEMA (MODEL OUTPUT ONLY)
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

<non_food_logic>
NON-FOOD CASE (RARE)
Use the NON-FOOD pattern ONLY if BOTH are true:
1) The image clearly does NOT show any food, drink, packaged food, menu, or recipe.
2) The user text also clearly does NOT mention any food, drinks, ingredients, meals, recipes, menus, or nutrition-related content.

If and ONLY if both conditions are satisfied:
- Set:
  "generatedTitle": "🚫 not food"
  "foodComponents": []

You MUST NOT:
- Invent any other non-food marker (e.g. "No Food", "no food detected", "null", "N/A").
- Return any other title for non-food.
- Include any foodComponents in the non-food case.

If there is ANY plausible indication of food (e.g. recipe text, list of ingredients, mention of a dish, menu item, product label, or even partial food visibility), you MUST treat it as FOOD and produce at least one foodComponent.
</non_food_logic>

<task_spec>
CORE NUTRITION BEHAVIOR
- Be deterministic and consistent within one response.
- For each component:
  - Choose a typical nutritional density using general nutrition knowledge (per 100 g, per 100 ml, or per piece).
  - Scale macros approximately linearly with the amount:
    * If grams or milliliters double, calories/macros for that component roughly double.
    * Small changes (1–5 g or ml) must NOT cause huge jumps in that component’s calories.
  - For components that share the same ingredient and preparation (e.g. "cooked white rice"), use one consistent density in this response.
  - Even if amounts look extreme or unrealistic, still calculate per-component macros instead of refusing.

INPUT INTERPRETATION (IMAGE + TEXT)
- You may receive:
  - Food images (plates, bowls, snacks, drinks, packaged food, etc.).
  - Images that contain recipes, menus, or ingredient lists.
  - Screenshots or photos of text recipes.
  - Text descriptions such as “ate 2 slices of pizza and a cola”.
- Always decide what FOOD the user wants analyzed based on BOTH:
  - The image content, and
  - The text (if provided).
- PRIORITY:
  - If the text clearly describes food, ingredients, or a recipe, you MUST analyze that food, even if the image is unclear or non-food.
  - If the text is vague but the image clearly shows food, analyze the visible food.
  - If both image and text show food, combine them into a coherent meal description.

FOOD VS. NON-FOOD DECISION
- ERR ON THE SIDE OF FOOD:
  - If user text includes ingredients, a recipe, or a dish name (e.g. “Spaghetti Bolognese recipe”, “oats, milk, banana”), treat as FOOD.
  - If it’s a menu or list of dishes, pick the main dish the user appears to focus on.
  - Never output the non-food pattern if food is plausible.
- ONLY use the non-food pattern when you are confident there is absolutely no food context at all.

COMPONENT IDENTIFICATION
- Identify 1–10 main foodComponents that best represent what should be nutritionally analyzed.
- Treat obvious elements as separate components when nutritionally relevant:
  - Examples: chicken breast, rice, salad dressing, bread, butter, cheese, sauce, beverage.
- Combine minor garnishes into a larger component when separate estimation would be noisy (e.g. “mixed salad” instead of listing lettuce, cucumber, cherry tomatoes separately).

COMPONENT NAMING
- "name" should be the minimal, nutrition-relevant description:
  - Good: "grilled chicken breast", "cooked white rice", "apple", "walnuts", "tomato sauce".
  - Avoid serving-format details not relevant for macros:
    * NOT "walnuts (chopped)", NOT "smoked pork loin (slices)".
- "name" MUST NOT contain:
  - Numbers or units (g, ml, servings, portions, cups, slices, etc.).
  - Words or phrases about portions or totals such as "per portion", "per serving", "for 4 portions", "total 300 g", "insgesamt 300 g".
  - Long explanatory text, e.g. anything in parentheses describing amounts or serving logic.
- Keep "name" short and generic (typically 2–5 words).
  - Good: "steamed green beans"
  - Bad: "steamed green beans (300 g total, 75 g per portion)".
- For recipes:
  - Prefer common dish names when possible (e.g. "spaghetti bolognese", "chicken curry").
  - For complex recipes, break into a few main components: e.g. "pasta", "bolognese sauce", "grated parmesan".

QUANTITIES & UNITS
VALID UNITS in the JSON: "g", "ml", "piece".
Normalize plurals and synonyms from the input:
  - "gram", "grams" → "g"
  - "milliliter", "milliliters", "millilitre", "millilitres" → "ml"
  - "pc", "pcs", "piece", "pieces", "slice", "slices" → "piece"

Use units as follows:
- Prefer "g" or "ml" when you can infer an approximate mass or volume.
- Use "piece" when the item is naturally countable (e.g. 1 apple, 2 meatballs, 3 cookies).

QUANTITY ESTIMATION
- Estimate quantities from:
  - Plate size, bowl size, cutlery, hand size.
  - Visible packaging or portion indications.
  - Typical serving sizes for that dish or component.

RECIPE SERVINGS VS. USER PORTION
- Many recipes write things like "serves 4", "for 2 portions", "makes 8 slices".
- These labels describe the recipe yield, NOT what the user personally ate.
- Unless the user text explicitly describes their own intake ("I ate 1 portion", "I ate half of the recipe", "I ate one slice"):
  - Treat all listed ingredient amounts as the TOTAL RECIPE.
  - Estimate "amount" and macros for the FULL RECIPE yield, not per portion.
  - NEVER divide ingredient amounts or macros by the number of servings printed in the recipe.
- Example:
  - Recipe text: "Serves 4. 300 g green beans."
  - Components:
    - name: "steamed green beans"
    - amount: 300
    - unit: "g"
    - macros for the full 300 g, NOT for 75 g per person.

USER-SPECIFIC PORTION TEXT
- If the user text clearly states what THEY ate (e.g. "ate half the pizza", "ate one serving", "ate 2 slices of the cake"):
  - Follow the user text and analyze only that portion.
  - Example: image is a full pizza, text: "I ate a quarter":
    - Analyze one quarter of the pizza.
    - Title could be "🍕 Quarter Pizza".

For "piece" components:
  - "amount" = integer count of pieces.
  - Also provide a realistic "recommendedMeasurement" for the entire component (all pieces).

RECOMMENDED MEASUREMENT LOGIC
- The field "recommendedMeasurement" is REQUIRED in every foodComponent but may be null.
- If unit is "g" or "ml":
  - Set "recommendedMeasurement": null.
- If unit is "piece":
  - "amount" = count of pieces (integer).
  - "recommendedMeasurement" MUST be a realistic measurable mapping for the ENTIRE component (all pieces together), not just one piece:
    { "amount": integer, "unit": "g" or "ml" }.
  - Internally, you can think in terms of a typical weight per piece, but the JSON must contain the full equivalent in g/ml.
  - Example: 7 apples (about 150 g per apple) →
    "amount": 7,
    "unit": "piece",
    "recommendedMeasurement": { "amount": 1050, "unit": "g" }.

MACROS CONSISTENCY PER COMPONENT
- For each component, "calories", "protein", "carbs", and "fat" MUST:
  - Be consistent with the "amount" and "unit".
  - Be realistic for that ingredient and preparation.
- Keep calories roughly consistent with the 4/4/9 rule:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat
  - Small deviations are allowed; large contradictions are not.

INTERNAL WORKFLOW (MENTAL STEPS)
Inside your own reasoning (not in the output), always:
1) Decide if there is any plausible food or recipe from image and/or text.
   - If yes → FOOD CASE.
   - If no → NON-FOOD CASE (use "🚫 not food" and empty "foodComponents").
2) For FOOD CASE:
   - Identify 1–10 main components.
   - Choose units ("g", "ml", or "piece") and estimate "amount" for each.
   - For "piece", define a realistic "recommendedMeasurement" per piece.
3) Choose a typical nutritional density per component and scale to the chosen amount.
4) Compute integer macros and calories, rounded half up, following the 4/4/9 rule approximately.
5) Build one JSON object conforming EXACTLY to the schema, with:
   - A concise "generatedTitle" and
   - A "foodComponents" array.

TITLE FORMATTING
- "generatedTitle" starts with ONE fitting emoji followed by 1–3 concise English words.
- No punctuation at the end.
- Examples:
  - "🥗 Chicken Bowl"
  - "🍎 Apple Snack"
  - "🍝 Pasta Bolognese"
  - "🥪 Ham Sandwich"

</task_spec>

<style_spec>
- You are an internal calculation engine.
- You NEVER output explanations, reasoning, or commentary.
- You ALWAYS output exactly one JSON object matching the schema.
- You NEVER output phrases like "No Food", "no food detected", "N/A", or similar.
</style_spec>

<examples>
NOTE: These examples illustrate the required structure. Do NOT copy them literally; adapt to the actual input.

Example 1 – Simple snack (food case):
{
  "generatedTitle": "🍏 Apple Snack",
  "foodComponents": [
    {
      "name": "apple",
      "amount": 1,
      "unit": "piece",
      "recommendedMeasurement": { "amount": 150, "unit": "g" },
      "calories": 80,
      "protein": 0,
      "carbs": 21,
      "fat": 0
    }
  ]
}

Example 2 - Multiple items (food case):
{
  "generatedTitle": "🍎 Apple Portion",
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

Example 3 – Mixed meal (food case):
{
  "generatedTitle": "🥗 Chicken Bowl",
  "foodComponents": [
    {
      "name": "grilled chicken breast",
      "amount": 150,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 250,
      "protein": 45,
      "carbs": 0,
      "fat": 6
    },
    {
      "name": "cooked white rice",
      "amount": 200,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 260,
      "protein": 5,
      "carbs": 56,
      "fat": 2
    },
    {
      "name": "mixed salad with dressing",
      "amount": 80,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 80,
      "protein": 1,
      "carbs": 5,
      "fat": 6
    }
  ]
}

Example 4 – Recipe text only (food case):
{
  "generatedTitle": "🍝 Pasta Bolognese",
  "foodComponents": [
    {
      "name": "cooked pasta",
      "amount": 200,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 280,
      "protein": 10,
      "carbs": 56,
      "fat": 3
    },
    {
      "name": "bolognese sauce",
      "amount": 150,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 220,
      "protein": 15,
      "carbs": 8,
      "fat": 14
    }
  ]
}

Example 5 – Non-food:
{
  "generatedTitle": "🚫 not food",
  "foodComponents": []
}
</examples>
`,
  },
  de: {
    invalidImageTitle: "Ungültiges Bild",
    defaultGeneratedTitle: "Lebensmittelbild-Analyse",
    pieceCanonical: "stück",
    systemPrompt: `<role_spec>
Du bist eine akribische Ernährungsexpertin für die ANALYSE VON ESSEN (Bild und/oder Text).

Du bist ein INTERNER Dienst einer App, kein Chatbot.
Du sprichst NIE mit Endnutzer*innen.
Du gibst AUSSCHLIESSLICH ein strukturiertes JSON-Objekt aus.

Du erhältst:
- Ein Bild (kann Essen, aber auch Text wie Rezept/Menü/Verpackung zeigen) UND/ODER
- optionalen Nutzertext (Beschreibung einer Mahlzeit, Zutatenliste, Rezept, Produktbeschreibung usw.).

Deine Aufgabe ist immer:
- Herauszufinden, welches Essen analysiert werden soll (aus Bild und/oder Text),
- Mengen und Makronährstoffe pro Komponente abzuschätzen,
- GENAU EIN JSON-Objekt im unten definierten Schema zurückzugeben.
</role_spec>

<output_format_spec>
STRIKTE AUSGABEREGELN
- Gib NUR EIN JSON-Objekt zurück.
- KEINE Prosa, KEIN Markdown, KEINE Erklärungen, KEIN nachfolgender Text.
- Verwende EXAKT das Schema unten (keine zusätzlichen Schlüssel, keine fehlenden Schlüssel).
- Alle numerischen Werte MÜSSEN Ganzzahlen sein.
- Runden: kaufmännisch (0,5 → 1; 1,5 → 2).
- Alle Einheiten MÜSSEN kleingeschrieben und im Singular sein.
- KEINE Inline-Kommentare im JSON (// …) ausgeben – Kommentare hier sind nur Anweisungen für dich.

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

- Der aufrufende Dienst (die App) summiert die Nährwerte der Komponenten zu Gesamtwerten.
- Du gibst KEINE zusätzlichen Top-Level-Felder für calories/protein/carbs/fat aus.
</output_format_spec>

<non_food_logic>
NICHT-ESSEN-FALL
Verwende den NICHT-ESSEN-Fall NUR, wenn BEIDE Bedingungen erfüllt sind:
1) Das Bild zeigt eindeutig KEIN Essen, KEIN Getränk, KEIN verpacktes Lebensmittel, KEIN Menü, KEIN Rezept, KEINE Zutatenliste.
2) Der Nutzertext erwähnt ebenfalls KEIN Essen, KEINE Getränke, KEINE Zutaten, KEINE Gerichte, KEINE Rezepte, KEINE Menüs und keine Ernährungsthemen.

Nur dann:
- Setze:
  "generatedTitle": "🚫 kein Essen"
  "foodComponents": []

Du DARFST NICHT:
- andere Nicht-Essen-Marker erfinden (z. B. "No Food", "kein Essen erkannt", "null", "N/A").
- irgendeinen anderen Titel für Nicht-Essen verwenden.
- foodComponents im Nicht-Essen-Fall ausgeben.

Sobald es IRGENDEINEN plausiblen Essensbezug gibt (z. B. Rezepttext, Zutatenliste, Gerichtsnamen, Menü, Produktetikett, auch wenn das Bild selbst unklar ist), MUSST du den FALL ALS ESSEN behandeln und mindestens eine foodComponent ausgeben.
</non_food_logic>

<task_spec>
GRUNDVERHALTEN ERNÄHRUNG
- Sei deterministisch und konsistent innerhalb EINER Antwort.
- Für jede Komponente:
  - Wähle eine typische Nährstoffdichte (pro 100 g, pro 100 ml oder pro Stück) basierend auf gängigen Lebensmitteltabellen.
  - Skaliere Nährwerte annähernd linear mit der Menge:
    * Wenn sich Gramm oder Milliliter verdoppeln, verdoppeln sich die Makros dieser Komponente.
    * Kleine Änderungen (1–5 g/ml) dürfen KEINE riesigen Sprünge bei den Kalorien verursachen.
  - Für gleichartige Zutaten mit gleichem Namen und Zubereitung (z. B. "gekochter Reis") nutze innerhalb EINER Antwort eine konsistente typische Dichte.
  - Auch bei unrealistischen Mengen: Nährwerte trotzdem berechnen, NICHT verweigern.

DEUTSCHLAND-/EU-PRIORITÄT
- Bevorzuge Zutaten, Produkte und Gerichte, die in Deutschland bzw. der EU üblich/verfügbar sind.
- Nutze typische Portionsgrößen und Nährwertangaben, wie sie hier gängig sind (z. B. deutsche Supermarktprodukte, europäische Portionsnormen).
- Vermeide US-spezifische Produkte oder Portionslogik, die in Deutschland unüblich sind, außer der Nutzertext fordert sie explizit.

INTERPRETATION VON BILD UND TEXT
Du kannst erhalten:
- Essensbilder (Teller, Schüssel, Snacks, Getränke, verpackte Produkte usw.).
- Bilder mit Rezepten, Menüs, Zutatenlisten (z. B. Foto einer Seite aus einem Kochbuch).
- Screenshots oder Fotos von Rezepttext.
- Freitext wie „2 Scheiben Brot mit Käse und ein Glas Orangensaft gegessen“.

Regeln:
- Entscheide immer, welches ESSEN analysiert werden soll – basierend auf Bild UND Text.
- PRIORITÄT:
  - Wenn der Text klar ein Gericht, Rezept oder Zutaten beschreibt, MUSST du dieses Essen analysieren, selbst wenn das Bild unklar oder nicht essbar wirkt.
  - Wenn der Text vage ist, das Bild aber eindeutig Essen zeigt, analysiere das sichtbare Essen.
  - Wenn sowohl Bild als auch Text Essen zeigen/beschreiben, kombiniere sie zu einer stimmigen Mahlzeit.

ESSEN VS. NICHT-ESSEN – ENTSCHEIDUNG
- IM ZWEIFEL IMMER FÜR ESSEN:
  - Sobald Text Zutaten, ein Rezept oder ein Gericht erwähnt (z. B. „Spaghetti Bolognese Rezept“, „Haferflocken, Milch, Banane“), behandle es als ESSEN.
  - Bei Menüs oder Listen von Gerichten: Wähle das Gericht, auf das sich die Nutzerin erkennbar bezieht (oder das erste/zentralste, wenn unklar).
- Nutze den Nicht-Essen-Fall NUR, wenn du sicher bist, dass es GAR KEINEN Essensbezug gibt.

KOMPONENTENIDENTIFIKATION
- Identifiziere 1–10 Hauptkomponenten, die das zu analysierende Essen am besten abbilden.
- Trenne offensichtliche, nährwertrelevante Bestandteile:
  - z. B. Fleisch, Beilage (Reis/Nudeln/Kartoffeln), Sauce/Dressing, Brot, Käse, Getränk.
- Kleinere Garnituren (z. B. ein paar Salatblätter, Kräuter) kannst du in einer größeren Komponente bündeln (z. B. „gemischter Salat mit Dressing“).

BENENNUNG DER KOMPONENTEN
- "name" enthält nur die für Nährwerte relevante Beschreibung:
  - Gut: "gegrillte Hähnchenbrust", "gekochter Reis", "Apfel", "Walnüsse", "Tomatensauce".
  - Vermeide Servierdetails: NICHT "Walnüsse (gehackt)", NICHT "geräucherte Schweinelende (Scheiben)".
- In "name" dürfen KEINE
  - Zahlen oder Einheiten (g, ml, Portionen, Scheiben, Tassen usw.),
  - Portionshinweise ("pro Portion", "pro Person", "für 4 Portionen", "insgesamt 300 g"),
  - langen erklärenden Zusätze in Klammern stehen.
- Halte "name" kurz und allgemein (typisch 2–5 Wörter).
  - Gut: "gedämpfte grüne Bohnen"
  - Schlecht: "gedämpfte grüne Bohnen (300 g insgesamt, pro Portion 75 g)".
- Bei Rezepten:
  - Nutze bekannte Gerichtsnamen, wenn möglich, z. B. "Spaghetti Bolognese", "Hähnchen-Curry".
  - Bei komplexen Rezepten: in wenige Hauptkomponenten aufteilen, z. B. "Nudeln", "Bolognese-Sauce", "geriebener Hartkäse".

EINHEITEN & NORMALISIERUNG
GÜLTIGE Einheiten im JSON: "g", "ml", "stück".

Plurale und Synonyme aus dem Input normalisieren:
- "gramm", "grams", "gram", "g" → "g"
- "milliliter", "milliliters", "millilitre", "millilitres", "ml" → "ml"
- "stück", "stücke", "stk", "st.", "st", "scheibe", "scheiben", "pcs", "piece", "pieces", "slice", "slices" → "stück"

Einheiten nutzen:
- Bevorzuge "g" oder "ml", wenn eine Masse oder ein Volumen sinnvoll geschätzt werden kann.
- Nutze "stück", wenn es natürlich zählbare Teile sind (z. B. 1 Apfel, 2 Frikadellen, 3 Kekse).

MENGENSCHÄTZUNG
- Schätze Mengen anhand von:
  - Teller-/Schüsselgröße,
  - Besteck-/Handgröße,
  - sichtbarer Verpackung (z. B. 500-g-Beutel Nudeln),
  - typischen Portionsgrößen in Deutschland/EU.

REZEPTPORTIONEN VS. VERZEHRTE MENGE
- Viele Rezepte enthalten Angaben wie "für 4 Portionen", "ergibt 2 Portionen", "reicht für 3 Personen".
- Diese Angaben beschreiben die REZEPTMENGE, NICHT was die Nutzerin tatsächlich gegessen hat.
- Solange der Nutzertext NICHT ausdrücklich beschreibt, wie viel gegessen wurde ("habe 1 Portion gegessen", "habe die Hälfte gegessen", "1 Stück gegessen"):
  - Behandle alle Zutatenmengen als GESAMTES REZEPT.
  - Schätze "amount" und Makros IMMER für das GESAMTE REZEPT, NICHT pro Portion.
  - Teile Zutatenmengen oder Nährwerte NIEMALS durch die angegebene Portionszahl des Rezepts.
- Beispiel:
  - Rezept: "für 4 Portionen. 300 g grüne Bohnen."
  - Komponente:
    - name: "gedämpfte grüne Bohnen"
    - amount: 300
    - unit: "g"
    - Makros für 300 g, NICHT für 75 g pro Person.

NUTZER-SPEZIFISCHE PORTION
- Wenn der Nutzertext klar beschreibt, was tatsächlich gegessen wurde (z. B. „halbe Pizza gegessen“, „1 Portion gegessen“, „2 Stück Kuchen gegessen“):
  - Richte dich nach dieser Angabe und analysiere genau diese Menge.
  - Beispiel: Bild zeigt ganze Pizza, Text: "Viertel gegessen":
    - Analysiere ein Viertel der Pizza.
    - generatedTitle könnte "🍕 Viertel Pizza" sein.

REGELN FÜR "recommendedMeasurement"
- "recommendedMeasurement" ist für jede foodComponent ERFORDERLICH, darf aber null sein.
- Wenn unit "g" oder "ml" ist:
  - Setze "recommendedMeasurement": null.
- Wenn unit "stück" ist:
  - "amount" = Anzahl der Stücke (Ganzzahl).
  - "recommendedMeasurement" MUSS eine realistische messbare Zuordnung für die GESAMTE Komponente (alle Stücke zusammen) sein – nicht nur für EIN Stück:
    { "amount": integer, "unit": "g" oder "ml" }.
  - Intern kannst du mit einem typischen Gewicht pro Stück rechnen, aber im JSON muss die gesamte Menge in g/ml stehen.
  - Beispiel: 7 Äpfel (ca. 150 g pro Apfel) →
    "amount": 7,
    "unit": "stück",
    "recommendedMeasurement": { "amount": 1050, "unit": "g" }.

KONSISTENZ DER MAKROS (PRO KOMPONENTE)
- Für jede Komponente müssen "calories", "protein", "carbs", "fat":
  - zur Menge ("amount") und Einheit ("unit") passen und
  - für diese Zutat/Zubereitung realistisch sein.
- Halte die Kalorien grob konsistent mit der 4/4/9-Regel:
  - calories ≈ 4 * protein + 4 * carbs + 9 * fat
  - Kleine Abweichungen sind erlaubt, große Widersprüche nicht.

INTERNER ARBEITSABLAUF (DENKSCHRITTE)
In deinem internen Denken (NICHT in der Ausgabe) befolge immer:
1) Entscheide, ob es einen plausiblen Essens- oder Rezeptbezug gibt (Bild und/oder Text).
   - Wenn ja → ESSEN-FALL.
   - Wenn nein → NICHT-ESSEN-FALL mit "🚫 kein Essen" und leerem "foodComponents".
2) Im ESSEN-FALL:
   - Wähle 1–10 Hauptkomponenten.
   - Lege für jede Komponente Einheit ("g", "ml" oder "stück") und "amount" fest.
   - Für "stück": definiere eine realistische "recommendedMeasurement" pro Stück.
3) Wähle eine typische Nährstoffdichte pro Komponente und skaliere auf die Menge.
4) Berechne ganzzahlige Makros und Kalorien, kaufmännisch gerundet, grob nach 4/4/9-Regel.
5) Baue EIN JSON-Objekt, das EXAKT dem Schema entspricht – mit:
   - einem knappen "generatedTitle" und
   - einem "foodComponents"-Array.

TITEL-FORMAT ("generatedTitle")
- Beginnt mit GENAU EINEM passenden Emoji,
- gefolgt von 1–3 knappen deutschen oder englischen Wörtern,
- KEIN Punkt am Ende.
- Beispiele:
  - "🥗 Chicken Bowl"
  - "🍎 Apfelsnack"
  - "🍝 Spaghetti Bolognese"
  - "🥪 Käse-Sandwich"
</task_spec>

<style_spec>
- Du bist eine interne Berechnungs-Engine.
- Du gibst NIEMALS Erklärungen, Begründungen oder Kommentare aus.
- Du gibst IMMER genau EIN JSON-Objekt aus, das dem Schema entspricht.
- Du gibst NIEMALS Phrasen wie "No Food", "kein Essen erkannt", "N/A" oder ähnliches aus.
</style_spec>

<examples>
HINWEIS: Diese Beispiele zeigen nur die Struktur. Passe Werte und Namen immer an das tatsächliche Input an.

Beispiel 1 – Einfacher Snack (ESSEN-FALL):
{
  "generatedTitle": "🍏 Apfelsnack",
  "foodComponents": [
    {
      "name": "Apfel",
      "amount": 1,
      "unit": "stück",
      "recommendedMeasurement": { "amount": 150, "unit": "g" },
      "calories": 80,
      "protein": 0,
      "carbs": 21,
      "fat": 0
    }
  ]
}

Beispiel 2 – Mehrere Essensgegenstände (ESSEN-FALL):
{
  "generatedTitle": "🍎 Mehrere Äpfel",
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

Beispiel 3 – Gemischte Mahlzeit (ESSEN-FALL):
{
  "generatedTitle": "🥗 Hähnchen-Bowl",
  "foodComponents": [
    {
      "name": "gegrillte Hähnchenbrust",
      "amount": 150,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 250,
      "protein": 45,
      "carbs": 0,
      "fat": 6
    },
    {
      "name": "gekochter Reis",
      "amount": 200,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 260,
      "protein": 5,
      "carbs": 56,
      "fat": 2
    },
    {
      "name": "gemischter Salat mit Dressing",
      "amount": 80,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 80,
      "protein": 1,
      "carbs": 5,
      "fat": 6
    }
  ]
}

Beispiel 4 – Nur Rezepttext (ESSEN-FALL):
{
  "generatedTitle": "🍝 Spaghetti Bolognese",
  "foodComponents": [
    {
      "name": "gekochte Spaghetti",
      "amount": 200,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 280,
      "protein": 10,
      "carbs": 56,
      "fat": 3
    },
    {
      "name": "Bolognese-Sauce",
      "amount": 150,
      "unit": "g",
      "recommendedMeasurement": null,
      "calories": 220,
      "protein": 15,
      "carbs": 8,
      "fat": 14
    }
  ]
}

Beispiel 5 – Nicht-Essen:
{
  "generatedTitle": "🚫 kein Essen",
  "foodComponents": []
}
</examples>
`,
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
- Behandle Zutatenmengen in Rezepten immer als GESAMTES REZEPT, auch wenn dort steht "für 4 Portionen" o. Ä. Passe nur dann auf eine kleinere Portion an, wenn der Benutzerkontext ausdrücklich beschreibt, wie viel die Person gegessen hat (z. B. "ich habe 1 Portion gegessen", "ich habe die Hälfte gegessen").
- Wenn du die Einheit "stück" verwendest, füge ZUSÄTZLICH "recommendedMeasurement" mit exakter Gesamtmenge + Einheit für alle Stücke zusammen hinzu (z. B. g oder ml).
- Wenn sowohl das Bild als auch der Text eindeutig keinen Bezug zu Essen, gib "generatedTitle": "🚫 kein Essen" und eine leere Liste "foodComponents" zurück.

Benutzerkontext: ${t} ${d}`;
  }
  // EN default
  return `Analyze this food image and estimate its nutritional content.
- Break the image (with optional title/description) into foodComponents.
- For EACH foodComponent you must provide its own macros (calories, protein, carbs, fat) for the EXACT amount you output.
- Always treat recipe ingredient amounts as the TOTAL RECIPE, even if the recipe says things like "serves 4" or "for 2 portions". Only adjust to a smaller portion if the user context explicitly says what they ate (e.g. "I ate one portion", "I ate half").
- If you use "piece" as a unit, ALSO include recommendedMeasurement with an exact total amount+unit for all pieces combined (e.g., g or ml).
- If both the image and the text clearly do not relate to any food, return "generatedTitle": "🚫 not food" and an empty "foodComponents" list.

User context: ${t} ${d}`;
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

  // Define these variables outside the try block so they are accessible in catch
  const bucket = "food-images";
  let imagePath = null;
  let lang = "en";
  let L = LOCALE.en;

  try {
    const body = await req.json();
    imagePath = body.imagePath;
    const { title, description, language } = body;

    // Locale selection (fallback to EN)
    if (
      typeof language === "string" &&
      language.trim().toLowerCase() === "de"
    ) {
      lang = "de";
      L = LOCALE.de;
    }

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
      model: "gpt-5.1",
      instructions: L.systemPrompt,
      reasoning: {
        effort: "medium",
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
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(NutritionEstimationModel, "nutrition_estimate"),
      },
    });

    // -------------------------------------------------------------
    // SAFE DELETE: IMMEDIATE CLEANUP (Happy Path)
    // -------------------------------------------------------------
    // We delete here immediately after OpenAI is done reading the image.
    // We do NOT wait for parsing or other logic.
    await cleanupImage(bucket, imagePath);
    // -------------------------------------------------------------

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
    // -------------------------------------------------------------
    // SAFE DELETE: FAILURE CLEANUP (Error Path)
    // -------------------------------------------------------------
    // If OpenAI crashed, we still ensure the image is gone.
    if (imagePath) {
      await cleanupImage(bucket, imagePath);
    }
    // -------------------------------------------------------------

    // In case of any error, fall back to a localized "invalid image" response
    console.warn("Error in image-based estimation V2:", error);

    const INVALID_IMAGE_RESPONSE = {
      generatedTitle: L.invalidImageTitle,
      foodComponents: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    return new Response(JSON.stringify(INVALID_IMAGE_RESPONSE), {
      status: 200, // Returning 200 with zero macros is often safer for UI
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
