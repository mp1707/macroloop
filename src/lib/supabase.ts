import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { FoodComponent } from "@/types/models";

type Language = string;

export type MacrosPerReferencePortion = {
  referencePortionAmount: string;
  caloriesForReferencePortion: number;
  proteinForReferencePortion: number;
  carbsForReferencePortion: number;
  fatForReferencePortion: number;
};

export interface TextEstimateRequest {
  description: string;
  language: Language;
}

// Legacy V1 refine request (string-based)
export interface RefineRequestV1 {
  foodComponents: string;
  macrosPerReferencePortion?: MacrosPerReferencePortion;
  language: Language;
  signal?: AbortSignal;
}

// V2 refine input with per-component baseline stats
export interface RefineFoodComponentInput {
  // CURRENT state after user edits (required)
  name: string;
  amount: number;
  unit: "g" | "ml" | "piece" | "stück";

  // OPTIONAL baseline from last AI estimate
  baseName?: string | null;
  baseAmount?: number | null;
  baseUnit?: "g" | "ml" | "piece" | "stück" | null;
  baseCalories?: number | null;
  baseProtein?: number | null;
  baseCarbs?: number | null;
  baseFat?: number | null;
}

// V2 refine request (typed array with baseline stats)
export interface RefineRequest {
  foodComponents: RefineFoodComponentInput[];
  language: Language;
  signal?: AbortSignal;
}

export interface ImageEstimateRequest {
  imagePath: string;
  title?: string;
  description?: string;
  language: Language;
}

export interface FoodEstimateResponse {
  generatedTitle: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodComponents: FoodComponent[];
  macrosPerReferencePortion?: MacrosPerReferencePortion;
}
// V2 refined response includes updated food components with their macros
export interface RefinedFoodEstimateResponse {
  foodComponents: FoodComponent[]; // Updated components with per-ingredient macros
  calories: number; // Totals (sum of foodComponents[*].calories)
  protein: number;
  carbs: number;
  fat: number;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Normalize unit values from API (handles German "stück" -> "piece")
const normalizeUnit = (unit: string): FoodComponent["unit"] => {
  if (unit === "stück") return "piece";
  return unit as FoodComponent["unit"];
};

// Normalize food components received from API to ensure consistent unit values
const normalizeFoodComponents = (
  components: FoodComponent[]
): FoodComponent[] => {
  return components.map((c) => ({
    ...c,
    unit: normalizeUnit(c.unit),
  }));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// V2 text estimation - returns per-component nutrition stats
export const estimateTextBased = async (
  request: TextEstimateRequest
): Promise<FoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Text estimation V2 request:", request);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/textEstimation2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(request),
  });

  if (__DEV__) {
    console.log("Text estimation V2 response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();

    // Check for rate limit (429 status)
    if (response.status === 429) {
      console.error("Rate limit exceeded:", response.status, errorText);
      throw new Error("AI_ESTIMATION_RATE_LIMIT");
    }

    // Generic error for other failures
    console.error("AI estimation HTTP error:", response.status, errorText);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Text estimation V2 response data:", data);
  }

  if (data.error) {
    console.error("AI estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  // Normalize units (e.g., "stück" -> "piece") for consistent app handling
  return {
    ...data,
    foodComponents: normalizeFoodComponents(data.foodComponents || []),
  } as FoodEstimateResponse;
};

// V2 refine estimation - uses per-component baseline stats for consistent refinements
export const refineEstimation = async (
  request: RefineRequest
): Promise<RefinedFoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Refine estimation V2 request:", request);
  }

  const { signal, ...requestData } = request;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/refineEstimation2`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(requestData),
      signal,
    }
  );

  if (__DEV__) {
    console.log("Refine estimation V2 response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();

    // Check for rate limit (429 status)
    if (response.status === 429) {
      console.error("Rate limit exceeded:", response.status, errorText);
      throw new Error("AI_ESTIMATION_RATE_LIMIT");
    }

    // Generic error for other failures
    console.error("AI estimation HTTP error:", response.status, errorText);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Refine estimation V2 response data:", data);
  }

  if (data.error) {
    console.error("AI estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  // Normalize units (e.g., "stück" -> "piece") for consistent app handling
  return {
    ...data,
    foodComponents: normalizeFoodComponents(data.foodComponents || []),
  } as RefinedFoodEstimateResponse;
};

// V2 image estimation - returns per-component nutrition stats
export const estimateNutritionImageBased = async (
  request: ImageEstimateRequest
): Promise<FoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Image estimation V2 request:", request);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/imageEstimation2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(request),
  });

  if (__DEV__) {
    console.log("Image estimation V2 response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();

    // Check for rate limit (429 status)
    if (response.status === 429) {
      console.error("Rate limit exceeded:", response.status, errorText);
      throw new Error("AI_ESTIMATION_RATE_LIMIT");
    }

    // Generic error for other failures
    console.error("Image estimation HTTP error:", response.status, errorText);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Image estimation V2 response data:", data);
  }

  if (data.error) {
    console.error("Image-based estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  // Normalize units (e.g., "stück" -> "piece") for consistent app handling
  return {
    ...data,
    foodComponents: normalizeFoodComponents(data.foodComponents || []),
  } as FoodEstimateResponse;
};
