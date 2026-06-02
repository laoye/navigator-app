# 上线/内测前置准备清单

本文档列出 ForBox Staff App **首次**走出 dev 环境(往 TestFlight / Play 内部测试 / 公测分发)之前,**代码外**必须在各家平台控制台完成的配置步骤,以及每一步要填的具体字段。

> **不在本文档范围:** 代码层面的改动(bundle ID / 显示名 / 深链等已在 `e097144` 提交中完成);后续的版本发布操作流程;后端 Fleetbase 的部署。

---

## 0. 身份标识参考

下面这些值是 **canonical**——任何平台控制台问到都用它们,不要再编新的:

| 项 | 值 |
|---|---|
| Bundle ID / Android `applicationId` | `com.forboxexpress.staff` |
| Display name | `ForBox Staff` |
| URL Scheme(深链) | `forboxstaff` |
| iOS 最低版本 | iOS 15.1(`IPHONEOS_DEPLOYMENT_TARGET = 15.1`) |
| iOS 类目 | Navigation(`public.app-category.navigation`) |
| 当前 marketing version | 2.0.5 |
| 当前 build number(iOS) | 11 |
| Apple `DEVELOPMENT_TEAM` (当前 pbxproj 写的) | `W4M54N7H85` —— **⚠️ 来自 Fleetbase 原 fork,务必核对/替换为 ForBox 自己的 Team ID** |

---

## 1. Firebase Console(Android FCM 推送必需)

- **入口:** <https://console.firebase.google.com/>
- **目标项目:** 复用现有 `forbox-driver` 项目即可,不需要新建(Firebase project_id 不可改名,且换项目要重做 server key)。要换的话再单独评估。

### 步骤
1. 打开 forbox-driver 项目 → **Project settings → Your apps → Add app → Android**
2. 填写:
   | 字段 | 值 |
   |---|---|
   | Android package name | `com.forboxexpress.staff` |
   | App nickname(任意,只是控制台展示) | `ForBox Staff (Android)` |
   | Debug signing certificate SHA-1 | **留空**(只用 FCM 不需要;若以后加 Google Sign-In / Dynamic Links 才补) |
3. **下载** 生成的新 `google-services.json` → **替换** 本地 `android/app/google-services.json`(它是 gitignored,每台构建机各自维护)
4. 旧的 `com.forboxexpress.driver` Android app 入口可以 **保留**(留作历史记录,不删也无害);如果一定要清理,Firebase 后台可以 remove。

### iOS 推送是否走 Firebase?
当前工程 **没有** `ios/NavigatorApp/GoogleService-Info.plist` ——iOS 推送是直接通过 APNs(走 `react-native-notifications` 库),不经过 Firebase。所以 **iOS 这边不用** 在 Firebase 加 app。后端实现也对应直接调 APNs。

---

## 2. Apple Developer Program(iOS 签名 + 推送必需)

- **入口:** <https://developer.apple.com/account/>
- **前置:** Apple Developer Program 账号($99/年);如果用公司账号,先有 D-U-N-S 编号

### 2.1 App ID
1. **Identifiers → + → App IDs → App**
2. 填:
   | 字段 | 值 |
   |---|---|
   | Description | `ForBox Staff` |
   | Bundle ID | **Explicit**: `com.forboxexpress.staff` |
   | Capabilities | 勾选 **Push Notifications**(必需);**Background Modes**(代码用了,但这是 Info.plist 配的,这里 App ID 不强制勾;勾上也无害) |
3. 保存

### 2.2 APNs Auth Key(**推荐方式**——比 cert 简单,不过期)
1. **Keys → + → Apple Push Notifications service (APNs)**
2. Key Name: `ForBox Staff APNs`
3. 下载 `.p8` 文件 → **只能下一次**,**妥善保存**(丢了只能 revoke 重生)
4. 记下 **Key ID**(10 位字母数字)和你的 **Team ID**(在右上角账号信息里)
5. 把这三样交给后端推送服务(.p8 内容、Key ID、Team ID + Bundle ID)

### 2.3 Provisioning Profile
1. **Profiles → + →** 分别建两个:
   | 类型 | 用途 |
   |---|---|
   | iOS App Development | 开发期 + TestFlight 内部测试 |
   | App Store | TestFlight 外部测试 + App Store 发布 |
2. 选刚才的 App ID `com.forboxexpress.staff`
3. Development profile 还要选 Devices(注册过的 UDID)和 Certificates(开发者证书)
4. 下载 `.mobileprovision`,Xcode 会自动安装

### 2.4 Xcode 工程里要核对的
- 打开 `ios/NavigatorApp.xcworkspace` → Target NavigatorApp → Signing & Capabilities
- **Team** 切到 ForBox 自己的开发者账号
- **Bundle Identifier** 显示 `com.forboxexpress.staff`(已自动从 pbxproj 读)
- 当前 pbxproj 里写的 `DEVELOPMENT_TEAM = W4M54N7H85` 如果不是你们的 Team,**Xcode 第一次打开会报红**,在 Signing 选项里改成正确 Team,Xcode 会回写 pbxproj 并提交一次

