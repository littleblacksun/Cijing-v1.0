# 阶段 1 执行任务包（交给 Codex Work Agent）

> **任务名称**：Stage 1 — React + TypeScript + Vite + Tailwind + Dexie + Capacitor 工程骨架、全局设计系统与语库加载管道
> **工作目录**：`/home/bubu/逻辑填空apk`
> **前置参考文档**：
> - `docs/ROADMAP.md`
> - `docs/UI_DESIGN_SPECS_AND_PROMPTS.md`（重点参考 `UI-00` 全局视觉锚点）
> - `语库/SCHEMA.md`

---

## 一、严格执行约束（Guardrails）

1. **禁止删除或覆盖已有目录**：`docs/` 与 `语库/` 目录必须完整保留（注意项目根目录本身非空，请在原地创建工程文件，切勿清空根目录）。
2. **阶段边界**：本阶段仅构建**空壳工程骨架、设计系统组件、数据模型、Dexie 本地库、语库同步脚本、14 个页面路由占位符与 4-Tab 导航壳**。不要提前编写阶段 2~5 的复杂业务逻辑或伪造 LLM 接口调用。
3. **本阶段暂不执行 `npx cap add android`**（留待阶段 6），但请先安装 `@capacitor/core`、`@capacitor/cli` 并配置好 `capacitor.config.ts`（开启 `CapacitorHttp`）。
4. **代码质量**：严格启用 TypeScript 类型检查（无 `any` 滥用），所有 UI 配色必须使用本任务包定义的 CSS 变量 / Tailwind 语义 Token。

---

## 二、技术栈与依赖清单

- 构建工具：`vite` + `@vitejs/plugin-react` + `typescript`
- UI 与样式：`react` (^18.3)、`react-dom` (^18.3)、`tailwindcss` (^3.4)、`postcss`、`autoprefixer`、`lucide-react`
- 路由与状态：`react-router-dom` (^6.28)、`zustand` (^5.0)
- 本地离线数据库：`dexie` (^4.0)
- Capacitor 配置：`@capacitor/core`、`@capacitor/cli`

---

## 三、目标目录结构

请在 `/home/bubu/逻辑填空apk` 下严格按以下结构创建文件：

```text
/home/bubu/逻辑填空apk/
├── docs/                           # [已有，勿动]
├── 语库/                            # [已有，勿动]
├── scripts/
│   └── sync-vocab.mjs              # 扫描 语库/*.json 并合并生成 src/data/generatedVocab.json
├── index.html                      # 配置 viewport-fit=cover、中文标题「词境 · 行测逻辑填空」
├── package.json                    # 含 sync:vocab / dev / build / typecheck 脚本
├── tsconfig.json
├── vite.config.ts                  # 配置 @ -> src 别名
├── tailwind.config.js              # 注入全局语义色彩与圆角/阴影 Token
├── postcss.config.js
├── capacitor.config.ts             # appId: com.cijing.app, appName: 词境, webDir: dist, CapacitorHttp enabled
└── src/
    ├── main.tsx
    ├── App.tsx                     # HashRouter/BrowserRouter 路由总表 + 启动初始化 Dexie
    ├── index.css                   # Tailwind 指令 + 安全区/字体基础样式
    ├── styles/
    │   └── tokens.css              # 全局 CSS 变量（严格对齐 UI-00）
    ├── types/
    │   └── domain.ts               # 全应用领域模型 TypeScript 接口
    ├── data/
    │   ├── fallbackSeed.ts         # 当 语库/ 尚无 .json 时的 6 词 + 2 易混组内置演示种子
    │   └── generatedVocab.json     # 由 scripts/sync-vocab.mjs 自动生成
    ├── db/
    │   ├── database.ts             # Dexie CiJingDB 定义（6 张表）
    │   └── initDb.ts               # 启动初始化：导入语库、初始化默认 AppSettings
    ├── stores/
    │   └── useAppStore.ts          # 全局状态：settings 缓存、selectedWordIds（出题选词篮）、全局 toast
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx        # 手机端容器（桌面居中 430px 预览，移动端全宽）+ 4-Tab 底部导航
    │   │   └── TopBar.tsx          # 通用顶部导航栏（返回/标题/右侧操作区）
    │   └── ui/
    │       ├── Card.tsx            # 标准 16px 圆角白卡
    │       ├── Tag.tsx             # 语义标签（primary/accent/success/danger/warning/neutral）
    │       ├── Button.tsx          # 主/次/描边/轻色按钮
    │       ├── EmptyState.tsx      # 通用空状态组件
    │       └── BottomSheet.tsx     # 通用底部弹出抽屉壳
    └── pages/                      # 13 个路由页占位（与 UI-01 ~ UI-14 一一对应）
        ├── HomePage.tsx            # UI-01  路由: /
        ├── LibraryPage.tsx         # UI-02  路由: /library
        ├── IdiomDetailPage.tsx     # UI-03  路由: /library/idiom/:id
        ├── ConfusionDetailPage.tsx # UI-04  路由: /library/confusion/:id（UI-05 弹窗将在阶段 2 挂入此页）
        ├── PracticeSetupPage.tsx   # UI-06  路由: /practice
        ├── WordPickerPage.tsx      # UI-07  路由: /practice/picker
        ├── QuizGeneratingPage.tsx  # UI-08  路由: /practice/generating
        ├── QuizPlayPage.tsx        # UI-09  路由: /quiz/:sessionId
        ├── QuizResultPage.tsx      # UI-10  路由: /quiz/:sessionId/result
        ├── QuizReviewPage.tsx      # UI-11  路由: /quiz/:sessionId/review
        ├── LocalBankPage.tsx       # UI-12  路由: /bank
        ├── SettingsPage.tsx        # UI-13  路由: /settings
        └── ApiConfigPage.tsx       # UI-14  路由: /settings/api
```

