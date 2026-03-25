# React Native Upgrade Sprint Plan

> Target: 0.77.0-rc.6 → 0.84.1 (latest stable)
> Estimated: 3 sprints (each ~1 week), total 3-4 weeks

---

## Current Baseline

| Component | Current | Target |
|---|---|---|
| react-native | 0.77.0-rc.6 | 0.84.1 |
| react | 18.3.1 | 19.2.4 |
| typescript | 5.0.4 | 5.9.3 |
| Gradle | 8.10.2 | Match RN 0.84 requirement |
| AGP | 8.7.2 | Match RN 0.84 requirement |
| Kotlin | 2.0.21 | Match RN 0.84 requirement |
| compileSdk / targetSdk | 35 | 35+ (per RN 0.84) |
| minSdk | 24 | 24 (keep) |
| iOS min deployment | 12.0 | 15.1+ (RN 0.84 may require) |
| Hermes | Enabled | Enabled |
| New Architecture | Enabled | Enabled |
| @react-native/* dev pkgs | 0.77.0-rc.6 | 0.84.1 |

---

## Sprint 0: Prep (Day 1-2)

> Goal: 清理代码库，减少升级变量

### Task 0.1: Remove Unused Dependencies
- [ ] Remove `add` from package.json
- [ ] Remove `crypto-browserify`
- [ ] Remove `react-native-render-html`
- [ ] Remove `react-native-webview`
- [ ] Remove `react-redux`
- [ ] Remove `recyclerlistview`
- [ ] Remove `react-native-snap-carousel`
- [ ] Remove `react-native-haptic-feedback`
- [ ] Remove `react-native-keychain`
- [ ] Remove `yarn` (from dependencies)
- [ ] Run `yarn install` to clean lock file
- [ ] Verify app builds and runs (iOS + Android)

### Task 0.2: Fix Existing Issues
- [ ] Clean up google-services.json git state (`git reset HEAD android/google-services.json`)
- [ ] Verify `settings.gradle` duplicate `includeBuild` removal works ✅ done
- [ ] Ensure current codebase builds cleanly on both platforms before starting upgrade

### Task 0.3: Create Upgrade Branch
- [ ] `git checkout -b upgrade/rn-0.84`
- [ ] Commit clean state as baseline

---

## Sprint 1: Core RN + React Upgrade (Week 1)

> Goal: RN 0.84 + React 19 编译通过，App 可启动

### Task 1.1: Upgrade React Native + React (Day 1-2)

Use React Native Upgrade Helper (https://react-native-community.github.io/upgrade-helper/) to diff 0.77.0 → 0.84.1.

- [ ] Update `package.json`:
  ```
  react-native: 0.84.1
  react: 19.2.4
  react-dom: 19.2.4
  ```
- [ ] Update all `@react-native/*` dev packages to 0.84.1:
  ```
  @react-native/babel-preset: 0.84.1
  @react-native/metro-config: 0.84.1
  @react-native/eslint-config: 0.84.1
  @react-native/typescript-config: 0.84.1
  ```
- [ ] Update `@react-native-community/cli*` packages to version matching RN 0.84
- [ ] Run `yarn install`

### Task 1.2: Android Native Config (Day 2-3)

Apply changes from Upgrade Helper diff:

- [ ] Update `android/gradle/wrapper/gradle-wrapper.properties` (Gradle version per RN 0.84)
- [ ] Update `android/build.gradle` (AGP, Kotlin version per RN 0.84)
- [ ] Update `android/app/build.gradle` (compileSdk, targetSdk, any new config)
- [ ] Update `android/gradle.properties` (new RN properties if needed)
- [ ] Update `android/settings.gradle` if template changed
- [ ] Verify: `cd android && ./gradlew assembleDebug`

### Task 1.3: iOS Native Config (Day 3-4)

- [ ] Update `ios/Podfile` per Upgrade Helper diff
- [ ] Update minimum iOS deployment target if RN 0.84 requires > 12.0
- [ ] Run `yarn pod:reset` (full pod reinstall)
- [ ] Open Xcode, check for project.pbxproj changes needed
- [ ] Verify: `yarn ios` on simulator

### Task 1.4: React 19 Breaking Changes (Day 4-5)

Audit and fix all React 19 breaking changes:

- [ ] **useRef**: Search all `useRef()` calls without arguments → add explicit `useRef(null)`
  ```bash
  grep -rn "useRef()" src/ --include="*.tsx" --include="*.ts"
  ```
- [ ] **Context**: Check for deprecated `Context.Provider` patterns
  ```bash
  grep -rn "\.Provider" src/ --include="*.tsx" --include="*.ts"
  ```
- [ ] **ref callbacks**: Check for cleanup function requirements
- [ ] **Removed APIs**: Search for any deprecated React 18 APIs
- [ ] Run TypeScript check: `npx tsc --noEmit`

### Task 1.5: Smoke Test
- [ ] App launches on iOS simulator
- [ ] App launches on Android emulator
- [ ] Boot screen loads
- [ ] Can navigate to login screen
- [ ] No red screen / crash on launch

**Sprint 1 Gate:** App compiles and launches on both platforms. Red screens and crashes fixed.

---

## Sprint 2: Dependency Upgrades (Week 2)

> Goal: 所有依赖更新到兼容版本，核心功能可用

### Task 2.1: High-Risk Upgrades (Day 1-3)

**One at a time, build-test after each:**

- [ ] **react-native-reanimated** 3.16.7 → 4.x
  - Update babel.config.js if plugin config changed
  - Run pod install
  - Test: bottom sheet opens/closes, animations smooth

- [ ] **react-native-mmkv-storage** 0.11 → latest
  - **CRITICAL:** Check if API changed (may need to migrate to `react-native-mmkv` by mrousavy)
  - Write storage migration if data format changed
  - Test: app data persists after update, login session survives

- [ ] **react-native-permissions** 4.x → 5.x
  - Update permission constants (API change)
  - Update `ios/Podfile` permission pods if needed
  - Test: location permission, camera permission, notification permission

- [ ] **react-native-background-geolocation** 4.18.9 → 5.x
  - Review changelog for config changes
  - Update LocationContext.tsx
  - Test: background tracking starts, location updates received, battery behavior

- [ ] **react-native-bootsplash** 5.x → 7.x
  - Regenerate assets if CLI changed: `npx react-native generate-bootsplash`
  - Update BootScreen.tsx
  - Test: splash screen shows and dismisses correctly

### Task 2.2: Medium-Risk Upgrades (Day 3-4)

- [ ] **react-native-device-info** 14 → 15
- [ ] **socketcluster-client** 19 → 20
  - Test: real-time events work (order updates, chat messages)
- [ ] **react-native-signature-canvas** 4 → 5
  - Test: signature pad in proof of delivery
- [ ] **react-native-web** 0.19 → 0.21
  - Test: `yarn web` builds and runs

### Task 2.3: Low-Risk Batch Upgrade (Day 4-5)

All minor/patch updates in one batch:

- [ ] @react-navigation/* (7.0 → 7.latest)
- [ ] react-native-gesture-handler 2.25 → 2.30
- [ ] react-native-screens 4.13 → 4.24
- [ ] react-native-safe-area-context 5.0 → 5.7
- [ ] react-native-svg 15.12 → 15.15
- [ ] @gorhom/bottom-sheet 5.x → 5.2.8
- [ ] react-native-maps 1.26 → 1.27
- [ ] react-native-vision-camera 4.6 → 4.7
- [ ] react-native-config 1.5 → 1.6
- [ ] react-native-notifications 5.1 → 5.2
- [ ] react-native-image-picker 8.2.0 → 8.2.1
- [ ] react-native-share 12.0 → 12.2
- [ ] react-native-otp-entry 1.7 → 1.8
- [ ] react-native-background-fetch 4.2 → 4.3
- [ ] react-native-fbsdk-next 13.4.0 → 13.4.3
- [ ] @invertase/react-native-apple-authentication 2.4 → 2.5
- [ ] @react-native-community/datetimepicker 8.2 → 8.6
- [ ] react-native-localize 3.3 → 3.7
- [ ] Run `yarn install && yarn pod:reset`
- [ ] Verify build on both platforms

### Task 2.4: Dev Dependencies
- [ ] TypeScript 5.0.4 → 5.9.3
- [ ] Run `npx tsc --noEmit` — fix any new type errors
- [ ] Update eslint/prettier if needed

**Sprint 2 Gate:** All dependencies updated. Build passes. Core screens render without crashes.

---

## Sprint 3: Verification & Stabilization (Week 3)

> Goal: 全功能回归测试，修复兼容性问题，合并

### Task 3.1: Yarn Patches Review (Day 1)
- [ ] Check if `react-native-i18n` patch still applies
- [ ] Check if `react-native-launch-navigator` patch still applies
- [ ] Check if `react-native-notifications` patch still applies
- [ ] Remove patches that are no longer needed (fixed upstream)

### Task 3.2: Tamagui Compatibility (Day 1-2)
- [ ] Verify Tamagui 1.125.20 works with React 19
- [ ] If issues: try latest Tamagui 1.x
- [ ] If still issues: evaluate Tamagui 2.0-rc
- [ ] Test: theme switching, custom colors, responsive layouts

### Task 3.3: Feature Regression Testing (Day 2-4)

**Auth Flows:**
- [ ] Email/password login
- [ ] Phone OTP login + verify
- [ ] Google Sign-In
- [ ] Apple Sign-In
- [ ] Facebook login
- [ ] Account creation flow
- [ ] Session restore (kill app, reopen → still logged in)

**Core Driver Features:**
- [ ] Dashboard loads with metrics
- [ ] Order list loads
- [ ] Order detail screen — all tabs/sections render
- [ ] Accept/start/complete order flow
- [ ] Order activity selection (bottom sheet)
- [ ] Current destination select

**Maps & Navigation:**
- [ ] Map renders with driver marker
- [ ] Live order route displays
- [ ] Directions render on map
- [ ] Launch external navigator (Waze/Google Maps)
- [ ] Edit location coordinates

**Background Services:**
- [ ] Background geolocation tracking (leave app, drive, check server receives locations)
- [ ] Push notifications received (iOS + Android)
- [ ] SocketCluster events received (order updates in real-time)

**Media & Files:**
- [ ] Camera capture (photo)
- [ ] QR code scanning
- [ ] Image picker from gallery
- [ ] Document file viewing
- [ ] Document sharing
- [ ] Signature canvas (proof of delivery)

**Chat:**
- [ ] Chat channel list loads
- [ ] Send/receive messages
- [ ] Unread counts update
- [ ] Create new channel

**Account & Settings:**
- [ ] Profile view/edit
- [ ] Avatar upload
- [ ] Language switching
- [ ] Fuel report creation
- [ ] Issue reporting

**Web:**
- [ ] `yarn web` builds without errors
- [ ] Basic screens render in browser

### Task 3.4: Performance Check (Day 4)
- [ ] App startup time acceptable
- [ ] No memory leaks on order list scroll
- [ ] Map interactions smooth (pan/zoom)
- [ ] Bottom sheet animations smooth
- [ ] No excessive re-renders (React DevTools profiler)

### Task 3.5: Platform-Specific Verification (Day 4-5)
- [ ] iOS release build: `yarn ios --configuration Release`
- [ ] Android release build: `cd android && ./gradlew assembleRelease`
- [ ] Both APK/IPA install and run on physical device
- [ ] Deep links work (`APP_LINK_PREFIX`)
- [ ] Crash reporting (if configured) works

### Task 3.6: Merge & Tag (Day 5)
- [ ] Squash-merge or merge `upgrade/rn-0.84` → `main`
- [ ] Tag release: `git tag v2.1.0-rn84`
- [ ] Update CLAUDE.md if any architecture/config changed

**Sprint 3 Gate:** All regression tests pass. Release builds succeed. Ready for app store submission.

---

## Rollback Plan

If upgrade hits a blocker at any point:

1. **Sprint 1 blocker** (RN won't compile): Check Upgrade Helper diff more carefully. Can fallback to intermediate version (e.g., 0.80 or 0.82).
2. **Sprint 2 blocker** (specific dependency incompatible): Pin that dependency at old version temporarily, file issue upstream, continue with rest of upgrade.
3. **Sprint 3 blocker** (runtime regression): Bisect by reverting Sprint 2 dependency upgrades one at a time to isolate.

The upgrade branch keeps `main` safe at all times.

---

## Risk Mitigation Checklist

- [ ] Upgrade branch created before any changes
- [ ] Each high-risk dependency upgraded in its own commit (easy to revert)
- [ ] Build verified after each high-risk change
- [ ] Physical device testing before merge (simulators miss real issues)
- [ ] Background geolocation tested with real driving/walking (not just simulator)
- [ ] MMKV storage migration tested with existing user data
- [ ] All 3 yarn patches verified or removed