---

## 3. App Store Connect(TestFlight 必需)

- **入口:** <https://appstoreconnect.apple.com/>
- **前置:** 上面 App ID 已建好

### 步骤
1. **My Apps → + → New App**
2. 填:
   | 字段 | 值 |
   |---|---|
   | Platforms | iOS |
   | Name | `ForBox Staff`(≤30 字符,App Store 显示名;同 Bundle Display Name) |
   | Primary Language | English (U.S.) 或 Chinese (Simplified)——视主要用户而定 |
   | Bundle ID | 下拉选刚才建的 `com.forboxexpress.staff` |
   | SKU | `forbox-staff-ios`(内部识别用,任意字符串,自定一个不重复的) |
   | User Access | Full Access |
3. 后续 App Information 表单要补(TestFlight 内部组不强制,提交 App Store 时强制):
   | 字段 | 建议值 |
   |---|---|
   | Subtitle | (可选,≤30 字符) |
   | Primary Category | Navigation |
   | Secondary Category | Business |
   | Content Rights | "Does not use third-party content"(若无第三方版权素材) |
   | Privacy Policy URL | **必须** —— ForBox 自己的隐私政策页 URL |
   | Support URL | ForBox 客服/支持页 URL |
   | Marketing URL | (可选) |
4. **TestFlight → Internal Testing → +** 添加内部测试人员的 Apple ID(必须是 App Store Connect 用户,且角色为 Admin / App Manager / Developer / Marketing)
5. 上传 build 后,内部组**不需要 Apple 审核**,~30 分钟可下发;外部组首次需要 Beta App Review(~24-48h)

---

## 4. Google Play Console(Android 内部测试)

- **入口:** <https://play.google.com/console>
- **前置:** Google Play Developer 账号($25 一次性)

### 4.1 创建 App
1. **All apps → Create app**
2. 填:
   | 字段 | 值 |
   |---|---|
   | App name | `ForBox Staff`(≤30 字符) |
   | Default language | 视主要用户 |
   | App or game | App |
   | Free or paid | Free |
3. 勾选 declarations(政策合规、出口加密等)

### 4.2 App content(必填表单,挡上线但不挡内部测试)
- App access(是否需要登录) → **All functionality is available without restrictions / Some require login**(选第二项,提供测试账号)
- Ads → No
- Content rating → 填问卷
- Target audience → 选目标年龄段
- Data safety → 数据收集表(填:用户登录信息、位置、设备 ID、推送 token 等)
- Privacy policy URL → ForBox 隐私政策

### 4.3 内部测试轨
1. **Testing → Internal testing → Create new release**
2. **App signing:** 推荐让 Google **Play App Signing** 接管(默认选项)——你只上传 upload keystore 签的 AAB,Google 用自己的 signing key 重签后下发。upload key 丢了可以恢复
3. 上传 .aab 文件(release build,见第 5 节)
4. **Testers** 标签 → 用邮箱列表创建 testers list → 把测试人员的 Google 账号邮箱填进去 → 复制 opt-in 链接发给他们

---

## 5. Android Release Keystore(签名密钥,自己保管)

> 这一步**不在任何控制台**——是你本地/CI 生成一个 keystore 文件并保管好。

### 生成
```bash
keytool -genkey -v -keystore forbox-staff-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias forbox-staff-upload
```
填 keystore 密码、key 密码、申请人信息(CN, OU, O, L, S, C)。

### 配置
keystore 文件**不进 git**(已有 gitignore 模式覆盖)。把以下值通过环境变量或 `~/.gradle/gradle.properties` 注入:

```properties
ANDROID_NAVIGATOR_APP_UPLOAD_STORE_FILE=/绝对路径/forbox-staff-upload.jks
ANDROID_NAVIGATOR_APP_UPLOAD_STORE_PASSWORD=<keystore密码>
ANDROID_NAVIGATOR_APP_UPLOAD_KEY_ALIAS=forbox-staff-upload
ANDROID_NAVIGATOR_APP_UPLOAD_KEY_PASSWORD=<key密码>
```

(`android/app/build.gradle` 的 `signingConfigs.release` 块已经按这四个变量名读;若环境变量不存在,gradle 会回退到 debug keystore,**release build 不能用 debug key 上 Play Store**。)

**❗keystore 丢了 = 无法再向 Play Store 同一个 app 发新版**——务必备份到密码管理器或公司密钥库。若用了 Play App Signing,upload key 丢了可以走 Google 流程恢复。

---

## 6. 每台构建机/开发机首次拉代码后要做的

项目用 `react-native-config`,通过 **`ENVFILE` 环境变量** 决定加载哪个 `.env` 文件 —— 同一份 `build.gradle` / Xcode 工程,**只换 `ENVFILE` 就能切环境**。本仓库分两套:

