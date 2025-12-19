## General

Always use our dynamic theme for styling. you can check out @skeletonpill to understand how we use our theme hook and create styles. also always use @AppText for Text and use the role prop for styling. Dont style text sizes etc. individually with own styles.

Quick Rules:

- for animations use react-native-reanimated (and theme values!)
- not that runOnJs is deprecated. always use import { scheduleOnRN } from "react-native-worklets"; instead
- for blur effects use expo-blur
- for haptics use expo-haptics (and theme values!)
- for state management use our central store @store (zustand and async storage)
- for icons use lucide
- for keyboard management use keyboard-controller
- for navigation call Expo Router through useSafeRouter

## Nutrient Calculations

When displaying or aggregating nutrient data from food logs, **ALWAYS** use the centralized utility functions from `@/utils/nutrientCalculations` to ensure `percentageEaten` is properly applied.

### ❌ DO NOT manually calculate nutrients

```typescript
// BAD - Manual calculation (error-prone, easily forgotten)
const calories = log.calories * ((log.percentageEaten ?? 100) / 100);
const protein = log.protein * ((log.percentageEaten ?? 100) / 100);
```

### ✅ DO use the utility functions

```typescript
// GOOD - Centralized calculation
import { calculateConsumedNutrients } from '@/utils/nutrientCalculations';
const nutrients = calculateConsumedNutrients(log);
// Returns: { calories, protein, carbs, fat } - all adjusted for percentageEaten
```

### Available Functions

#### 1. `calculateConsumedNutrients(log)` - Single log calculation
- **Use for:** Individual log displays, edit screens, single item calculations
- **Input:** Single `FoodLog` or `Favorite` object
- **Returns:** `{ calories: number, protein: number, carbs: number, fat: number }`
- **Example:**
  ```typescript
  // In LogCard component
  <NutritionList nutrition={calculateConsumedNutrients(foodLog)} />

  // In edit screen with custom percentageEaten
  const displayedNutrients = calculateConsumedNutrients({
    ...editedLog,
    percentageEaten: 75 // User ate 75%
  });
  ```

#### 2. `aggregateConsumedNutrients(logs)` - Sum multiple logs
- **Use for:** Daily totals, ring displays, dashboard summaries
- **Input:** Array of `FoodLog` or `Favorite` objects
- **Returns:** `{ calories: number, protein: number, carbs: number, fat: number }`
- **Example:**
  ```typescript
  // In selectors for daily totals
  const logsForDay = selectLogsForDate(state, date);
  return aggregateConsumedNutrients(logsForDay);
  ```

#### 3. `aggregateConsumedNutrientsByDate(logs)` - Date-indexed map
- **Use for:** Calendar views, heatmaps, charts, multi-day displays
- **Input:** Array of `FoodLog` objects
- **Returns:** `Map<dateString, { calories, protein, carbs, fat, exists: boolean }>`
- **Example:**
  ```typescript
  // In DateSlider or ConsistencyGrid
  const nutrientsByDate = aggregateConsumedNutrientsByDate(foodLogs);
  const todayData = nutrientsByDate.get('2025-01-15');
  // todayData: { calories: 1850, protein: 120, carbs: 180, fat: 60, exists: true }
  ```

### What These Functions Handle Automatically

All functions handle the following edge cases:
- ✅ `percentageEaten` defaults to 100 if undefined
- ✅ Missing nutrient values (null/undefined) default to 0
- ✅ Works with both `FoodLog` and `Favorite` types
- ✅ Type-safe with full TypeScript support

### Critical Rule

**NEVER** add new UI components that calculate nutrients without using these utilities. If you need to display consumed nutrients anywhere in the app, use one of these three functions. This prevents bugs where `percentageEaten` is forgotten.

---

## Macro Calculations: Two Distinct Utilities

We have **two separate calculation utilities** for different purposes. Understanding which to use is critical:

### 1. `macroTargetCalculations.ts` - Goal Setting & Targets
**When to use:** Setting up daily goals, calculating macro targets, onboarding flow
- **Purpose:** "What SHOULD I eat to hit my goals?"
- **Functions:**
  - `calculateMacrosFromProtein()` - Calculate fat/carbs from calorie budget
  - `calculateCarbsFromProteinChange()` - Adjust when protein changes
  - `calculateFatGramsFromPercentage()` - Convert fat % to grams
  - `calculateMaxFatPercentage()` - Find max fat % based on protein/calories
- **Used in:** Onboarding screens, settings, goal adjustment flows

### 2. `nutrientCalculations.ts` - Consumption Tracking
**When to use:** Displaying logged food, calculating daily totals, showing progress
- **Purpose:** "What DID I eat today?" (accounts for percentageEaten)
- **Functions:**
  - `calculateConsumedNutrients()` - Single log with percentageEaten applied
  - `aggregateConsumedNutrients()` - Sum multiple logs
  - `aggregateConsumedNutrientsByDate()` - Date-indexed nutrient map
- **Used in:** LogCards, dashboards, charts, ring displays, daily totals

### Quick Decision Guide
- Setting/editing **goals or targets**? → Use `macroTargetCalculations.ts`
- Displaying **actual logged food**? → Use `nutrientCalculations.ts`
