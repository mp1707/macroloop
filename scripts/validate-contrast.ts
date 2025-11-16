#!/usr/bin/env ts-node
/**
 * WCAG 2.2 Color Contrast Validation Script
 *
 * This script validates all color combinations in the MacroLoop theme
 * to ensure they meet WCAG 2.2 Level AA contrast requirements:
 * - Normal text (14-18pt): 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 * - UI components: 3:1
 *
 * Run: npx ts-node scripts/validate-contrast.ts
 */

import { theme } from "../src/theme/theme";

// WCAG AA Contrast Requirements
const WCAG_AA_NORMAL = 4.5; // Normal text
const WCAG_AA_LARGE = 3.0; // Large text (18pt+ or 14pt+ bold)
const WCAG_AA_UI = 3.0; // UI components

interface ContrastTest {
  name: string;
  foreground: string;
  background: string;
  requiredRatio: number;
  textType: "normal" | "large" | "ui";
}

interface ContrastResult {
  test: ContrastTest;
  ratio: number;
  passes: boolean;
}

// Helper to get contrast ratio
const getContrastRatio = theme.getContrastRatio;

// Color combinations to test
const lightModeTests: ContrastTest[] = [
  // Primary text combinations
  {
    name: "Primary text on primary background",
    foreground: theme.colors.light.primaryText,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Primary text on secondary background",
    foreground: theme.colors.light.primaryText,
    background: theme.colors.light.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on primary background",
    foreground: theme.colors.light.secondaryText,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on secondary background",
    foreground: theme.colors.light.secondaryText,
    background: theme.colors.light.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Disabled text on primary background",
    foreground: theme.colors.light.disabledText,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Accent color combinations
  {
    name: "Accent UI on primary background",
    foreground: theme.colors.light.accent,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
  {
    name: "Black text on accent (primary button)",
    foreground: theme.colors.light.black,
    background: theme.colors.light.accent,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Semantic badge combinations
  {
    name: "Calories badge text on background",
    foreground: theme.colors.light.semanticBadges.calories.text,
    background: theme.colors.light.semanticBadges.calories.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Protein badge text on background",
    foreground: theme.colors.light.semanticBadges.protein.text,
    background: theme.colors.light.semanticBadges.protein.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Carbs badge text on background",
    foreground: theme.colors.light.semanticBadges.carbs.text,
    background: theme.colors.light.semanticBadges.carbs.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Fat badge text on background",
    foreground: theme.colors.light.semanticBadges.fat.text,
    background: theme.colors.light.semanticBadges.fat.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Recommended badge
  {
    name: "Recommended badge text on background",
    foreground: theme.colors.light.recommendedBadge.text,
    background: theme.colors.light.recommendedBadge.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Error states
  {
    name: "Error UI on primary background",
    foreground: theme.colors.light.error,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
  {
    name: "Error text on error background",
    foreground: theme.colors.light.error,
    background: theme.colors.light.errorBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Success states
  {
    name: "Success UI on primary background",
    foreground: theme.colors.light.success,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Warning states
  {
    name: "Warning UI on primary background",
    foreground: theme.colors.light.warning,
    background: theme.colors.light.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Log status
  {
    name: "Complete log status text on background",
    foreground: theme.colors.light.logStatus.complete.text,
    background: theme.colors.light.logStatus.complete.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
];

const darkModeTests: ContrastTest[] = [
  // Primary text combinations
  {
    name: "Primary text on primary background",
    foreground: theme.colors.dark.primaryText,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Primary text on secondary background",
    foreground: theme.colors.dark.primaryText,
    background: theme.colors.dark.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on primary background",
    foreground: theme.colors.dark.secondaryText,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on secondary background",
    foreground: theme.colors.dark.secondaryText,
    background: theme.colors.dark.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Disabled text on primary background",
    foreground: theme.colors.dark.disabledText,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Accent color combinations
  {
    name: "Accent UI on primary background",
    foreground: theme.colors.dark.accent,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
  {
    name: "Black text on accent (primary button)",
    foreground: theme.colors.dark.black,
    background: theme.colors.dark.accent,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Semantic badge combinations
  {
    name: "Calories badge text on background",
    foreground: theme.colors.dark.semanticBadges.calories.text,
    background: theme.colors.dark.semanticBadges.calories.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Protein badge text on background",
    foreground: theme.colors.dark.semanticBadges.protein.text,
    background: theme.colors.dark.semanticBadges.protein.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Carbs badge text on background",
    foreground: theme.colors.dark.semanticBadges.carbs.text,
    background: theme.colors.dark.semanticBadges.carbs.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Fat badge text on background",
    foreground: theme.colors.dark.semanticBadges.fat.text,
    background: theme.colors.dark.semanticBadges.fat.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Recommended badge
  {
    name: "Recommended badge text on background",
    foreground: theme.colors.dark.recommendedBadge.text,
    background: theme.colors.dark.recommendedBadge.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Error states
  {
    name: "Error UI on primary background",
    foreground: theme.colors.dark.error,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Success states
  {
    name: "Success UI on primary background",
    foreground: theme.colors.dark.success,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Warning states
  {
    name: "Warning UI on primary background",
    foreground: theme.colors.dark.warning,
    background: theme.colors.dark.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
];

// Run tests
function runTests(
  tests: ContrastTest[],
  mode: "light" | "dark"
): ContrastResult[] {
  return tests.map((test) => {
    const ratio = getContrastRatio(test.foreground, test.background);
    const passes = ratio >= test.requiredRatio;

    return {
      test,
      ratio,
      passes,
    };
  });
}

// Format ratio for display
function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

// Print results
function printResults(results: ContrastResult[], mode: "light" | "dark") {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${mode.toUpperCase()} MODE CONTRAST VALIDATION`);
  console.log(`${"=".repeat(80)}\n`);

  const passed = results.filter((r) => r.passes);
  const failed = results.filter((r) => !r.passes);

  // Print failures first (more important)
  if (failed.length > 0) {
    console.log(`❌ FAILED (${failed.length}/${results.length}):\n`);
    failed.forEach((result) => {
      console.log(`  ❌ ${result.test.name}`);
      console.log(`     Foreground: ${result.test.foreground}`);
      console.log(`     Background: ${result.test.background}`);
      console.log(
        `     Ratio: ${formatRatio(result.ratio)} (required: ${formatRatio(result.test.requiredRatio)})`
      );
      console.log(
        `     Gap: ${formatRatio(result.test.requiredRatio - result.ratio)} below requirement\n`
      );
    });
  }

  // Print passes
  if (passed.length > 0) {
    console.log(`✅ PASSED (${passed.length}/${results.length}):\n`);
    passed.forEach((result) => {
      console.log(`  ✅ ${result.test.name}`);
      console.log(
        `     Ratio: ${formatRatio(result.ratio)} (required: ${formatRatio(result.test.requiredRatio)})`
      );
    });
  }

  // Summary
  console.log(`\n${"-".repeat(80)}`);
  console.log(
    `SUMMARY: ${passed.length} passed, ${failed.length} failed out of ${results.length} tests`
  );
  console.log(`${"=".repeat(80)}\n`);

  return failed.length === 0;
}

// Main execution
console.log("\n🎨 WCAG 2.2 Color Contrast Validation for MacroLoop\n");
console.log("Requirements:");
console.log(`  - Normal text (14-18pt): ${formatRatio(WCAG_AA_NORMAL)}`);
console.log(`  - Large text (18pt+/14pt+ bold): ${formatRatio(WCAG_AA_LARGE)}`);
console.log(`  - UI components: ${formatRatio(WCAG_AA_UI)}\n`);

const lightResults = runTests(lightModeTests, "light");
const darkResults = runTests(darkModeTests, "dark");

const lightPassed = printResults(lightResults, "light");
const darkPassed = printResults(darkResults, "dark");

// Exit code
if (lightPassed && darkPassed) {
  console.log("✅ All contrast tests passed!\n");
  process.exit(0);
} else {
  console.log("❌ Some contrast tests failed. Please review and fix.\n");
  process.exit(1);
}