---

## 四、关键实现细则

### 1. 全局设计 Token（`src/styles/tokens.css` & `tailwind.config.js`）
必须与 `docs/UI_DESIGN_SPECS_AND_PROMPTS.md` 中的 `UI-00` 完全一致：
- `--bg-page: #F5F7FA`
- `--bg-surface: #FFFFFF`
- `--bg-subtle: #EEF2F7`
- `--color-primary: #2563EB`（浅底 `#EFF6FF`）
- `--color-accent: #0EA5E9`（浅底 `#F0F9FF`）
- `--color-success: #10B981`（浅底 `#ECFDF5`）
- `--color-danger: #EF4444`（浅底 `#FEF2F2`）
- `--color-warning: #F59E0B`（浅底 `#FFFBEB`）
- `--text-primary: #0F172A`
- `--text-secondary: #475569`
- `--text-muted: #94A3B8`
- `--border-subtle: #E2E8F0`
- 卡片阴影 `shadow-card`: `0 2px 10px rgba(15, 23, 42, 0.04)`
- 安全区工具类：`pb-safe`（`padding-bottom: max(12px, env(safe-area-inset-bottom))`）、`pt-safe`（`padding-top: env(safe-area-inset-top)`）

### 2. 核心领域类型（`src/types/domain.ts`）
必须完整定义以下核心类型，且与 `语库/SCHEMA.md` 100% 兼容：
- `Sentiment = 'positive' | 'negative' | 'neutral'`
- `Intensity = 'light' | 'medium' | 'heavy'`
- `MasteryLevel = 0 | 1 | 2 | 3`（`0=陌生, 1=模糊, 2=熟悉, 3=掌握`）
- `QuizMode = 'instant' | 'exam'`（即时解析 / 交卷解析）
- `QuizCount = 5 | 10 | 15 | 20`
- `Idiom`（完全对应 `语库/SCHEMA.md` 的 `idioms_*.json` 结构）
- `ConfusionGroup`（完全对应 `语库/SCHEMA.md` 的 `confusion_groups_*.json` 结构）
- `StudyProgress`（`idiomId`, `mastery: MasteryLevel`, `reviewCount`, `lastReviewedAt`, `nextReviewAt`, `isBookmarked`）
- `QuestionItem`（`id`, `source: 'ai' | 'local'`, `stem`, `options: { A: string; B: string; C: string; D: string }`, `answer: 'A' | 'B' | 'C' | 'D'`, `contextClues: string[]`, `overallAnalysis: string`, `optionAnalyses: { A: string; B: string; C: string; D: string }`, `relatedIdioms: string[]`, `createdAt: number`）
- `LocalQuestion extends QuestionItem`（额外包含：`savedAt: number`, `practiceCount: number`, `wrongCount: number`, `lastPracticedAt?: number`, `fingerprint: string` 用于去重）
- `QuizSession`（`id`, `mode: QuizMode`, `totalCount: QuizCount`, `localCount: number`, `aiCount: number`, `targetIdioms: string[]`, `questions: QuestionItem[]`, `userAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>`, `eliminatedOptions: Record<string, string[]>`, `flaggedQuestionIds: string[]`, `savedQuestionIds: string[]`, `status: 'in_progress' | 'completed'`, `startedAt: number`, `completedAt?: number`, `durationSec: number`）
- `AppSettings`（`id: 'default'`, `localBankRatio: number` **默认 `0.2`**（即 20%）, `defaultQuizMode: QuizMode` 默认 `'instant'`, `fontSize: 'normal' | 'large'`, `llmBaseUrl: string`, `llmApiKey: string`, `llmModel: string`, `llmPromptStyle: 'guokao' | 'shengkao' | 'basic'`）

