# Dependency Analysis

> Generated: 2026-03-16

## Overview

Analysis of all third-party dependencies in `package.json`, their usage across the codebase, and removal recommendations.

---

## Can Be Safely Removed (0 imports)

| Package | Description | Reason |
|---|---|---|
| `add` | npm add utility, likely installed by mistake | No imports |
| `crypto-browserify` | Browser crypto polyfill | No imports |
| `react-native-render-html` | HTML rendering component | No imports |
| `react-native-webview` | WebView component | No imports |
| `react-redux` | Redux state management (replaced by Context) | No imports |
| `recyclerlistview` | High-performance list component | No imports |
| `react-native-snap-carousel` | Carousel component | No imports |
| `react-native-haptic-feedback` | Haptic feedback | No imports |
| `react-native-keychain` | Secure storage (replaced by MMKV) | No imports |
| `yarn` | CLI tool, should not be a dependency | No imports |

## Implicit Dependencies (no direct import, required by other libs)

| Package | Required By | Recommendation |
|---|---|---|
| `react-native-gesture-handler` | react-navigation, @gorhom/bottom-sheet | Keep |
| `react-native-get-random-values` | May be needed by SDK internally | Test before removing |
| `react-native-screens` | react-navigation peer dependency | Keep |
| `react-native-web` | Web platform support (`yarn web`) | Keep |
| `react-dom` | Web platform support | Keep |
| `@tamagui/babel-plugin` | Used in babel.config.js | Keep |
| `@tamagui/config` | Used in tamagui.config.ts | Keep |
| `@fortawesome/fontawesome-svg-core` | FontAwesome peer dependency | Keep |

## Legacy-Only Dependencies (removable after migration)

| Package | File Count | Legacy Files |
|---|---|---|
| `@react-native-community/datetimepicker` | 1 | `legacy/components/OrdersFilterBar.js` |
| `react-native-localize` | 3 | `legacy/utils/Localize.js`, `legacy/components/PhoneInput.js`, `legacy/components/LangPicker.js` |

## Low-Usage Dependencies (consider alternatives)

| Package | Imports | Used In | Notes |
|---|---|---|---|
| `@fleetbase/storefront` | 2 | `use-fleetbase-data.ts`, `location.js` | Remove if storefront features unused |
| `@fortawesome/free-brands-svg-icons` | 1 | `Buttons.tsx` | Small impact, keep |
| `axios` | 2 | `location.js` (Google Geocoding) | Could replace with fetch |
| `inflected` | 1 | `index.js` (only `pluralize`) | Could self-implement |
| `react-native-calendar-strip` | 2 | `DriverOrderManagementScreen.tsx` + legacy | Review if calendar needed |
| `react-native-share` | 1 | `OrderDocumentFiles.tsx` | Feature-required, keep |
| `react-native-maps-directions` | 1 | `LiveOrderRoute.tsx` | Core navigation feature, keep |
| `react-native-background-fetch` | 1 | `LocationContext.tsx` | Background task scheduling, keep |
| `country-locale-map` | 2 | `format.js` + legacy | Feature-required |

## Core Dependencies (widely used, must keep)

| Package | ~Files | Role |
|---|---|---|
| `tamagui` | 93 | UI framework |
| `@fortawesome/free-solid-svg-icons` | 85 | Icon library |
| `@fortawesome/react-native-fontawesome` | 82 | FontAwesome renderer |
| `@react-navigation/native` | 63 | Navigation core |
| `react` / `react-native` | 50+ | Framework |
| `@fleetbase/sdk` | 32 | Fleetbase API |
| `react-native-safe-area-context` | 25 | SafeArea layout |
| `@gorhom/portal` | 18 | Portal overlays |
| `date-fns` | 16 | Date formatting |
| `react-native-fast-image` | 16 | Optimized image loading |
| `@backpackapp-io/react-native-toast` | 14 | Toast notifications |
| `react-native-event-listeners` | 11 | Event bus |
| `react-native-linear-gradient` | 9 | Gradient backgrounds |
| `@gorhom/bottom-sheet` | 8 | Bottom sheet component |
| `react-native-config` | 4 | Env var access |
| `react-native-maps` | 5 | Map rendering |
| `react-native-vision-camera` | 3 | Camera / QR scanning |
| `react-native-collapsible` | 4 | Collapsible sections |
| `react-native-super-grid` | 3 | Grid layout |
| `react-native-mmkv-storage` | 3 | Persistent storage |
| `react-native-device-info` | 3 | Device info display |
| `react-native-permissions` | 4 | Permission handling |
| `react-native-fs` | 5 | File system access |
| `react-native-otp-entry` | 2 | OTP input |
| `react-native-svg` | 2 | SVG rendering |
| `react-native-signature-canvas` | 2 | Digital signature |
| `react-native-image-picker` | 3 | Image selection |
| `react-native-i18n` | 2 | i18n translations |
| `react-native-notifications` | 1 | Push notifications |
| `react-native-background-geolocation` | 1 | Location tracking |
| `react-native-bootsplash` | 2 | Splash screen |
| `socketcluster-client` | 3 | Real-time events |
| `@react-native-community/blur` | 4 | Blur effects |
| `countries-list` | 2 | Country data |
| `language-name-map` | 2 | Language display names |
| `locale-emoji` | 2 | Locale flag emoji |
| `@invertase/react-native-apple-authentication` | 1 | Apple Sign-In |
| `@react-native-google-signin/google-signin` | 1 | Google Sign-In |
| `react-native-fbsdk-next` | 2 | Facebook auth |
| `@react-native-camera-roll/camera-roll` | 2 | Camera roll access |
| `@bam.tech/react-native-image-resizer` | 1 | Image compression |
| `react-native-launch-navigator` | 3 | External nav apps |
| `react-native-file-viewer` | 3 | File preview |
| `react-native-reanimated` | 1 (direct) | Animation (also peer dep) |
