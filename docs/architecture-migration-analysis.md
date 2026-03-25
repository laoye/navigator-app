# Architecture Migration Analysis

> Generated: 2026-03-25
> Current: React Native 0.77 (New Architecture) + Tamagui
> Codebase: ~31,000 LOC, 220 files (136 modern TS + 71 legacy JS)

---

## Current Project Profile

| Dimension | Detail |
|---|---|
| Platforms | iOS, Android, Web |
| Heavy Native Deps | Background geolocation, camera, maps, push notifications, MMKV storage, file system |
| Real-time | SocketCluster (WebSocket) |
| UI Framework | Tamagui (93 files) |
| Auth | Phone OTP, Facebook, Google, Apple Sign-In |
| Core Features | Order management, GPS tracking, turn-by-turn navigation, chat, proof of delivery, fuel reports |
| Target Users | Drivers/agents in the field |

### Key Constraint: Deep Native Dependencies

19 个文件直接依赖重度原生模块：
- Background geolocation tracking (后台持续运行)
- Camera / QR scanning
- Native maps + directions
- Push notifications
- Secure/persistent storage (MMKV)
- Launch external navigator apps (Waze, Google Maps)

---

## Alternative Architecture Options

### Option 1: Expo (Managed + Custom Dev Client)

**概述：** 不是换框架，而是在 React Native 之上加一层 Expo 管理。代码几乎不用改。

| Item | Detail |
|---|---|
| 代码复用率 | **~95%** |
| 迁移周期 | 2-4 周 |
| 学习成本 | 低 (同一生态) |
| Web 支持 | 优秀 (expo-router) |

**优势：**
- OTA 更新 (EAS Update)，无需发 App Store 审核
- 统一的构建服务 (EAS Build)，告别本地 Xcode/Gradle 配置痛苦
- Expo SDK 替代多个碎片化原生库 (expo-camera, expo-location, expo-notifications 等)
- 持续引用 config plugins 简化原生代码管理
- 社区活跃度最高，更新最快

**需要替换的库：**
| 当前 | Expo 替代 | 难度 |
|---|---|---|
| react-native-background-geolocation | expo-location + expo-task-manager | **HIGH** — expo-location 后台功能弱于专业库 |
| react-native-vision-camera | expo-camera | LOW |
| react-native-maps | react-native-maps (Expo 兼容) | LOW |
| react-native-notifications | expo-notifications | MEDIUM |
| react-native-image-picker | expo-image-picker | LOW |
| react-native-config | expo-constants + app.config.js | LOW |
| react-native-bootsplash | expo-splash-screen | LOW |
| react-native-permissions | expo module APIs (built-in) | LOW |
| react-native-fast-image | expo-image | LOW |
| react-native-mmkv-storage | expo-secure-store or 保留 MMKV | LOW |

**风险：**
- `react-native-background-geolocation` 是商业库，功能极其丰富（geofencing、activity recognition、motion detection）。Expo 的 `expo-location` + `expo-task-manager` **无法完全覆盖**其功能。如果后台追踪是核心功能，可能需要保留此库并使用 Expo Dev Client (custom native code)。
- Tamagui 与 Expo 兼容良好，无需更换。

**结论：** 推荐度 ★★★★★ — 迁移成本最低，收益最大。是 React Native 项目的 "自然进化"。

---

### Option 2: Flutter

**概述：** Google 的跨平台框架，Dart 语言，自绘 UI 引擎。

| Item | Detail |
|---|---|
| 代码复用率 | **0%** (完全重写) |
| 迁移周期 | 4-6 个月 |
| 学习成本 | 高 (新语言 Dart + 新框架) |
| Web 支持 | 中等 (Flutter Web 性能和 SEO 不如原生) |

**优势：**
- 自绘引擎，UI 在所有平台完全一致
- 性能优于 RN（无 JS Bridge，直接编译 ARM）
- 热重载体验优秀
- Google Maps 深度集成
- 类型安全 (Dart 语言内置)

**劣势：**
- **所有 31,000 行代码需要用 Dart 重写**
- Dart 生态远小于 JS/TS 生态
- `@fleetbase/sdk` 是 JS 库，需要重写一个 Dart 版 SDK 或通过 REST 直接调用
- SocketCluster 没有官方 Dart 客户端，需要自己实现或用 WebSocket 重写
- 团队需要学习一门新语言
- Flutter Web 的包体积大、SEO 差（对司机 App 影响不大）

**Flutter 原生库替代：**
| 功能 | Flutter 包 | 成熟度 |
|---|---|---|
| Background location | `flutter_background_geolocation` (Transistor Software, 同一作者) | 优秀 |
| Maps | `google_maps_flutter` | 优秀 |
| Camera | `camera` | 良好 |
| Push notifications | `firebase_messaging` | 优秀 |
| Storage | `hive` / `shared_preferences` | 优秀 |
| WebSocket | `web_socket_channel` | 良好 |

**结论：** 推荐度 ★★☆☆☆ — 除非团队已有 Flutter 经验，否则不建议。重写成本极高，且 Fleetbase SDK 的 Dart 版不存在。

---

