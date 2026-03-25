# React Native Upgrade Analysis

> Generated: 2026-03-16
> Current: react-native 0.77.0-rc.6 + React 18.3.1
> Target: react-native 0.84.1 + React 19.2.4

---

## Upgrade Path Summary

当前版本 `0.77.0-rc.6` 是一个预发布版本，距离最新稳定版 `0.84.1` 跨越了 **7 个 minor 版本**。建议分阶段升级而非直接跳到最新版。

### Recommended Strategy: Incremental Upgrade

```
0.77.0-rc.6 → 0.77.x (stable) → 0.79.x → 0.82.x → 0.84.1
```

Or if confident:
```
0.77.0-rc.6 → 0.84.1 (using React Native Upgrade Helper)
```

Use https://react-native-community.github.io/upgrade-helper/ for diff between versions.

---

## Major Breaking Changes by Version

### React Native 0.78 - 0.79
- New Architecture (Fabric / TurboModules) is now the default
- Legacy `NativeModules` bridge being deprecated
- Metro bundler changes

### React Native 0.80 - 0.82
- React 19 becomes required peer dependency
- Removal of deprecated APIs
- Changes to build tooling (Gradle, Xcode project structure)

### React Native 0.83 - 0.84
- Further New Architecture stabilization
- Updated Kotlin/Gradle requirements for Android
- Updated Xcode/iOS minimum version requirements

### React 18 → React 19
- `useRef` now requires an argument (no implicit `undefined`)
- Cleanup functions in `ref` callbacks
- `Context` usage changes (`Context` vs `Context.Provider`)
- Stricter hydration error handling
- Deprecated APIs removed: `ReactDOM.render`, `ReactDOM.hydrate`

---

## Dependency Version Upgrade Matrix

### High Risk (Major Version Bump Required)

| Package | Current | Target | Risk | Notes |
|---|---|---|---|---|
| **react** | 18.3.1 | **19.2.4** | **HIGH** | Required by RN 0.84. Breaking API changes in useRef, Context, etc. |
| **react-native-reanimated** | 3.16.7 | **4.2.2** | **HIGH** | Major rewrite. API changes in shared values, worklets. Must update before or with RN upgrade. |
| **react-native-mmkv-storage** | ^0.11.0 | **12.0.1** | **HIGH** | Massive version jump. Likely complete API rewrite. Storage migration may be needed. |
| **react-native-permissions** | ^4.1.1 | **5.5.1** | **HIGH** | API changes in permission constants and check methods. |
| **react-native-bootsplash** | ^5.3.0 | **7.1.0** | **HIGH** | 2 major versions. Config and API likely changed significantly. |
| **react-native-background-geolocation** | 4.18.9 | **5.0.3** | **HIGH** | Major version. Config and event API changes. Critical for core app functionality. |

### Medium Risk (Major Bump, Limited Surface Area)

| Package | Current | Target | Risk | Notes |
|---|---|---|---|---|
| **react-native-device-info** | ^14.0.4 | **15.0.2** | MEDIUM | Usually smooth upgrades. Check deprecated methods. |
| **socketcluster-client** | ^19.2.3 | **20.0.1** | MEDIUM | Connection API may change. Affects real-time features. |
| **react-native-signature-canvas** | ^4.7.2 | **5.0.2** | MEDIUM | Used in 2 files only. |
| **react-native-web** | ^0.19.13 | **0.21.2** | MEDIUM | Web platform. Multiple minor improvements. |

### Low Risk (Minor/Patch Updates)

