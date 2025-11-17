import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { showErrorToast } from "./toast";
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

export interface RefineRequest {
  foodComponents: string;
  macrosPerReferencePortion?: MacrosPerReferencePortion;
  language: Language;
  signal?: AbortSignal;
}

export interface ImageEstimateRequest {
  imagePath: string;
  title?: string;
  description?: string;
  language: Language;
}

export interface ImageRefineRequest {
  imagePath: string;
  title?: string;
  description?: string;
  foodComponents: FoodComponent[];
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
export interface RefinedFoodEstimateResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const estimateTextBased = async (
  request: TextEstimateRequest
): Promise<FoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Text estimation request:", request);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/textEstimation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(request),
  });

  if (__DEV__) {
    console.log("Text estimation response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI estimation HTTP error:", response.status, errorText);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Text estimation response data:", data);
  }

  if (data.error) {
    console.error("AI estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  return data as FoodEstimateResponse;
};

export const refineEstimation = async (
  request: RefineRequest
): Promise<RefinedFoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Refine estimation request:", request);
  }

  const { signal, ...requestData } = request;
  const response = await fetch(`${supabaseUrl}/functions/v1/refineEstimation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(requestData),
    signal,
  });

  if (__DEV__) {
    console.log("Refine estimation response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI estimation HTTP error:", response.status, errorText);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Refine estimation response data:", data);
  }

  if (data.error) {
    console.error("AI estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  if (__DEV__) {
    console.log("refine response data:", data);
  }

  return data as RefinedFoodEstimateResponse;
};

export const estimateNutritionImageBased = async (
  request: ImageEstimateRequest
): Promise<FoodEstimateResponse> => {
  if (__DEV__) {
    console.log("Image estimation request:", request);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/imageEstimation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(request),
  });

  if (__DEV__) {
    console.log("Image estimation response status:", response.status);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Image estimation HTTP error:", response.status, errorText);
    if (response.status === 429) {
      showErrorToast("Rate limit exceeded", "Please try again later.");
    }
    throw new Error("AI_ESTIMATION_FAILED");
  }

  const data = await response.json();
  if (__DEV__) {
    console.log("Image estimation response data:", data);
  }

  if (data.error) {
    console.error("Image-based estimation error:", data.error);
    throw new Error("AI_ESTIMATION_FAILED");
  }

  return data as FoodEstimateResponse;
};
