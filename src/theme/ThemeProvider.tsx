import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Appearance, StatusBar } from "react-native";
import { theme, ColorScheme, AppearancePreference } from "./theme";
// import AsyncStorage from "@react-native-async-storage/async-storage";

type Colors = typeof theme.colors.light | typeof theme.colors.dark;

interface ThemeContextType {
  colorScheme: ColorScheme;
  appearancePreference: AppearancePreference;
  colors: Colors;
  theme: typeof theme;
  isThemeLoaded: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  setAppearancePreference: (preference: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Default to system scheme
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(
    Appearance.getColorScheme() || "light"
  );
  const [appearancePreference, setAppearancePreferenceState] =
    useState<AppearancePreference>("system");
  const [isThemeLoaded, setIsThemeLoaded] = useState(true);

  // FUTURE: Track whether user manually selected a theme
  // const manualPreferenceRef = useRef(false);

  /* FUTURE: Load saved preference or fallback to system on mount
  useEffect(() => {
    (async () => {
      let saved: AppearancePreference | null = null;
      try {
        const raw = await AsyncStorage.getItem("colorSchemePreference");
        saved = (raw as AppearancePreference) || null;
      } catch (e) {
        // ignore
      }
      if (saved === "light" || saved === "dark") {
        setColorSchemeState(saved);
        setAppearancePreferenceState(saved);
        manualPreferenceRef.current = true;
      } else if (saved === "system") {
        const systemScheme = Appearance.getColorScheme() || "light";
        setColorSchemeState(systemScheme);
        setAppearancePreferenceState("system");
        manualPreferenceRef.current = false;
      } else {
         // Default fallback
        const systemScheme = Appearance.getColorScheme() || "light";
        setColorSchemeState(systemScheme);
        setAppearancePreferenceState("system");
        manualPreferenceRef.current = false;
      }
      setIsThemeLoaded(true);
    })();
  }, []);
  */

  // Listen for system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(
      ({ colorScheme: newScheme }) => {
        // FUTURE: Only update if not manually overridden
        // if (!manualPreferenceRef.current) {
        setColorSchemeState(newScheme || "light");
        // }
      }
    );
    return () => subscription?.remove();
  }, []);

  // Update status bar style based on color scheme
  useEffect(() => {
    StatusBar.setBarStyle(
      colorScheme === "dark" ? "light-content" : "dark-content",
      true
    );
  }, [colorScheme]);

  const colors = useMemo(() => theme.getColors(colorScheme), [colorScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    // FUTURE: Enable manual override
    // manualPreferenceRef.current = true;
    // setAppearancePreferenceState(scheme);
    // setColorSchemeState(scheme);
    // AsyncStorage.setItem("colorSchemePreference", scheme).catch(() => {});
    console.warn("Theme is currently hardcoded to system settings.");
  }, []);

  const setAppearancePreference = useCallback(
    (preference: AppearancePreference) => {
      // FUTURE: Enable preference setting
      /*
      if (preference === "system") {
        manualPreferenceRef.current = false;
        setAppearancePreferenceState("system");
        const systemScheme = Appearance.getColorScheme() || "light";
        setColorSchemeState(systemScheme);
        AsyncStorage.setItem("colorSchemePreference", "system").catch(
          () => {}
        );
      } else {
        setColorScheme(preference);
      }
      */
      console.warn("Theme is currently hardcoded to system settings.");
    },
    [setColorScheme]
  );

  const toggleColorScheme = useCallback(() => {
    // FUTURE: Enable toggle
    // setColorScheme(colorScheme === "light" ? "dark" : "light");
    console.warn("Theme is currently hardcoded to system settings.");
  }, [colorScheme, setColorScheme]);

  const value: ThemeContextType = useMemo(
    () => ({
      colorScheme,
      colors,
      theme,
      isThemeLoaded,
      setColorScheme,
      toggleColorScheme,
      appearancePreference,
      setAppearancePreference,
    }),
    [
      appearancePreference,
      colorScheme,
      colors,
      isThemeLoaded,
      setAppearancePreference,
      setColorScheme,
      toggleColorScheme,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Helper hook for getting themed styles
export const useThemedStyles = <T extends Record<string, unknown>>(
  styleFactory: (colors: Colors, themeObj: typeof theme) => T
): T => {
  const { colors, theme: themeObj } = useTheme();
  return styleFactory(colors, themeObj);
};