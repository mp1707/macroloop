import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";
const SCHEME = IS_DEV
  ? "macroloop-dev"
  : IS_PREVIEW
  ? "macroloop-preview"
  : "macroloop";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "MacroLoop D" : IS_PREVIEW ? "MacroLoop P" : "MacroLoop",
  slug: "gainslog",
  version: "1.0.8",
  orientation: "portrait",
  newArchEnabled: true,
  scheme: SCHEME,
  ios: {
    supportsTablet: true,
    infoPlist: {
      // Permission descriptions are handled by the plugins below.
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
    },
    bundleIdentifier: IS_DEV
      ? "com.mp17.mpapps.macroloop.dev"
      : IS_PREVIEW
      ? "com.mp17.mpapps.macroloop.preview"
      : "com.mp17.mpapps.macroloop",
    icon: "./assets/app.icon",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
    ],
    package: IS_DEV
      ? "com.mp17.mpapps.macroloop.dev"
      : IS_PREVIEW
      ? "com.mp17.mpapps.macroloop.preview"
      : "com.mp17.mpapps.macroloop",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-localization",
    "expo-router",
    // Add Expo Dev Client to ensure URL schemes and local network permissions
    // are injected into the native iOS project for development builds.
    "expo-dev-client",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/splash-icon.png",
        dark: {
          image: "./assets/splash-icon-dark.png",
          backgroundColor: "#000000",
        },
        imageWidth: 200,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "MacroLoop needs camera access to take photos of your meals for automatic food logging. For example, photograph your plate and the app will identify the food and estimate portions.",
        microphonePermission:
          "MacroLoop needs microphone access for voice-based food logging. For example, you can say 'chicken breast 200 grams' and the app will transcribe your speech to create a food entry.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission:
          "MacroLoop needs access to your photos so you can select meal images from your library for automatic food logging.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "MacroLoop needs microphone access for voice-based food logging. For example, you can say 'chicken breast 200 grams' and the app will transcribe your speech to create a food entry.",
        speechRecognitionPermission:
          "MacroLoop needs speech recognition to convert your voice into text for hands-free food logging. For example, speak your meal details and the app will create a food entry from your words.",
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Nunito-Regular.ttf",
          "./assets/fonts/Nunito-SemiBold.ttf",
          "./assets/fonts/Nunito-Bold.ttf",
        ],
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "9399162f-831f-4f85-8a40-602317f608cb",
    },
  },
  updates: {
    url: "https://u.expo.dev/9399162f-831f-4f85-8a40-602317f608cb",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  owner: "mp17",
  locales: {
    en: "./locales/ios/en.json",
    de: "./locales/ios/de.json",
  },
});
