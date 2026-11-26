# 词境 · 行测逻辑填空（Android App）

<p align="center">
  <img src="app封面/逻辑填空.png" width="180" alt="逻辑填空 App 封面" />
</p>

一款面向公务员/事业单位《行测 · 言语理解 · 逻辑填空》的移动端离线学习与 AI 智能刷题工具（React + Tailwind CSS + Dexie.js + Capacitor 打包 Android APK）。

> **Android 安装包下载**：可直接下载仓库内的已签名 Release 包 [release/cijing-v1.0.0-release.apk](release/cijing-v1.0.0-release.apk) 安装到手机。


---

## 核心特性

- **离线海量高频语库**：内置 **1,000 个行测高频成语** 与 **150 组经典易混成语辨析**，装完即可随时随地离线学习；支持 App 内动态导入符合 `语库/SCHEMA.md` 规范的外部 JSON 语库。
- **六维成语深度理解卡**：核心释义、关键语素拆字高亮、感情色彩/语义轻重/频次标签、行测避坑提醒、**点击遮罩主动回忆例句**，以及 `陌生 / 模糊 / 熟悉 / 掌握` 四级简化间隔复习打卡。
- **易混成语四重辨析**：异字高亮对比头卡、一屏核心差异对照表（兼容 2~4 词横向对比）、同境换词正误对照，以及学完即测的**闪电微测**（答错自动回流复习队列）。
- **通用 OpenAI 兼容 LLM 智能出题**：
  - 支持自定义 `Base URL / API Key / Model`（兼容 DeepSeek、通义千问、智谱、豆包及各类 OpenAI 格式中转接口），原生 Android 环境自动使用 `CapacitorHttp` 绕过跨域限制；
  - 支持自选成语 / 陌生词优先 / 易混组 / 随机抽词，自主选择题量 **`5 / 10 / 15 / 20`** 道；
  - 兼容思考模型 `<think>` 剥离、强容错 JSON 校验与大题量自动分批生成。
- **双模式沉浸式答题与本地题库闭环**：
  - **即时解析模式**：选完立刻高亮正误、展示语境线索与 A/B/C/D 逐项解析，单题一键收藏入库；
  - **交卷解析模式**：支持行测实用**选项划线排除**、题目标旗、答题卡跳转与计时，交卷后统一查看成绩报告、薄弱成语汇总与整卷复盘；
  - **本地题库权重混抽**：后续组卷默认按 **20% 权重**（`5→1 / 10→2 / 15→3 / 20→4`，设置页支持 `0%~50%` 自由调节）优先抽取相关/错题/久未练的本地旧题，余量不足时自动由 AI 补齐。
- **个人数据备份恢复**：支持导出/导入个人学习进度与本地收藏题库 JSON（导出默认剔除 `llmApiKey` 保护密钥安全）。

---

## 技术栈

- **前端框架**：React 18 + TypeScript + Vite + Tailwind CSS
- **路由与状态**：React Router v6（`HashRouter`）+ Zustand
- **离线存储**：IndexedDB（Dexie.js）
- **移动端封装**：Capacitor 6（Android 原生状态栏、物理返回键防误退、自适应图标与启动封面、`CapacitorHttp`）

---

## 本地开发与构建 APK

### 1. 安装依赖与浏览器预览
```bash
npm install
npm run dev
```
> 启动前会自动运行 `npm run sync:vocab`，将 `语库/*.json` 校验合并为运行时资源 `src/data/generatedVocab.json`。

### 2. 类型检查与生产构建
```bash
npx tsc --noEmit
npm run build
```

### 3. 同步并构建 Android APK
需本机已配置 **JDK 17** 与 **Android SDK**：
```bash
npx cap sync android
cd android
./gradlew assembleDebug    # 或配置 keystore.properties 后执行 ./gradlew assembleRelease
```

---

## 目录说明

- `src/`：前端应用源码（页面、组件、Dexie 数据库、学习/LLM/组卷/备份服务层、Android 原生桥接）
- `语库/`：内置 1,000 成语 + 150 易混组 JSON 源文件及数据格式规范 [SCHEMA.md](语库/SCHEMA.md)
- `docs/`：项目路线图、16 张 UI 设计稿与分阶段开发任务包
- `android/`：Capacitor Android 原生工程（已通过 `.gitignore` 隔离签名密钥与本地 SDK 路径）
- `app封面/`：App 图标与启动封面源图
- `scripts/`：语库同步脚本与 Android 图标/启动图自动生成脚本
