# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleetbase Navigator is a React Native mobile app (iOS, Android, and web) for drivers and agents. It provides order management, geolocation tracking, navigation, fuel reports, issue tracking, chat, and proof-of-delivery features. Built on the Fleetbase platform using `@fleetbase/sdk`.

## Commands

```bash
# Install dependencies
yarn

# Start Metro bundler
yarn start

# Run on iOS/Android simulators
yarn ios
yarn android

# Run on web (webpack)
yarn web

# Install iOS pods (New Architecture enabled)
yarn pod:install

# Full reset (node_modules + pods)
yarn reset

# Tests
yarn test

# Lint & format
yarn lint
yarn format

# Android
yarn android:clean    # gradlew clean
yarn adb:reverse      # reverse tcp for metro
```

## Architecture

### App Entry & Provider Stack

`App.tsx` wraps the app in a deep provider hierarchy (order matters):
PortalProvider > ThemeProvider > TamaguiProvider > GestureHandler > SafeArea > BottomSheet > ConfigProvider > NotificationProvider > LanguageProvider > AuthProvider > SocketClusterProvider > LocationProvider > TempStoreProvider > ChatProvider > OrderManagerProvider > AppNavigator

### Navigation (React Navigation v7, Static API)

- `src/navigation/AppNavigator.tsx` — Root stack: Boot, LocationPermission, InstanceLink, Auth screens, and the authenticated DriverNavigator
- `src/navigation/DriverNavigator.tsx` — Bottom tab navigator with 5 tabs (Dashboard, Orders/Tasks, Reports, Chat, Account). Each tab is its own native stack. Tabs are configurable via `navigator.config.ts` and env vars.
- `src/navigation/stacks/AuthStack.tsx` — Login, phone auth, account creation flows
- `src/navigation/stacks/CoreStack.tsx` — Boot, location permission, instance linking screens

### Contexts (`src/contexts/`)

- **AuthContext** — Driver auth state (login, verify, session restore), uses reducer pattern. Stores driver token as `_driver_token`.
- **ConfigContext** — Resolves connection config (Fleetbase host/key, SocketCluster) from env vars or instance-linked overrides stored in MMKV.
- **LanguageContext** — i18n via `react-native-i18n`. Locale files in `src/locales/`. Uses `t()` for translations.
- **LocationContext** — Background geolocation tracking
- **ChatContext** — Chat channels and unread counts
- **OrderManagerContext** — Active orders state
- **SocketClusterContext** — Real-time events (has `.native.tsx` and `.web.tsx` platform variants)
- **ThemeContext** — Dark/light mode
- **TempStoreContext** — Ephemeral cross-screen data passing
- **NotificationContext** — Push notifications and device token

### UI Framework

Uses **Tamagui** for styling and theming. Config in `tamagui.config.ts` with Tailwind-inspired color tokens. Theme colors are customizable via env vars (`CUSTOM_COLORS`, `CUSTOM_COLORS_DARK`, `CUSTOM_COLORS_LIGHT`). Icons via `@fortawesome/react-native-fontawesome`.

### Configuration System

Two-tier config: `.env` (via `react-native-config`) and `navigator.config.ts` (via `config/default.js`).
- `.env` — API keys, hosts, app name/identifier, feature flags, tab labels, theme
- `navigator.config.ts` — Structured config (tabs, default locale, colors) built from env vars with `createNavigatorConfig()`
- **Instance Linking** — Users can dynamically link to a different Fleetbase instance at runtime; overrides are stored in MMKV via ConfigContext

### Storage

Uses `react-native-mmkv-storage` for persistent key-value storage. The `useStorage` hook provides React state backed by MMKV.

### Fleetbase SDK Integration

`useFleetbase` hook initializes `@fleetbase/sdk` with either an auth token (for authenticated drivers) or the API key from config. Provides `fleetbase` client and `adapter` for API calls.

### Legacy Code

`src/legacy/` contains the previous v1 implementation (plain JS, Tailwind via NativeWind). Some legacy components and utilities are still imported. New code should use the modern TypeScript + Tamagui patterns in `src/`.

### Platform Differences

Some modules have platform-specific variants using React Native's file extension resolution:
- `SocketClusterContext.native.tsx` / `SocketClusterContext.web.tsx`
- `tsconfig.json` paths: `*.native` / `*.web` resolution

## Environment Variables

Key env vars (see `.env.example`):
- `FLEETBASE_HOST`, `FLEETBASE_KEY` — Fleetbase API connection
- `GOOGLE_MAPS_API_KEY` — Maps
- `APP_NAME`, `APP_IDENTIFIER`, `APP_LINK_PREFIX` — App identity
- `DEFAULT_COORDINATES` — Fallback map center
- Tab/theme customization: `DRIVER_NAVIGATOR_TABS`, `DRIVER_DASHBOARD_TAB_LABEL`, `APP_THEME`, etc.

## Tech Stack

- React Native 0.77 (New Architecture enabled)
- React Navigation 7 (static API)
- Tamagui for styling/theming
- `@fleetbase/sdk` for API
- SocketCluster for real-time events
- MMKV for storage
- react-native-background-geolocation for tracking
- TypeScript (new code) + JavaScript (legacy code)