### 3. Dexie 数据库设计（`src/db/database.ts`）
数据库名：`CiJingDB`，版本 `1`，包含 6 张表：
- `idioms: 'id, word, frequency, sentiment, *tags'`
- `confusionGroups: 'id, title, category, difficulty'`
- `studyProgress: 'idiomId, mastery, nextReviewAt, isBookmarked'`
- `localQuestions: 'id, &fingerprint, savedAt, wrongCount, lastPracticedAt, *relatedIdioms'`
- `quizSessions: 'id, status, startedAt, completedAt'`
- `appSettings: 'id'`

### 4. 语库同步脚本（`scripts/sync-vocab.mjs`）
- 扫描项目根目录下的 `语库/` 文件夹中所有 `.json` 文件（排除非 JSON 文件与 `SCHEMA.md`）。
- 识别 `type === "idioms"` 与 `type === "confusion_groups"`，按 `word` / `title` 去重合并，自动为缺少 `id` 的词条生成确定性 ID。
- 若 `语库/` 暂无 `.json` 文件，输出 `{ idioms: [], confusionGroups: [], sourceFiles: [], syncedAt }`（运行时由 `initDb.ts` 自动回退写入 `fallbackSeed.ts` 的 6 个高频行测成语 + 2 组经典易混辨析，确保 App 立刻有真实内容可展示）。
- 在 `package.json` 中配置：
  - `"sync:vocab": "node scripts/sync-vocab.mjs"`
  - `"predev": "npm run sync:vocab"`
  - `"prebuild": "npm run sync:vocab"`

### 5. 路由与 4-Tab 壳（`src/App.tsx` & `src/components/layout/AppShell.tsx`）
- 使用 `HashRouter`（兼容 Capacitor Android WebView 本地文件/协议加载，避免刷新 404）。
- 仅在 4 个一级页面显示底部导航栏：`/`（学习）、`/library`（词库）、`/practice`（刷题）、`/bank`（题库）；所有二级详情/答题/设置页自动隐藏底部栏。
- 桌面端浏览器预览时：外层居中限制 `max-w-[430px]`、浅灰背景衬托，方便边开发边对照 `390×844` 设计稿预览；移动端真机全宽贴边。
- 每个占位页需清晰展示：页面编号（如 `UI-01`）、页面标题、当前路由、以及从 Dexie 读取的实时条数（例如「当前已载入 X 个成语 · Y 组易混词 · 本地抽题默认权重 20%」），并在占位页之间放置可点击跳转链接，便于验证全部 13 条路由畅通。

### 6. Capacitor 基础配置（`capacitor.config.ts`）
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cijing.app',
  appName: '词境',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
```

---

## 五、验收标准与交付汇报格式

Codex 执行完成后，必须依次运行以下 3 条验证命令并全部通过（exit code 0）：
1. `npm run sync:vocab`
2. `npx tsc --noEmit`
3. `npm run build`

完成后，请向用户/架构师汇报以下内容：
1. 新增与修改的文件树摘要；
2. 3 条验证命令的执行结果；
3. `语库/` 当前扫描状态与内置演示种子条数；
4. 是否存在任何依赖警告或需要确认的问题。
