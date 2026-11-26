# 功能任务包 1（阶段 2 功能层）：核心学习闭环与真实数据持久化（交给 Codex Work Agent）

> **任务范围**：将 `UI-01` ~ `UI-05` 从静态演示数据升级为**100% 真实 Dexie 持久化功能**，打通 1,000 个成语 + 150 组易混词的背词、间隔复习、书签收藏与出题词单联动。
> **工作目录**：`/home/bubu/逻辑填空apk`
> **视觉约束**：**严禁破坏已完成的高保真 UI 样式与布局**，仅替换数据源与补齐真实交互逻辑。

---

## 一、文件边界（与功能任务包 2 完全隔离，无文件冲突）

本任务包仅新增/修改以下文件（请勿修改 `PracticeSetupPage`、`Quiz*Page`、`LocalBankPage`、`SettingsPage`、`ApiConfigPage`、`uiMockPractice.ts`）：
- **新增**：`src/services/learningService.ts`（掌握度更新、简化间隔复习计算、书签/连续打卡记录、易混组匹配与首页统计查询）
- **改造**：`src/data/uiMockLearning.ts`（改为纯真实数据 Hook 与样式常量导出，移除写死的 `dashboard` 假统计与 `demoMastery` 假状态；或拆出 `src/hooks/useLearningData.ts` 并在 `uiMockLearning.ts` 保持兼容导出）
- **修改**：
  - `src/pages/HomePage.tsx`
  - `src/pages/LibraryPage.tsx`
  - `src/pages/IdiomDetailPage.tsx`
  - `src/pages/ConfusionDetailPage.tsx`
  - `src/components/confusion/QuickDrillModal.tsx`

---

## 二、详细功能需求

### 1. 学习进度与简化间隔复习引擎（`src/services/learningService.ts`）
基于 `db.studyProgress`（`idiomId`, `mastery: 0|1|2|3`, `reviewCount`, `lastReviewedAt`, `nextReviewAt`, `isBookmarked`）：
- **`recordIdiomMastery(idiomId: string, mastery: MasteryLevel): Promise<StudyProgress>`**：
  - 查询当前记录（无则新建），更新：
    - `mastery` = 传入的新等级（`0=陌生, 1=模糊, 2=熟悉, 3=掌握`）
    - `reviewCount` = `(existing?.reviewCount ?? 0) + 1`
    - `lastReviewedAt` = `Date.now()`
    - `nextReviewAt` 按简化间隔复习规则计算：
      - `0（陌生）`：`now + 10 分钟`
      - `1（模糊）`：`now + 1 天`
      - `2（熟悉）`：`now + 3 天`
      - `3（掌握）`：`now + 7 天`（若连续多次掌握可适当拉长，如 `7 * Math.min(4, Math.max(1, reviewCount))` 天）
  - 写入 `db.studyProgress.put(...)`，并顺带记录今日打卡日期到 `localStorage`（key: `cijing_study_days`，保存 `YYYY-MM-DD` 去重日期数组）用于准确计算连续学习天数 `streak`。
- **`toggleIdiomBookmark(idiomId: string): Promise<boolean>`**：
  - 在 `db.studyProgress` 中切换 `isBookmarked`（若记录尚不存在，以 `mastery: 0, reviewCount: 0, lastReviewedAt: 0, nextReviewAt: 0, isBookmarked: true` 创建）。
- **`getHomeStats()`**：基于 Dexie `liveQuery` 实时计算：
  - `todayReviewed`：`lastReviewedAt >= 今日 00:00:00` 的 `studyProgress` 数量；
  - `dailyGoal`：固定默认 `20`；
  - `streak`：根据 `cijing_study_days` 计算连续打卡天数（若今天还没学但昨天学了仍延续昨天天数，今天学完即 +1；从未学过显示 `0`）；
  - `dueReviewCount`：`studyProgress` 中 `reviewCount > 0` 且 (`nextReviewAt <= now` 或 `mastery <= 1`) 的数量；
  - `masteredCount`：`studyProgress` 中 `mastery === 3` 的数量；
  - `localQuestionCount`：真实读取 `db.localQuestions.count()`；
  - `nextReviewIdiomId`：优先取最紧迫的待复习词（`nextReviewAt` 最小且 `<= now`，其次 `mastery <= 1`），若暂无待复习记录则取 `db.idioms` 中 `frequency` 最高的未学成语。
- **`pickDailyConfusionGroups(groups: ConfusionGroup[], count = 2)`**：
  - 根据本地日期字符串 `YYYY-MM-DD` 做确定性哈希偏移，每天从 150 组真实易混词中稳定推荐 2 组不重复的高频易混组（同一天内刷新页面保持不变，次日自动轮换）。
- **`findRelatedConfusionGroups(word: string, groups: ConfusionGroup[])`**：
  - 在全部 150 组真实 `confusionGroups` 中精确查找 `group.words.some(w => w.word === word)` 或 `group.title.includes(word)` 的关联易混组列表。