### Option 3: Kotlin Multiplatform (KMP) + SwiftUI/Compose

**概述：** 共享业务逻辑层 (Kotlin)，UI 各平台原生 (SwiftUI on iOS, Jetpack Compose on Android)。

| Item | Detail |
|---|---|
| 代码复用率 | **0% UI / ~30% 逻辑** (可移植部分业务逻辑) |
| 迁移周期 | 6-9 个月 |
| 学习成本 | 非常高 (Kotlin + Swift + 两套 UI) |
| Web 支持 | 差 (需要第三套前端) |

**优势：**
- 最原生的体验，性能最好
- 各平台能充分利用最新系统 API
- 后台 geolocation 直接用原生 API，无第三方库限制
- App 体积最小

**劣势：**
- **需要维护两套 UI 代码** (SwiftUI + Compose)
- Web 端需要完全独立的实现（你们目前支持 Web）
- 开发效率低于跨平台方案 (每个功能写两次 UI)
- 团队需要掌握 Kotlin 和 Swift 两门语言
- Fleetbase SDK 需要 Kotlin 移植

**结论：** 推荐度 ★☆☆☆☆ — 适合大团队、高性能要求的场景。对于一个司机端 App，投入产出比太低。

---

### Option 4: Progressive Web App (PWA)

**概述：** 纯 Web 技术 (React/Next.js)，通过 Service Worker 实现离线和推送。

| Item | Detail |
|---|---|
| 代码复用率 | **~40%** (React 组件逻辑可复用，原生部分全部重写) |
| 迁移周期 | 3-5 个月 |
| 学习成本 | 低 (已有 React/TS 技能) |
| Web 支持 | 原生 Web |

**优势：**
- 无 App Store 审核
- 一套代码所有平台
- 更新即时生效
- 已有 Web 支持基础

**劣势：**
- **致命问题：无法后台 GPS 追踪** — PWA 的 Background Geolocation API 极其有限（浏览器限制），这是你们的核心功能
- 无法访问 Camera Roll、文件系统
- Push notification 支持不完整 (iOS Safari 限制)
- 无法调用外部导航 App
- 性能不如原生
- 地图体验不如原生 SDK

**结论：** 推荐度 ☆☆☆☆☆ — **不适合此项目**。后台 GPS 追踪是核心需求，PWA 无法满足。

---

### Option 5: 留在 React Native，升级 + 清理

**概述：** 不迁移框架，而是升级到 RN 0.84 + 清理 legacy 代码 + 现代化工具链。

| Item | Detail |
|---|---|
| 代码复用率 | **100%** |
| 迁移周期 | 2-4 周 (分阶段升级) |
| 学习成本 | 无 |
| Web 支持 | 保持现状 |

**具体工作：**
1. 删除 10 个未使用依赖
2. 升级 RN 0.77-rc → 0.84.1 (见 react-native-upgrade-analysis.md)
3. 迁移 legacy JS → TypeScript (71 个文件)
4. 用 `react-native-mmkv` (mrousavy) 替换旧的 `react-native-mmkv-storage`
5. TypeScript 5.0 → 5.9

**结论：** 推荐度 ★★★★☆ — 风险最低，但不解决构建工具链的痛点。

---

### Option 6: uni-app (DCloud)

**概述：** 国内 DCloud 推出的跨平台框架，基于 Vue.js，可编译到 iOS、Android、Web、以及各种小程序（微信/支付宝/抖音等）。

| Item | Detail |
|---|---|
| 代码复用率 | **0%** (完全重写，React → Vue) |
| 迁移周期 | 3-5 个月 |
| 学习成本 | 中 (Vue.js + uni-app 特有 API) |
| Web 支持 | 优秀 |
| 小程序支持 | 最强 (独有优势) |

**优势：**
- **小程序覆盖** — 一套代码编译到微信/支付宝/抖音/百度小程序，这是其他方案都做不到的
- 国内生态成熟，中文文档完善
- HBuilderX IDE + 云打包，降低原生构建门槛
- uni.getLocation / uni.startLocationUpdate 等统一 API
- 插件市场有大量国内常用组件（支付、地图、IM）
- 原生渲染 (uni-app x, 2024+) 性能接近原生

**劣势 — 对此项目有致命问题：**

1. **@fleetbase/sdk 不可用** — Fleetbase SDK 是 JS npm 包，理论上 Vue 项目能用，但 uni-app 的运行时环境与标准浏览器/Node.js 不同，npm 包兼容性经常出问题。SDK 内部如果依赖了 XMLHttpRequest、fetch、WebSocket 等 API，在 uni-app 环境需要大量适配 (uni.request 替代 fetch)。
2. **SocketCluster 客户端不兼容** — `socketcluster-client` 依赖标准 WebSocket API，uni-app 的 WebSocket 是 `uni.connectSocket`，API 完全不同。需要重写或找一个 uni-app 适配层。
3. **后台 GPS 追踪受限** — uni-app 的后台定位依赖各平台原生插件：
   - iOS: 需要原生插件 + 后台模式配置，uni-app 生态中没有与 `react-native-background-geolocation` (Transistor Software) 同等质量的方案
   - Android: 各厂商后台限制不同，uni-app 原生插件碎片化严重
   - **对于一个核心功能是 "司机持续后台追踪" 的 App，这是重大风险**