| 文件 | 用途 | 跟踪 | 何时被读 |
|---|---|---|---|
| `.env` | 本地开发(默认) | gitignored | `yarn android` / `yarn ios` |
| `.env.production` | 上架/内测分发 | gitignored | `yarn android:release` / `yarn bundle:android` / `yarn ios:release` |
| `.env.example` | dev 模板 | tracked | 新人 `cp` 一份作 `.env` 起点 |
| `.env.production.example` | prod 模板 | tracked | 打包机 `cp` 一份作 `.env.production` 起点 |

`android/app/google-services.json` 也是 gitignored,每台机器各自从 Firebase Console 下载(见第 1 节)。

### 6.1 dev(本机开发)
```bash
cp .env.example .env
# 编辑 .env:
#   FLEETBASE_HOST=http://10.0.2.2:8088    (Android emulator → 宿主机 docker)
#                  / http://localhost:8088 (iOS simulator)
#   FLEETBASE_KEY=<本地 docker fleetbase 里发的 dev API key>
#   GOOGLE_MAPS_API_KEY=<dev key>
```

### 6.2 prod(打包机 / CI)
```bash
cp .env.production.example .env.production
# 编辑 .env.production:
#   FLEETBASE_HOST=https://<线上后端 URL>
#   FLEETBASE_KEY=<flb_live_xxx,线上 API credential>
#   GOOGLE_MAPS_API_KEY=<给 release 单独签的 key,限制到 com.forboxexpress.staff>
#   TRANSISTORSOFT_LICENSE_KEY=<transistorsoft 后台为 com.forboxexpress.staff 签的 prod license>
```

### 6.3 两种环境共同要做的
- macOS 上 `cd ios && bundle exec pod install`(或 `yarn pod:install`)
- 首次构建前清旧缓存:`cd android && ./gradlew clean`
  _(旧的 `android/app/build/` 残留 `com.forboxexpress.driver` 字符串,不清会编译撞包名失败。)_

---

## 7. 打 release 包

Release build 必须走 `.env.production` —— 默认 `.env` 指 `10.0.2.2:8088`,真机/真用户访问不到。yarn 脚本已通过 `scripts/with-env.js` 自动注入 `ENVFILE`:

| 命令 | 输出 | 用途 |
|---|---|---|
| `yarn android:release` | `android/app/build/outputs/apk/release/app-release.apk` | APK,扔给测试用户直接侧载 |
| `yarn bundle:android` | `android/app/build/outputs/bundle/release/app-release.aab` | AAB,传 Play Console 内部测试轨 |
| `yarn ios:release` | 装到当前连接的设备/模拟器,Release 配置 | 本地真机验证 release |

### 7.1 Xcode GUI archive(给 TestFlight 上传 .ipa)

Xcode 不会从 shell 继承 `ENVFILE`,需要在 Scheme 里固化:

1. Xcode → Product → Scheme → Edit Scheme → 选 Run → Arguments → Environment Variables
2. 加一行 `ENVFILE = .env.production`,左边 checkbox 勾上
3. 顺便 Archive 项里勾 "use the Run action's arguments and environment variables"(避免 archive 不读这条)
4. 或命令行 archive:
   ```bash
   xcodebuild -workspace ios/NavigatorApp.xcworkspace \
              -scheme NavigatorApp \
              -configuration Release \
              ENVFILE=.env.production \
              archive -archivePath ./build/ForBoxStaff.xcarchive
   ```

### 7.2 CI 构建

在 workflow step 上设环境变量 `ENVFILE: .env.production`(或 `export ENVFILE=...`),然后跑同样的 gradle / xcodebuild 命令。`with-env.js` 中转只是给本地 yarn 用,CI 直接走原生环境变量即可。

---

## 8. 工作顺序与关键路径

```
Apple Developer 账号申请    ← 关键路径(公司账号 1~2 周 D-U-N-S 审批)
       │
       ├─► App ID + APNs Key + Provisioning Profiles
       │            │
       │            └─► App Store Connect 建 App → TestFlight 内部组
       │
Play Console 账号($25,当天开通)
       │
       └─► 建 App → 配 App content 表单 → 内部测试轨

(并行)Firebase Console 加 Android app → 替换本地 google-services.json
(并行)生成 Android upload keystore + 配 gradle properties
(并行)Xcode 切 Team / 自动签名
(并行)填 `.env.production` 内的线上 host / key / maps key / transistor license
```

iOS 关键路径是 Apple Developer 账号(尤其公司账号),**先提交申请**。其他步骤可以并行。

---

## 9. 在 ForBox 部署下**不需要做**的事(避免踩坑浪费时间)

- ❌ **不用** 在 fleetbase 后端配 `NAVIGATOR_APP_IDENTIFIER` / 改 `NavigatorController` —— ForBox 员工不走"扫码配置"流程,后端 host/key 在构建期就烤进 `.env.production`(参见 `e097144` 提交描述)
- ❌ **不用** 在 Firebase 给 iOS 加 app —— 当前 iOS 推送走 APNs,不经过 Firebase
- ❌ **不用** 在 Apple Developer 上注册 UDID —— TestFlight 不需要(只有 Ad-hoc 才需要)
