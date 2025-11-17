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
  version: "1.0.3",
  orientation: "portrait",
  newArchEnabled: true,
  scheme: SCHEME,
  ios: {
    supportsTablet: true,
    infoPlist: {
      // Permission descriptions are handled by the plugins below.
      ITSAppUsesNonExemptEncryption: false,
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
        cameraPermission: "Allow MacroLoop to access your camera",
        microphonePermission: "Allow MacroLoop to access your microphone",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow MacroLoop to access your photos.",
        savePhotosPermission: "Allow MacroLoop to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow MacroLoop to use the microphone for audio food logging.",
        speechRecognitionPermission:
          "Allow MacroLoop to use speech recognition for audio food logging.",
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
});
