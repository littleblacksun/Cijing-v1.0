# 阶段 6 执行任务包（交给 Codex Work Agent）：App 封面接入、Android 原生封装与可安装 APK 构建导出

> **任务目标**：将 `app封面/逻辑填空.png` 制作并接入为 App 桌面图标与启动封面，完成 Capacitor Android 原生适配（状态栏、物理返回键、网络安全策略），并在本机编译导出**已签名、可直接安装到安卓手机的 Release APK**。
> **工作目录**：`/home/bubu/逻辑填空apk`
> **执行前提**：请确认指令 1（阶段 2 功能）与指令 2（阶段 3~5 功能）均已完成并通过 `tsc` / `build`。

---

## 一、源素材与环境事实

- **App 封面源图**：`app封面/逻辑填空.png`（`960×960`，PNG，纯白底 `#FFFFFF`，上方有「逻辑填空」字样、主体为看书小熊）。
- **本机已有环境**：
  - Node `v22` / npm `10`
  - Python `3.13` + **Pillow (`PIL`)** 已安装（可直接用于高精度生成各尺寸图标与启动图）
  - `keytool` 已安装
  - **OpenJDK 17**（`/usr/lib/jvm/java-17-openjdk-amd64`）与 OpenJDK 21 均已安装（Capacitor 6 + AGP 8.x 强烈建议显式使用 `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` 构建 Gradle，最稳定无兼容报错）。
  - Android SDK 尚未配置，需在本阶段按需自动安装到 `~/Android/Sdk`。

---

## 二、详细任务清单

### 任务 1：前置构建验证
在开始原生封装前，先运行并确保全绿：
1. `npm run sync:vocab`（确认 1,000 个成语 + 150 组易混词正常同步）
2. `npx tsc --noEmit`
3. `npm run build`

### 任务 2：安装 Capacitor Android 与原生体验插件（严格对齐 Capacitor 6 大版本）
安装与现有 `@capacitor/core@^6.2.1` 匹配的插件：
- `@capacitor/android@^6.2.1`
- `@capacitor/app@^6.0.2`
- `@capacitor/status-bar@^6.0.2`
- `@capacitor/splash-screen@^6.0.3`

同时更新 `capacitor.config.ts`：
- 保留 `CapacitorHttp: { enabled: true }`（确保手机端调用任意第三方 LLM API 绕过 CORS）
- 增加 `SplashScreen` 插件配置：
  ```ts
  SplashScreen: {
    launchShowDuration: 1500,
    launchAutoHide: true,
    backgroundColor: '#FFFFFF',
    androidScaleType: 'CENTER_INSIDE',
    showSpinner: false,
  },
  ```
- 运行 `npx cap add android` 生成 `android/` 原生工程。

### 任务 3：用 `app封面/逻辑填空.png` 生成高清 App 图标与启动封面（防裁切！）
编写脚本 `scripts/generate-android-assets.py`（使用 Python Pillow），以 `app封面/逻辑填空.png` 为源图，严格处理 Android 自适应图标安全区，防止顶部「逻辑填空」文字或小熊边缘被手机桌面圆形/圆角遮罩切掉：
1. **Web 图标**：
   - 生成 `public/icon-192.png`（192×192）与 `public/icon-512.png`（512×512），并在 `index.html` 中引入 `<link rel="icon" type="image/png" href="./icon-192.png" />`。
2. **Android 桌面图标（覆盖 `android/app/src/main/res/mipmap-*` 全部密度：`mdpi` / `hdpi` / `xhdpi` / `xxhdpi` / `xxxhdpi`）**：
   - **`ic_launcher_background`**（`res/values/ic_launcher_background.xml`）：背景色设为纯白 `#FFFFFF`（与封面原图底色无缝融合）。
   - **`ic_launcher_foreground.png`**（各密度对应 `108/162/216/324/432px`）：将 `逻辑填空.png` 等比缩放至画布尺寸的 **68%~70%** 并居中放置于透明/纯白画布，保证文字与小熊 100% 落在 Android 自适应图标中心安全圆内！
   - **`ic_launcher.png`**（`48/72/96/144/192px`）：缩放至 **88%** 居中于 `#FFFFFF` 纯白圆角/方底画布。
   - **`ic_launcher_round.png`**（`48/72/96/144/192px`）：缩放至 **78%** 居中于 `#FFFFFF` 纯白画布并应用平滑抗锯齿圆形 Alpha 遮罩。
3. **Android 启动封面（Splash Screen）**：
   - 覆盖 `android/app/src/main/res/drawable/splash.png` 及所有 `drawable-port-*/splash.png`、`drawable-land-*/splash.png`：纯白 `#FFFFFF` 全屏底色，将 `逻辑填空.png` 等比居中放置（竖屏宽度占屏约 **62%**，横屏高度占屏约 **55%**，绝不拉伸变形）。
   - 检查 `android/app/src/main/res/values/styles.xml`（Android 12+ SplashScreen 主题）：确保 `windowSplashScreenBackground` 为 `#FFFFFF`，且启动动画图标干净不裁切。