### 2. 首页看板真实化（`src/pages/HomePage.tsx`）
- 移除所有写死数字（`12/20`、`7天`、`8/64/32`），全部接入 `getHomeStats()` 的 Dexie `liveQuery` 实时响应。
- 环形进度条按 `Math.min(1, todayReviewed / dailyGoal)` 渲染真实进度（`0/20` 时显示干净底轨）。
- 「开始今日复习」按钮动态跳转至 `/library/idiom/${nextReviewIdiomId}?mode=review`，若今日已有待复习词文案可保持 `开始今日复习`（或带计数提示）。
- 「每日一辨」展示 `pickDailyConfusionGroups(groups, 2)` 选出的真实易混组，点击直达对应 `/library/confusion/:id`。

### 3. 词库双视图真实化（`src/pages/LibraryPage.tsx`）
- **成语库视图**：
  - 彻底移除 `demoMastery`，未学过的成语默认为 `未学/陌生(0)`，已打卡的实时显示 `db.studyProgress` 中的真实掌握度胶囊。
  - 筛选栏扩展支持按真实进度与标签筛选：`全部`、`陌生`、`模糊`、`熟悉`、`掌握`、`国考高频`、`易望文生义`、`褒贬易错`（保持单行可横向滑动，样式与现有完全一致）。
  - 保持 20 条/页的分页加载，搜索实时检索全部 1,000 个成语（汉字 / 去声调拼音 / 核心释义）。
  - 多选模式下勾选成语点击「去 AI 出题 →」，将真实 `idiom.id[]` 写入 `useAppStore.setSelectedWordIds` 并跳转 `/practice`。
- **易混组视图**：
  - 完整展示全部 150 组真实 `confusionGroups`（同样采用 20 组/页分页加载，避免一次渲染 150 张卡卡顿），支持按标题、成语名、分类、核心总结实时搜索。

### 4. 成语深度理解卡真实化（`src/pages/IdiomDetailPage.tsx`）
- **复习队列与进度计数**：
  - 从 `/library` 进入按当前词库顺序展示 `当前序号 / 总词数`；支持底部或顶部顺滑切换上一词/下一词；
  - 从首页「开始今日复习」进入（`?mode=review`）时，优先按待复习队列顺序推进。
- **底部 4 级掌握度按钮（`陌生 / 模糊 / 熟悉 / 掌握`）**：
  - 真实高亮当前成语在 `db.studyProgress` 中的掌握度；
  - 点击任意等级调用 `recordIdiomMastery(idiom.id, level)` 真实落库，弹出轻量 toast（如 `已标为「熟悉」，3天后复习`），并在约 `260ms` 短延迟后自动平滑切到下一条成语（若已是最后一条则提示「已完成本轮学习」）。
- **右上角图标操作**：
  - 真实调用 `useAppStore.toggleSelectedWord(idiom.id)`（或同时支持加入出题词单，点击有清晰高亮与 toast：`已加入 AI 出题词单` / `已移出出题词单`），与 `PracticeSetupPage` 完全互通。
- **底部关联易混组入口**：
  - 调用 `findRelatedConfusionGroups(idiom.word, groups)` 匹配真实 150 组易混词；
  - 若匹配到 1 组及以上，显示「进入易混辨析组：<实际标题> →」并真实跳转；若该词暂无对应易混组，则显示「用该词及易混词 AI 出题 →」（点击将该词与 `confusableWith` 中命中的词加入出题词单并跳 `/practice`）。

### 5. 易混对比页与闪电微测真实化（`ConfusionDetailPage.tsx` & `QuickDrillModal.tsx`）
- **`ConfusionDetailPage.tsx`**：
  - 真实加载 `db.confusionGroups.get(id)`（完整支持 2 词、3 词甚至 4 词对比组：超过 2 词时对照表自动支持平滑横向滚动，表头维度列可 `sticky left-0` 固定不走位！）。
  - 顶部「用本组出题」与底部「加入出题词单」：根据本组 `words` 的词名在 `db.idioms` 中查找真实 `idiom.id`（未收录的词也可用词名兼容保留，优先映射真实 ID），写入 `useAppStore.setSelectedWordIds`；「用本组出题」直接跳 `/practice`，「加入出题词单」弹出 toast 提示已加入数量。
  - 若某易混组没有 `quickDrills`，底部按钮优雅置灰提示「本组暂无微测题」；有题时准确显示 `闪电微测 (${group.quickDrills.length}题)`。
- **`QuickDrillModal.tsx`**：
  - 完整渲染真实 `group.quickDrills`（不再依赖硬编码补题）；
  - 每题答完立即显示对错反馈与 `drill.analysis`；
  - 答完最后一题展示简短结题反馈（如 toast `微测完成：答对 X/N 题`），若答错则自动将该组对应已收录成语在 `db.studyProgress` 中标记/降级为 `模糊(1)`（若原为 `陌生` 则保持 `陌生`），形成「测错即回流复习」的真实学习闭环！

---

## 三、验收命令与汇报要求

完成后必须依次运行并通过：
1. `npx tsc --noEmit`
2. `npm run build`

请汇报：
1. 修改/新增的文件清单；
2. 真实功能自检清单（掌握度落库与首页实时联动、1000 词与 150 组分页检索、易混组 3 词对照表兼容、微测错题回流）；
3. `tsc` 与 `build` 执行结果。
