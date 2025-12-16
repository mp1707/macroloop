import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ProteinGoalType, UserSettings } from "@/types/models";

export type OnboardingState = {
  // User demographic data
  age?: number;
  sex?: "male" | "female";
  height?: number; // cm
  weight?: number; // kg
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "veryactive";

  // Goal data
  calorieGoalType?: UserSettings["calorieGoalType"];
  calorieGoal?: number;
  proteinGoal?: number; // g
  proteinGoalType?: ProteinGoalType; // tracking protein calculation method
  fatPercentage?: number; // percentage of calories

  // Input method tracking
  inputMethod?: "calculate" | "manual";
  carbGoal?: number; // g (for manual input)
  fatGoal?: number; // g (for manual input)

  // Skip functionality
  userSkippedOnboarding: boolean;

  // Actions
  setAge: (age: number) => void;
  setSex: (sex: "male" | "female") => void;
  setHeight: (height: number) => void;
  setWeight: (weight: number) => void;
  setActivityLevel: (level: "sedentary" | "light" | "moderate" | "active" | "veryactive") => void;
  setCalorieGoalType: (type: UserSettings["calorieGoalType"]) => void;
  setCalorieGoal: (goal: number) => void;
  setProteinGoal: (goal: number) => void;
  setProteinGoalType: (type: ProteinGoalType) => void;
  setFatPercentage: (percentage: number) => void;
  setInputMethod: (method: "calculate" | "manual") => void;
  setCarbGoal: (goal: number) => void;
  setFatGoal: (goal: number) => void;
  setUserSkippedOnboarding: (skipped: boolean) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  immer((set) => ({
    // Initial state - all undefined
    age: undefined,
    sex: undefined,
    height: undefined,
    weight: undefined,
    activityLevel: undefined,
    calorieGoalType: undefined,
    calorieGoal: undefined,
    proteinGoal: undefined,
    proteinGoalType: undefined,
    fatPercentage: 20, // Default to 20%

    // Input method tracking
    inputMethod: undefined,
    carbGoal: undefined,
    fatGoal: undefined,

    // Skip functionality
    userSkippedOnboarding: false,

    // Actions
    setAge: (age) =>
      set((state) => {
        state.age = age;
      }),

    setSex: (sex) =>
      set((state) => {
        state.sex = sex;
      }),

    setHeight: (height) =>
      set((state) => {
        state.height = height;
      }),

    setWeight: (weight) =>
      set((state) => {
        state.weight = weight;
      }),

    setActivityLevel: (level) =>
      set((state) => {
        state.activityLevel = level;
      }),

    setCalorieGoalType: (type) =>
      set((state) => {
        state.calorieGoalType = type;
      }),

    setCalorieGoal: (goal) =>
      set((state) => {
        state.calorieGoal = goal;
      }),

    setProteinGoal: (goal) =>
      set((state) => {
        state.proteinGoal = goal;
      }),

    setProteinGoalType: (type) =>
      set((state) => {
        state.proteinGoalType = type;
      }),

    setFatPercentage: (percentage) =>
      set((state) => {
        state.fatPercentage = percentage;
      }),

    setInputMethod: (method) =>
      set((state) => {
        state.inputMethod = method;
      }),

    setCarbGoal: (goal) =>
      set((state) => {
        state.carbGoal = goal;
      }),

    setFatGoal: (goal) =>
      set((state) => {
        state.fatGoal = goal;
      }),

    setUserSkippedOnboarding: (skipped) =>
      set((state) => {
        state.userSkippedOnboarding = skipped;
      }),

    reset: () =>
      set((state) => {
        state.age = undefined;
        state.sex = undefined;
        state.height = undefined;
        state.weight = undefined;
        state.activityLevel = undefined;
        state.calorieGoalType = undefined;
        state.calorieGoal = undefined;
        state.proteinGoal = undefined;
        state.proteinGoalType = undefined;
        state.fatPercentage = 20;
        state.inputMethod = undefined;
        state.carbGoal = undefined;
        state.fatGoal = undefined;
        state.userSkippedOnboarding = false;
      }),
  }))
);
