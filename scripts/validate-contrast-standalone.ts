#!/usr/bin/env node
/**
 * WCAG 2.2 Color Contrast Validation Script (Standalone)
 *
 * This script validates all color combinations in the MacroLoop theme
 * to ensure they meet WCAG 2.2 Level AA contrast requirements:
 * - Normal text (14-18pt): 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 * - UI components: 3:1
 *
 * Run: node scripts/validate-contrast-standalone.ts
 */

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

// Color palettes (from theme.ts)
const lightColors = {
  primaryBackground: "#F6F8FA",
  secondaryBackground: "#FFFFFF",
  primaryText: "#121417",
  secondaryText: "#5B6472",
  black: "#000000",
  disabledText: "rgba(18, 20, 23, 0.35)",
  accent: "#1EC8B6",
  error: "#FF4E3A",
  warning: "#FFB020",
  success: "#10B981",
  errorBackground: "rgba(255, 78, 58, 0.10)",
  semanticBadges: {
    calories: { background: "rgba(68, 235, 212, 0.16)", text: "#1CAFA0" },
    protein: { background: "rgba(94, 135, 255, 0.16)", text: "#3E69FF" },
    carbs: { background: "rgba(255, 109, 109, 0.16)", text: "#E55B5B" },
    fat: { background: "rgba(255, 194, 51, 0.16)", text: "#E0A900" },
  },
  recommendedBadge: {
    background: "#0FAF9E",
    text: "#FFFFFF",
  },
  logStatus: {
    complete: {
      background: "rgba(16, 185, 129, 0.14)",
      text: "#0FA47A",
    },
  },
} as const;

const darkColors = {
  primaryBackground: "#000000",
  secondaryBackground: "#1C1C1E",
  primaryText: "#F2F2F7",
  secondaryText: "#8D8D93",
  black: "#000000",
  disabledText: "rgba(242, 242, 247, 0.4)",
  accent: "#44EBD4",
  error: "#FF665A",
  warning: "#FFD54F",
  success: "#4DF2DE",
  semanticBadges: {
    calories: { background: "hsla(172, 80.70%, 59.40%, 0.15)", text: "#44EBD4" },
    protein: { background: "rgba(106, 155, 255, 0.15)", text: "#6A9BFF" },
    carbs: { background: "rgba(255, 138, 138, 0.15)", text: "#FF8A8A" },
    fat: { background: "rgba(255, 215, 64, 0.15)", text: "#FFD740" },
  },
  recommendedBadge: {
    background: "#0FAF9E",
    text: "#FFFFFF",
  },
} as const;

// Helper function to parse rgba/hsla colors to RGB
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Remove whitespace
  color = color.trim();

  // Hex color
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    return {
      r: parseInt(hex.substr(0, 2), 16) / 255,
      g: parseInt(hex.substr(2, 2), 16) / 255,
      b: parseInt(hex.substr(4, 2), 16) / 255,
    };
  }

  // rgba color
  if (color.startsWith("rgba(")) {
    const match = color.match(
      /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/
    );
    if (match) {
      const alpha = parseFloat(match[4]);
      // For semi-transparent colors on white background (approximation)
      const r = (parseInt(match[1]) / 255) * alpha + 1 * (1 - alpha);
      const g = (parseInt(match[2]) / 255) * alpha + 1 * (1 - alpha);
      const b = (parseInt(match[3]) / 255) * alpha + 1 * (1 - alpha);
      return { r, g, b };
    }
  }

  // hsla color (approximate conversion)
  if (color.startsWith("hsla(")) {
    // For the specific hsla in our theme, manually return the RGB equivalent
    // This is a simplification - in production you'd want proper HSL->RGB conversion
    if (color.includes("172, 80.70%, 59.40%")) {
      // hsla(172, 80.70%, 59.40%, 0.15) -> approximately #44EBD4 at 15% opacity on dark bg
      const alpha = 0.15;
      const r = (0x44 / 255) * alpha;
      const g = (0xeb / 255) * alpha;
      const b = (0xd4 / 255) * alpha;
      return { r, g, b };
    }
  }

  console.warn(`Warning: Unable to parse color: ${color}`);
  return null;
}

// Helper function to calculate relative luminance (WCAG formula)
function getLuminance(hexColor: string): number {
  const rgb = parseColor(hexColor);
  if (!rgb) return 0;

  // Apply gamma correction
  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(rgb.r);
  const gLinear = toLinear(rgb.g);
  const bLinear = toLinear(rgb.b);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Helper function to calculate contrast ratio between two colors
function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Color combinations to test
const lightModeTests: ContrastTest[] = [
  // Primary text combinations
  {
    name: "Primary text on primary background",
    foreground: lightColors.primaryText,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Primary text on secondary background",
    foreground: lightColors.primaryText,
    background: lightColors.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on primary background",
    foreground: lightColors.secondaryText,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on secondary background",
    foreground: lightColors.secondaryText,
    background: lightColors.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Accent color combinations
  {
    name: "Accent UI on primary background",
    foreground: lightColors.accent,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
  {
    name: "Black text on accent (primary button)",
    foreground: lightColors.black,
    background: lightColors.accent,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Recommended badge
  {
    name: "Recommended badge text on background",
    foreground: lightColors.recommendedBadge.text,
    background: lightColors.recommendedBadge.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Error states
  {
    name: "Error UI on primary background",
    foreground: lightColors.error,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Success states
  {
    name: "Success UI on primary background",
    foreground: lightColors.success,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Warning states
  {
    name: "Warning UI on primary background",
    foreground: lightColors.warning,
    background: lightColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
];

const darkModeTests: ContrastTest[] = [
  // Primary text combinations
  {
    name: "Primary text on primary background",
    foreground: darkColors.primaryText,
    background: darkColors.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Primary text on secondary background",
    foreground: darkColors.primaryText,
    background: darkColors.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on primary background",
    foreground: darkColors.secondaryText,
    background: darkColors.primaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },
  {
    name: "Secondary text on secondary background",
    foreground: darkColors.secondaryText,
    background: darkColors.secondaryBackground,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Accent color combinations
  {
    name: "Accent UI on primary background",
    foreground: darkColors.accent,
    background: darkColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },
  {
    name: "Black text on accent (primary button)",
    foreground: darkColors.black,
    background: darkColors.accent,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Recommended badge
  {
    name: "Recommended badge text on background",
    foreground: darkColors.recommendedBadge.text,
    background: darkColors.recommendedBadge.background,
    requiredRatio: WCAG_AA_NORMAL,
    textType: "normal",
  },

  // Error states
  {
    name: "Error UI on primary background",
    foreground: darkColors.error,
    background: darkColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Success states
  {
    name: "Success UI on primary background",
    foreground: darkColors.success,
    background: darkColors.primaryBackground,
    requiredRatio: WCAG_AA_UI,
    textType: "ui",
  },

  // Warning states
  {
    name: "Warning UI on primary background",
    foreground: darkColors.warning,
    background: darkColors.primaryBackground,
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
