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
