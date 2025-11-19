import { Alert, Linking, Platform } from "react-native";
import i18next from "./i18n";

export type PermissionType = "camera" | "microphone" | "photoLibrary";

/**
 * Shows a native alert explaining why a permission is needed
 * and provides an "Open Settings" button to let the user grant it.
 */
export const showPermissionDeniedAlert = (permissionType: PermissionType) => {
  const translationKey = `createLog.permissions.${
    permissionType === "camera"
      ? "cameraDenied"
      : permissionType === "microphone"
      ? "microphoneDenied"
      : "photoLibraryDenied"
  }`;

  const title = i18next.t(`${translationKey}.title`);
  const message = i18next.t(`${translationKey}.message`);
  const openSettingsText = i18next.t(`${translationKey}.openSettings`);
  const cancelText = i18next.t("common.cancel");

  Alert.alert(title, message, [
    {
      text: cancelText,
      style: "cancel",
    },
    {
      text: openSettingsText,
      onPress: () => {
        if (Platform.OS === "ios") {
          Linking.openURL("app-settings:");
        } else {
          Linking.openSettings();
        }
      },
    },
  ]);
};
