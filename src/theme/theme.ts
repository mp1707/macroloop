// Centralized theme system based on "Focused Motivation" design system
import { Appearance } from "react-native";
import { Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// Base spacing unit
const SPACING_UNIT = 8;

// Color palettes
const lightColors = {
  // Core UI - "Paper" strategy for clean, crisp hierarchy
  primaryBackground: "#F6F8FA",
  secondaryBackground: "#FFFFFF",
  tertiaryBackground: "#F6F8FA", // for grouped areas (sheets, pickers)
  gradientFromBackground: "#FFFFFF",
  gradientToBackground: "#FFFFFF", // flat white - no banding
  primaryText: "#121417", // inkier, better contrast
  secondaryText: "#5B6472", // slightly darker for AA+ on white
  border: "rgba(17, 24, 39, 0.08)", // ~zinc-900 @8%, cooler hairline
  white: "#FFFFFF",
  black: "#000000",
  disabledBackground: "rgba(18, 20, 23, 0.06)",
  disabledText: "rgba(18, 20, 23, 0.35)",

  // Subtle UI
  subtleBackground: "rgba(0, 0, 0, 0.03)",
  subtleBorder: "rgba(18, 20, 23, 0.06)",

  // Accent & system
  accent: "#1EC8B6",
  recording: "#FF4E3A",
  error: "#FF4E3A",
  warning: "#FFB020",
  success: "#10B981",

  // Semantic macro colors (deepened one step for readability on white)
  semantic: {
    calories: "#1EC8B6", // same family, slightly deeper
    protein: "#4F76FF",
    carbs: "#FF5D5D",
    fat: "#F5B72A",
  },

  // Subtle tints for semantic surfaces (alpha for neutral tracks)
  semanticSurfaces: {
    calories: "rgba(68, 235, 212, 0.32)",
    protein: "rgba(94, 135, 255, 0.32)",
    carbs: "rgba(255, 109, 109, 0.16)",
    fat: "rgba(255, 194, 51, 0.18)",
  },

  // Tinted badge backgrounds (≈16% opacity)
  semanticBadges: {
    calories: { background: "rgba(68, 235, 212, 0.16)", text: "#1CAFA0" },
    protein: { background: "rgba(94, 135, 255, 0.16)", text: "#3E69FF" },
    carbs: { background: "rgba(255, 109, 109, 0.16)", text: "#E55B5B" },
    fat: { background: "rgba(255, 194, 51, 0.16)", text: "#E0A900" },
  },

  // Solid callout badge for overlapping pills
  recommendedBadge: {
    background: "#0FAF9E",
    text: "#FFFFFF",
  },

  // State backgrounds
  errorBackground: "rgba(255, 78, 58, 0.10)",
  warningBackground: "rgba(255, 176, 32, 0.10)",
  successBackground: "rgba(16, 185, 129, 0.06)",

  // Icon badge
  iconBadge: {
    background: "rgba(240, 98, 146, 0.16)",
    iconColor: "#C2185B",
  },

  // Log status
  logStatus: {
    potential: {
      background: "rgba(18, 20, 23, 0.06)",
      text: "#121417",
      iconColor: "#121417",
    },
    confirmed: {
      background: "rgba(18, 20, 23, 0.06)",
      text: "#121417",
      iconColor: "#121417",
    },
    complete: {
      background: "rgba(16, 185, 129, 0.14)",
      text: "#0FA47A",
      iconColor: "#0FA47A",
    },
  },
} as const;

const darkColors = {
  // Core UI Colors
  primaryBackground: "#000000",
  secondaryBackground: "#1C1C1E",
  tertiaryBackground: "#2C2C2E",
  gradientFromBackground: "#131313",
  gradientToBackground: "#000000",
  primaryText: "#F2F2F7",
  secondaryText: "#8D8D93",
  border: "#38383A",
  white: "#FFFFFF",
  black: "#000000",
  disabledBackground: "#2C2C2E",
  disabledText: "rgba(242, 242, 247, 0.4)",

  // Subtle UI elements
  subtleBackground: "rgba(255, 255, 255, 0.05)",
  subtleBorder: "rgba(255, 255, 255, 0.24)",

  // Main Accent & System Colors
  accent: "#44EBD4",
  recording: "#FF665A",
  error: "#FF665A",
  warning: "#FFD54F",
  success: "#4DF2DE",

  // Semantic Colors for Nutrition Data
  semantic: {
    calories: "#44EBD4",
    protein: "#6A9BFF",
    carbs: "#FF8A8A",
    fat: "#FFD740",
  },

  // Subtle tints for semantic surfaces
  semanticSurfaces: {
    calories: "#103833",
    protein: "#19253D",
    carbs: "#3D2121",
    fat: "#3D340F",
  },

  // Semi-transparent colors for badges/backgrounds
  semanticBadges: {
    calories: {
      background: "hsla(172, 80.70%, 59.40%, 0.15)",
      text: "#44EBD4",
    },
    protein: {
      background: "rgba(106, 155, 255, 0.15)",
      text: "#6A9BFF",
    },
    carbs: {
      background: "rgba(255, 138, 138, 0.15)",
      text: "#FF8A8A",
    },
    fat: {
      background: "rgba(255, 215, 64, 0.15)",
      text: "#FFD740",
    },
  },

  recommendedBadge: {
    background: "#2AD1BE",
    text: "#002622",
  },

  // State background colors
  errorBackground: "rgba(255, 102, 90, 0.15)",
  warningBackground: "rgba(255, 213, 79, 0.15)",
  successBackground: "rgba(77, 242, 222, 0.05)",

  // Icon badge colors
  iconBadge: {
    background: "rgba(240, 98, 146, 0.15)",
    iconColor: "#F06292",
  },

  // Log Status
  logStatus: {
    // Stage 1: Neutral, subtle CTA.
    potential: {
      background: "hsla(240, 24%, 96%, 0.20)", // Slightly darker than disabled
      text: "#F2F2F7", // primaryText
      iconColor: "#F2F2F7", // primaryText
    },
    // Stage 2: Confirmed state. Stronger contrast with primary text.
    confirmed: {
      background: "hsla(240, 24%, 96%, 0.20)", // Slightly darker than disabled
      text: "#F2F2F7", // primaryText
      iconColor: "#F2F2F7", // primaryText
    },
    // Stage 3: Verified. The celebratory pop of color.
    complete: {
      background: "rgba(77, 242, 222, 0.15)",
      text: "#4DF2DE", // The vibrant "success" green
      iconColor: "#4DF2DE",
    },
  },
} as const;

// ... (The rest of your theme file remains unchanged)

// Typography scale with Nunito font
const typography = {
  Title1: {
    fontFamily: "Nunito-Bold",
    fontSize: 28,
    fontWeight: "700" as const,
  },
  Title2: {
    fontFamily: "Nunito-Bold",
    fontSize: 22,
    fontWeight: "700" as const,
  },
  Headline: {
    fontFamily: "Nunito-SemiBold",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  Body: {
    fontFamily: "Nunito-Regular",
    fontSize: 15,
    fontWeight: "400" as const,
  },
  Subhead: {
    fontFamily: "Nunito-Regular",
    fontSize: 15,
    fontWeight: "400" as const,
  },
  Caption: {
    fontFamily: "Nunito-Regular",
    fontSize: 13,
    fontWeight: "400" as const,
  },
  Button: {
    fontFamily: "Nunito-Bold",
    fontSize: 17,
    fontWeight: "500" as const,
  },
} as const;

// Spacing system based on 8pt grid
const spacing = {
  unit: SPACING_UNIT,
  pageMargins: {
    horizontal: 24, // 3×8pt - strict 8pt grid compliance
  },
  xs: SPACING_UNIT * 0.5, // 4
  sm: SPACING_UNIT, // 8
  md: SPACING_UNIT * 2, // 16
  lg: SPACING_UNIT * 3, // 24
  xl: SPACING_UNIT * 4, // 32
  xxl: SPACING_UNIT * 6, // 48
} as const;

// Component specifications
const components = {
  cards: {
    cornerRadius: 18,
    lightMode: {
      backgroundColor: lightColors.secondaryBackground,
      // Soft iOS shadow + hairline for crisp elevation
      shadowColor: "rgba(0, 0, 0, 0.08)",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 3,
      borderWidth: 1,
      borderColor: lightColors.border,
    },
    darkMode: {
      backgroundColor: darkColors.secondaryBackground,
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
  buttons: {
    cornerRadius: 12,
    lightMode: {
      primary: {
        default: {
          backgroundColor: lightColors.accent,
          textColor: lightColors.white, // HIG: white text on filled accent
        },
        active: {
          backgroundColor: lightColors.accent + "CC", // Slightly lighter on active
          textColor: lightColors.white,
        },
        disabled: {
          backgroundColor: lightColors.disabledBackground,
          textColor: lightColors.disabledText,
        },
      },
      secondary: {
        default: {
          backgroundColor: lightColors.secondaryBackground,
          textColor: lightColors.primaryText,
          borderWidth: 1,
          borderColor: lightColors.border,
        },
        active: {
          backgroundColor: lightColors.primaryBackground,
          textColor: lightColors.primaryText,
          borderWidth: 1,
          borderColor: lightColors.border,
        },
        disabled: {
          backgroundColor: lightColors.disabledBackground,
          textColor: lightColors.disabledText,
          borderWidth: 1,
          borderColor: lightColors.disabledBackground,
        },
      },
      tertiary: {
        default: {
          backgroundColor: lightColors.secondaryBackground,
          textColor: lightColors.primaryText,
          borderWidth: 1,
          borderColor: lightColors.border,
        },
        active: {
          backgroundColor: lightColors.primaryBackground,
          textColor: lightColors.primaryText,
        },
        disabled: {
          backgroundColor: lightColors.disabledBackground,
          textColor: lightColors.disabledText,
        },
      },
      destructive: {
        default: {
          backgroundColor: lightColors.accent,
          textColor: lightColors.white,
        },
        active: {
          backgroundColor: lightColors.accent,
          textColor: lightColors.white,
        },
        disabled: {
          backgroundColor: lightColors.disabledBackground,
          textColor: lightColors.disabledText,
        },
      },
    },
    darkMode: {
      primary: {
        default: {
          backgroundColor: darkColors.accent,
          textColor: darkColors.black,
        },
        active: {
          backgroundColor: darkColors.accent + "CC", // Slightly lighter on active
          textColor: darkColors.white,
        },
        disabled: {
          backgroundColor: darkColors.disabledBackground,
          textColor: darkColors.disabledText,
        },
      },
      secondary: {
        default: {
          backgroundColor: darkColors.secondaryBackground,
          textColor: darkColors.primaryText,
          borderWidth: 1,
          borderColor: darkColors.border,
        },
        active: {
          backgroundColor: darkColors.primaryBackground,
          textColor: darkColors.primaryText,
          borderWidth: 1,
          borderColor: darkColors.border,
        },
        disabled: {
          backgroundColor: darkColors.disabledBackground,
          textColor: darkColors.disabledText,
          borderWidth: 1,
          borderColor: darkColors.disabledBackground,
        },
      },
      tertiary: {
        default: {
          backgroundColor: darkColors.secondaryBackground,
          textColor: darkColors.primaryText,
          borderWidth: 1,
          borderColor: darkColors.border,
        },
        active: {
          backgroundColor: darkColors.primaryBackground,
          textColor: darkColors.primaryText,
        },
        disabled: {
          backgroundColor: darkColors.disabledBackground,
          textColor: darkColors.disabledText,
        },
      },
      destructive: {
        default: {
          backgroundColor: darkColors.accent,
          textColor: darkColors.white,
        },
        active: {
          backgroundColor: darkColors.accent,
          textColor: darkColors.white,
        },
        disabled: {
          backgroundColor: darkColors.disabledBackground,
          textColor: darkColors.disabledText,
        },
      },
    },
  },
  aiActionTargets: {
    height: 56,
    minWidth: 120,
    iconColor: {
      light: lightColors.secondaryBackground,
      dark: darkColors.primaryBackground,
    },
    iconSize: 24,
  },
  progressBars: {
    height: 8,
    cornerRadius: 4,
    lightMode: {
      trackColor: lightColors.disabledBackground,
      fillColor: lightColors.accent,
    },
    darkMode: {
      trackColor: darkColors.disabledBackground,
      fillColor: darkColors.accent,
    },
  },
} as const;

// Animation configurations
const animations = {
  defaultTransition: {
    duration: 300,
    easing: "easeOut",
  },
  motivationalMoments: {
    logSuccess: {
      duration: 500,
      easing: "bezier(0.25, 1, 0.5, 1)",
      haptics: {
        type: "impact",
        style: "light",
      },
    },
    goalCompletion: {
      shimmer: {
        duration: 1000,
        easing: "linear",
        gradient: [
          "transparent",
          "rgba(105, 240, 174, 0.4)", // Using the new vibrant dark mode green
          "transparent",
        ],
      },
    },
  },
} as const;

// Interaction configurations for consistent press animations and haptics
const interactions = {
  press: {
    scale: 0.97, // Apple-like subtle scale for premium feel
    timing: {
      duration: 120, // Fast, responsive press-in
      easing: Easing.out(Easing.quad),
    },
    spring: {
      damping: 25, // Controlled bounce
      stiffness: 350, // Snappy release
    },
  },
  haptics: {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  },
} as const;

// Layout system for 8pt grid compliance
const layout = {
  // Header component dimensions (all in 8pt multiples)
  header: {
    titleContainerHeight: 60, // 7.5×8pt - Header component with padding (16 + 44)
    dateSliderHeight: 96, // 12×8pt - DateSlider container height
    gap: 8, // 1×8pt - Gap between header and slider
    bottomPadding: 24, // 3*8pt - Bottom padding for spacing
  },

  // Calculate dynamic header height that aligns to 8pt grid
  calculateHeaderHeight: (safeAreaTop: number = 0): number => {
    const { header } = layout;
    const contentHeight =
      header.titleContainerHeight +
      header.gap +
      header.dateSliderHeight +
      header.bottomPadding;
    const totalHeight = safeAreaTop + contentHeight;

    // Round up to nearest 8pt to maintain grid alignment
    return Math.ceil(totalHeight / SPACING_UNIT) * SPACING_UNIT;
  },

  // 8pt grid validation helper
  validateSpacing: (value: number): boolean => {
    return value % SPACING_UNIT === 0;
  },

  // Round value to nearest 8pt multiple
  roundToGrid: (value: number): number => {
    return Math.round(value / SPACING_UNIT) * SPACING_UNIT;
  },
} as const;

// Helper function to get current color scheme
const getColorScheme = () => {
  return Appearance.getColorScheme() || "light";
};

// Get colors based on current scheme
const getColors = (scheme?: "light" | "dark") => {
  const currentScheme = scheme || getColorScheme();
  return currentScheme === "dark" ? darkColors : lightColors;
};

// Get component styles based on current scheme
const getComponentStyles = (scheme?: "light" | "dark") => {
  const currentScheme = scheme || getColorScheme();
  return {
    ...components,
    cards: {
      ...components.cards,
      ...(currentScheme === "dark"
        ? components.cards.darkMode
        : components.cards.lightMode),
    },
    buttons: {
      ...components.buttons,
      ...(currentScheme === "dark"
        ? components.buttons.darkMode
        : components.buttons.lightMode),
    },
    aiActionTargets: {
      ...components.aiActionTargets,
      iconColor: components.aiActionTargets.iconColor[currentScheme],
    },
    progressBars: {
      ...components.progressBars,
      ...(currentScheme === "dark"
        ? components.progressBars.darkMode
        : components.progressBars.lightMode),
    },
  };
};

// Main theme object
export const theme = {
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  typography,
  spacing,
  layout,
  components,
  animations,
  interactions,
  // Helper functions
  getColors,
  getComponentStyles,
} as const;

export type Theme = typeof theme;
export type ColorScheme = "light" | "dark";
export type AppearancePreference = "system" | ColorScheme;
export type Colors = typeof lightColors | typeof darkColors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Layout = typeof layout;