### 任务 4：Android 原生交互适配（状态栏 + 物理返回键 + 网络权限）
1. **新增 `src/native/androidBridge.ts`** 并在 `src/App.tsx` 中挂载（严格判断 `Capacitor.isNativePlatform()`，浏览器预览模式下静默跳过、零报错）：
   - **状态栏配置**：
     - `StatusBar.setOverlaysWebView({ overlay: false })`（防止页面内容侵入手机状态栏下方）
     - `StatusBar.setBackgroundColor({ color: '#F5F7FA' })`
     - `StatusBar.setStyle({ style: Style.Light })`（注意在 Capacitor StatusBar 中，`Style.Light` 表示浅色背景+深色状态栏文字，请在安装后核对 `@capacitor/status-bar` 类型定义注释确认 `Style.Light` vs `Style.Dark` 的语义，务必保证浅灰底 `#F5F7FA` 上状态栏时间/电量文字清晰可见！）
   - **物理返回键拦截（`CapApp.addListener('backButton', ...)`）**：
     - 若当前有打开的原生 `<dialog open>`（如 `BottomSheet`、`QuickDrillModal`、`AnswerSheetModal`），优先关闭该弹窗；
     - 否则若处于答题页 `/quiz/:sessionId`（非 `/result`、非 `/review`）：2 秒内连按两次返回才退回 `/practice`，首次按下通过 `useAppStore.getState().showToast({ message: '答题进度已自动保存，再按一次退出答题' })` 提示防误触；
     - 否则若处于二级页面（非 `/`、`/library`、`/practice`、`/bank`）：调用 `window.history.back()` 返回上一页；
     - 否则若处于非首页一级 Tab（`/library`、`/practice`、`/bank`）：跳转回首页 `/`；
     - 在首页 `/`：2 秒内连按两次物理返回键调用 `CapApp.exitApp()`，首次按下弹出 toast「再按一次退出应用」。
2. **检查并配置 `android/app/src/main/AndroidManifest.xml`**：
   - 确保包含 `<uses-permission android:name="android.permission.INTERNET" />` 和 `<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />`；
   - 在 `<application>` 标签上添加 `android:usesCleartextTraffic="true"`（兼容用户可能填写的 HTTP 协议本地/中转 LLM API 地址）；
   - 在 `<activity>` 标签上保持 `android:screenOrientation="portrait"`（竖屏锁定，保障手机刷题体验稳定）。

### 任务 5：配置 Android SDK、本地 Release 签名并编译导出 APK
1. **准备 Android SDK**：
   - 检查 `$ANDROID_HOME` 或 `~/Android/Sdk` 是否已存在可用 SDK；
   - 若不存在：下载 Google 官方 Linux `commandlinetools-linux-*_latest.zip` 解压至 `~/Android/Sdk/cmdline-tools/latest`，使用 `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` 运行 `sdkmanager` 接受全部许可（`yes | sdkmanager --licenses`），并安装 `android/variables.gradle` 所要求的 `compileSdkVersion` 对应平台与 build-tools（通常为 `platform-tools`、`platforms;android-34`、`build-tools;34.0.0`）。
   - 在 `android/local.properties` 写入 `sdk.dir=/home/bubu/Android/Sdk`（按实际路径）。
2. **配置 Release 签名密钥**：
   - 使用 `keytool` 生成 `android/keystore/cijing-release.jks`（RSA 2048，有效期 10000 天），并在 `android/app/build.gradle` 配置 `signingConfigs.release`（通过独立 `android/keystore.properties` 读取密码与路径，不把明文密码硬编码在源码中）。
   - 创建/更新根目录 `.gitignore`，确保忽略 `node_modules/`、`dist/`、`android/local.properties`、`android/keystore/`、`android/keystore.properties`、`android/.gradle/`、`android/app/build/`。
3. **同步前端产物并编译 Release APK**：
   - 运行：
     ```bash
     npm run build
     npx cap sync android
     ```
   - 使用 `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` 在 `android/` 目录执行：
     ```bash
     ./gradlew assembleRelease -Dorg.gradle.jvmargs="-Xmx2048m"
     ```
4. **导出与产物校验**：
   - 将 `android/app/build/outputs/apk/release/app-release.apk` 复制到根目录 `release/` 下两份（方便不同传输工具识别）：
     - `release/词境-逻辑填空-v1.0.0.apk`
     - `release/cijing-v1.0.0-release.apk`
   - 校验：
     1. 使用 `apksigner verify`（位于 `~/Android/Sdk/build-tools/*/apksigner`）或 `jarsigner -verify` 验证 APK 签名完整有效；
     2. 使用 `unzip -l` 确认 APK 内部包含 `assets/public/index.html`、`assets/public/assets/generatedVocab-*.json` 以及生成的图标与启动封面资源；
     3. 打印 APK 文件体积。

---

## 三、验收标准与汇报要求

完成后请向用户/架构师汇报：
1. `npm run build`、`npx cap sync android`、`./gradlew assembleRelease` 的执行结果；
2. 图标与启动封面生成脚本执行情况（确认自适应图标安全区留白，无裁切）；
3. 导出 APK 的绝对路径、文件大小与 `apksigner verify` 签名验证结果；
4. 是否存在任何构建告警或需用户真机测试注意的事项（如应用桌面名称当前为「词境」，如需改为「逻辑填空」可一句话调整重打）。