| Package | Current | Target | Notes |
|---|---|---|---|
| @react-navigation/native | ^7.0.0 | 7.1.33 | Patch updates, backward compatible |
| @react-navigation/native-stack | ^7.0.0 | 7.14.5 | Backward compatible |
| @react-navigation/bottom-tabs | ^7.0.1 | 7.15.5 | Backward compatible |
| @react-navigation/elements | ^2.0.0 | 2.9.10 | Backward compatible |
| react-native-gesture-handler | 2.25.0 | 2.30.0 | Minor updates |
| react-native-screens | 4.13.0 | 4.24.0 | Minor updates |
| react-native-safe-area-context | ^5.0.0 | 5.7.0 | Minor updates |
| react-native-svg | 15.12.0 | 15.15.3 | Patch updates |
| @gorhom/bottom-sheet | ^5 | 5.2.8 | Minor updates |
| react-native-maps | 1.26.0 | 1.27.2 | Minor update |
| react-native-vision-camera | ^4.6.4 | 4.7.3 | Minor update |
| react-native-config | ^1.5.3 | 1.6.1 | Minor update |
| react-native-notifications | ^5.1.0 | 5.2.2 | Patch update |
| react-native-image-picker | ^8.2.0 | 8.2.1 | Patch |
| @react-native-camera-roll/camera-roll | ^7.10.0 | 7.10.2 | Patch |
| react-native-share | ^12.0.9 | 12.2.6 | Minor |
| react-native-otp-entry | ^1.7.3 | 1.8.5 | Minor |
| react-native-background-fetch | ^4.2.7 | 4.3.0 | Minor |
| react-native-fbsdk-next | ^13.4.0 | 13.4.3 | Patch |
| @invertase/react-native-apple-authentication | ^2.4.0 | 2.5.1 | Minor |
| @react-native-community/datetimepicker | ^8.2.0 | 8.6.0 | Minor |
| react-native-super-grid | ^6.0.1 | 6.0.2 | Patch |
| react-native-localize | ^3.3.0 | 3.7.0 | Minor |

### Already Up to Date

| Package | Version |
|---|---|
| react-native-fast-image | 8.6.3 |
| react-native-fs | 2.20.0 |
| react-native-linear-gradient | 2.8.3 |
| react-native-maps-directions | 1.9.0 |
| react-native-launch-navigator | 1.0.9 |
| react-native-calendar-strip | 2.2.6 |
| react-native-collapsible | 1.6.2 |
| react-native-i18n | 2.0.15 |
| react-native-event-listeners | 1.0.7 |
| react-native-file-viewer | 2.1.5 |
| @react-native-community/blur | 4.4.1 |
| react-native-get-random-values | 2.0.0 |

### Dev Dependencies

| Package | Current | Target |
|---|---|---|
| typescript | 5.0.4 | **5.9.3** |
| @react-native/metro-config | 0.77.0-rc.6 | **0.84.1** (must match RN) |
| @react-native/babel-preset | 0.77.0-rc.6 | **0.84.1** (must match RN) |
| @react-native/eslint-config | 0.77.0-rc.6 | **0.84.1** (must match RN) |
| @react-native/typescript-config | 0.77.0-rc.6 | **0.84.1** (must match RN) |
| @react-native-community/cli | 15.0.1 | Match RN 0.84 requirements |
| @react-native-community/cli-platform-android | 15.0.1 | Match RN 0.84 requirements |
| @react-native-community/cli-platform-ios | 15.0.1 | Match RN 0.84 requirements |

### Tamagui (Special Case)

| Package | Current | Latest |
|---|---|---|
| tamagui | 1.125.20 | **2.0.0-rc.26** (RC only) |
| @tamagui/config | 1.125.20 | **2.0.0-rc.26** (RC only) |
| @tamagui/babel-plugin | ^1.121.5 | **2.0.0-rc.26** (RC only) |

**Recommendation:** Stay on Tamagui 1.x until 2.0 reaches stable. Tamagui 1.x should work with RN 0.84 / React 19. Verify compatibility before upgrading RN.

---

## Risk Assessment

### Critical Risks

1. **react-native-mmkv-storage 0.11 → 12.0**
   - This is the most dangerous upgrade. The package may have been completely rewritten.
   - All persisted user data (auth tokens, settings, cached resources) uses MMKV.
   - **Risk:** Data loss or app crash on upgrade if storage format changed.
   - **Mitigation:** Write migration logic. Test with real user data. Consider switching to `react-native-mmkv` (by mrousavy) which is more actively maintained and may be what v12 actually is.