4. **国际化生态弱** — Fleetbase 是国际化产品，uni-app 的插件市场和社区主要面向国内开发者。国际 SDK (Google Sign-In, Apple Auth, Facebook SDK) 在 uni-app 中支持有限，需要写原生插件桥接。
5. **TypeScript 支持弱** — uni-app 对 TS 的支持不如 RN/Flutter 成熟，类型推导和 IDE 体验差距较大。你们项目正在从 JS 迁移到 TS，这是逆向的。
6. **Tamagui 不可用** — 93 个文件的 UI 框架全部废弃，需要用 uni-ui 或 uView 重写。
7. **react-navigation 模式不可迁移** — uni-app 使用 pages.json 声明式路由，与 React Navigation 的命令式导航完全不同。

**uni-app 适合的场景 vs 你们的场景：**
| 场景 | uni-app | 你们的项目 |
|---|---|---|
| 需要微信/支付宝小程序 | ✅ 最佳选择 | ❌ 不需要小程序 |
| 国内用户为主 | ✅ 生态优势 | ❌ 国际化产品 |
| 轻量级 App (电商/内容/工具) | ✅ 开发快 | ❌ 重度原生依赖 |
| 后台持续运行 (GPS/音乐) | ⚠️ 需要原生插件 | ❌ 核心需求，风险高 |
| 已有 npm 生态依赖 | ⚠️ 兼容性问题多 | ❌ 依赖 @fleetbase/sdk |

**结论：** 推荐度 ★☆☆☆☆ — **不适合此项目**。uni-app 的核心优势是小程序多端覆盖，但 Navigator App 不需要小程序。同时，Fleetbase SDK / SocketCluster 的兼容性问题、后台 GPS 追踪的插件质量、国际化 OAuth 支持的缺失，都是此项目的致命障碍。如果未来 Fleetbase 需要做国内市场的微信小程序版本，uni-app 可以作为小程序端的独立补充，但不应作为主 App 的替代方案。

---

## Comparison Matrix

| Dimension | Expo (1) | Flutter (2) | KMP (3) | PWA (4) | Stay RN (5) | uni-app (6) |
|---|---|---|---|---|---|---|
| **代码重写量** | ~5% | 100% | 100%+ | ~60% | 0% | 100% |
| **迁移周期** | 2-4 周 | 4-6 月 | 6-9 月 | 3-5 月 | 2-4 周 | 3-5 月 |
| **后台 GPS** | ✅ (Dev Client) | ✅ | ✅ | ❌ | ✅ | ⚠️ 插件质量差 |
| **OTA 更新** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ (wgt 热更新) |
| **构建简化** | ✅ (EAS) | 中等 | ❌ | ✅ | ❌ | ✅ (云打包) |
| **Web 支持** | ✅ | 中等 | ❌ | ✅ | ✅ | ✅ |
| **小程序** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 最强 |
| **学习成本** | 低 | 高 | 很高 | 低 | 无 | 中 (Vue) |
| **国际生态** | 最好 | 良好 | 一般 | 最大 | 好 | 弱 (国内为主) |
| **Fleetbase SDK** | ✅ 直接用 | ❌ 重写 | ❌ 重写 | ✅ 直接用 | ✅ 直接用 | ⚠️ 需适配 |
| **SocketCluster** | ✅ 直接用 | ❌ 重写 | ❌ 重写 | ✅ 直接用 | ✅ 直接用 | ❌ 需重写 |
| **长期维护成本** | 低 | 中 | 高 | 低 | 中 | 中 |

---

## Recommendation

### 首选：Option 1 — 迁移到 Expo

**理由：**
1. **代价最小** — 现有代码 95% 可复用，不需要换语言
2. **解决核心痛点** — EAS Build 消除本地构建环境问题，OTA 更新加速发布
3. **渐进式迁移** — 可以先 `npx expo install` 适配，再逐步替换原生库为 Expo SDK
4. **后台追踪方案** — 使用 Expo Dev Client + 保留 `react-native-background-geolocation`（该库支持 Expo config plugin）
5. **Tamagui 完全兼容** — 不需要更换 UI 框架

**迁移路径：**
```
Phase 1 (Week 1):   npx expo init → 配置 app.config.js → EAS Build 验证
Phase 2 (Week 2):   替换简单库 (camera, image-picker, splash, config)
Phase 3 (Week 3):   配置 expo-notifications, expo-location
Phase 4 (Week 4):   Dev Client 配置 (保留 background-geolocation)
                    清理旧原生配置, 端到端测试
```

### 次选：Option 5 — 留在 RN + 升级清理

如果团队不想引入 Expo，直接升级到 RN 0.84 + 清理代码也是合理选择，只是会失去 EAS Build 和 OTA 更新的便利。

### 不建议：Flutter / KMP / PWA

- Flutter/KMP 需要完全重写且 Fleetbase SDK 无 Dart/Kotlin 版本
- PWA 无法支持后台 GPS 追踪这一核心功能
