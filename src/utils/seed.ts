import { FoodLog } from "../types/models";
import { useAppStore } from "../store/useAppStore";
import { generateFoodLogId } from "./idGenerator";
import { testFoodLogs } from "./testData";
import { formatDateToLocalString, parseDateKey } from "@/utils/dateHelpers";

/**
 * Seeds the app with randomized test food logs for the last 120 days
 * Each day gets logs totaling roughly 2000-3000 calories
 */
export const seedFoodLogs = (): void => {
  const seededLogs: FoodLog[] = [];
  const today = new Date();

  // Generate data for the last 120 days
  for (let dayOffset = 0; dayOffset < 120; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - dayOffset);

    // Use local-safe date key (YYYY-MM-DD)
    const logDate = formatDateToLocalString(currentDate);

    // Target random calories between 2000 and 3000
    const targetCalories = Math.floor(Math.random() * 1000) + 2000;
    const dailyLogs = getRandomFoodLogs(targetCalories, logDate);
    seededLogs.push(...dailyLogs);
  }

  // Set the seeded logs in the store
  useAppStore.getState().setFoodlogs(seededLogs);
};

/**
 * Gets random food logs for a given date that sum up to roughly the target calories
 */
const getRandomFoodLogs = (
  targetCalories: number,
  logDate: string
): FoodLog[] => {
  const logs: FoodLog[] = [];
  let currentCalories = 0;

  // Construct a local midnight base time for the given logDate
  const { year, month, day } = parseDateKey(logDate);
  const baseTime = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Safety break to prevent infinite loops
  let attempts = 0;
  const maxAttempts = 50;

  while (currentCalories < targetCalories && attempts < maxAttempts) {
    attempts++;

    // Pick a random test food log
    const randomIndex = Math.floor(Math.random() * testFoodLogs.length);
    const testLog = testFoodLogs[randomIndex];

    // Create a random time within the day (6 AM to 10 PM)
    const randomHour = Math.floor(Math.random() * 16) + 6; // 6-21 (6 AM to 9 PM)
    const randomMinute = Math.floor(Math.random() * 60);
    const randomSecond = Math.floor(Math.random() * 60);

    const createdAt = new Date(baseTime);
    createdAt.setHours(randomHour, randomMinute, randomSecond, 0);

    const foodLog: FoodLog = {
      id: generateFoodLogId(),
      logDate,
      createdAt: createdAt.toISOString(),
      ...testLog,
    };

    logs.push(foodLog);
    currentCalories += foodLog.calories;
  }

  // Sort logs by creation time for more realistic ordering
  return logs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};