2. **React 18 → 19**
   - `useRef` calls without arguments will need updating.
   - Context.Provider pattern changes.
   - All 50+ files using React will need review.
   - **Risk:** Runtime crashes from API changes.
   - **Mitigation:** Use React 19 codemod tools. Audit all useRef and Context usage.

3. **react-native-reanimated 3 → 4**
   - Shared value and worklet API changes.
   - Direct usage is minimal (1 file), but @gorhom/bottom-sheet depends on it.
   - **Risk:** Bottom sheet and animations may break.
   - **Mitigation:** Upgrade reanimated together with bottom-sheet. Test all bottom sheet interactions.

4. **react-native-background-geolocation 4 → 5**
   - Core tracking functionality.
   - Config format and event handling may change.
   - **Risk:** Location tracking stops working silently.
   - **Mitigation:** Thorough testing of background tracking on both platforms.

### Medium Risks

5. **Tamagui compatibility with React 19**
   - Tamagui 1.x was built for React 18. May have issues with React 19 internals.
   - 93 files use Tamagui — any incompatibility is widespread.
   - **Mitigation:** Test Tamagui 1.x with React 19 in isolation first. If issues, may need Tamagui 2.0-rc.

6. **Native build configuration changes**
   - Android: Gradle version, Kotlin version, AGP version requirements change with each RN version.
   - iOS: Xcode minimum version, minimum iOS deployment target may increase.
   - Podfile and build.gradle changes are manual and error-prone.
   - **Mitigation:** Use React Native Upgrade Helper for exact file diffs.

7. **Patched packages in resolutions**
   - `react-native-i18n`, `react-native-launch-navigator`, `react-native-notifications` have yarn patches.
   - Patches may conflict with new versions.
   - **Mitigation:** Review if patches are still needed after upgrade.

### Low Risks

8. **react-native-fast-image** is unmaintained (last release 2022). Works now but may break with future RN versions. Consider migrating to `expo-image` or RN's built-in `Image` with `cache` prop.

9. **react-native-snap-carousel** is unmaintained. Already has 0 imports — safe to remove before upgrade.

---

## Recommended Upgrade Order

### Phase 1: Pre-upgrade Cleanup
1. Remove unused dependencies (see dependency-analysis.md)
2. Remove legacy code that is no longer imported from modern code
3. Ensure all tests pass on current version
4. Pin all dependency versions (remove `^` for critical packages)

### Phase 2: React Native 0.77 Stable
1. Move from `0.77.0-rc.6` to latest `0.77.x` stable
2. Update all `@react-native/*` dev packages to match
3. Fix any immediate issues
4. Verify both iOS and Android builds

### Phase 3: React Native + React Upgrade
1. Upgrade to target RN version using Upgrade Helper
2. Upgrade React to 19.x simultaneously
3. Run React 19 codemods for useRef and other breaking changes
4. Update `@react-native/*` dev packages to match new RN version
5. Update Gradle/Kotlin/AGP for Android
6. Update Podfile and iOS config
7. Rebuild pods: `yarn pod:reset`

### Phase 4: Dependency Updates (High Risk)
1. `react-native-reanimated` 3 → 4 (with @gorhom/bottom-sheet compatibility check)
2. `react-native-mmkv-storage` — evaluate migration to `react-native-mmkv` or update to v12
3. `react-native-permissions` 4 → 5
4. `react-native-background-geolocation` 4 → 5
5. `react-native-bootsplash` 5 → 7

### Phase 5: Dependency Updates (Low Risk)
1. All minor/patch version updates from the matrix above
2. TypeScript 5.0 → 5.9
3. Dev dependency updates

### Phase 6: Verification
1. Full iOS build + run on simulator
2. Full Android build + run on simulator/device
3. Test critical flows: login, order management, location tracking, chat, proof of delivery
4. Test background geolocation
5. Test push notifications on both platforms
6. Web build verification (`yarn web`)
