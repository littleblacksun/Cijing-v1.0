# 功能任务包 2（阶段 3 + 4 + 5 功能层）：LLM 真实出题、20% 权重混抽、双模式答题与本地题库闭环（交给 Codex Work Agent）

> **任务范围**：移除 `uiMockPractice.ts` 全部假数据与内存演示状态，实现完整的 **OpenAI 兼容 LLM 出题引擎、默认 20% 权重本地题库混抽、即时/交卷双模式答题持久化、本地题库管理与错题专练、完整 JSON 备份恢复与外部语库热导入**。
> **工作目录**：`/home/bubu/逻辑填空apk`
> **视觉约束**：**严格保留任务包 B 还原的高保真 UI 视觉样式与响应式布局**，仅替换底层数据源与接入真实业务逻辑。

---

## 一、文件边界（与功能任务包 1 完全隔离，无文件冲突）

本任务包仅新增/修改/清理以下文件（请勿修改 `HomePage`、`LibraryPage`、`IdiomDetailPage`、`ConfusionDetailPage`、`QuickDrillModal`、`AppShell`、`uiMockLearning.ts`、`learningService.ts`）：
- **新增服务层与共享常量**：
  - `src/services/llmClient.ts`（通用 OpenAI 兼容 API 客户端：连通性测试 + 行测逻辑填空 Prompt + 分批生成 + 强容错 JSON 解析 + Capacitor 原生 HTTP 兼容）
  - `src/services/quizEngine.ts`（20% 权重混抽算法 + 试卷会话读写 `db.quizSessions` + 本地题库指纹去重入库/移除 `db.localQuestions` + 练习/错题统计更新）
  - `src/services/backupService.ts`（完整数据备份导出/导入恢复 + 外部语库 JSON 动态导入）
  - `src/hooks/usePracticeData.ts`（Dexie `liveQuery` Hooks：读取 `appSettings`、`localQuestions`、`quizSessions`、全量选词列表与统一 UI 样式常量）
- **改造页面（接入真实服务与 Dexie，移除对 `uiMockPractice.ts` 的依赖）**：
  - `src/pages/PracticeSetupPage.tsx`
  - `src/pages/WordPickerPage.tsx`
  - `src/pages/QuizGeneratingPage.tsx`
  - `src/pages/QuizPlayPage.tsx`
  - `src/components/quiz/AnswerSheetModal.tsx`
  - `src/pages/QuizResultPage.tsx`
  - `src/pages/QuizReviewPage.tsx`
  - `src/pages/LocalBankPage.tsx`
  - `src/pages/SettingsPage.tsx`
  - `src/pages/ApiConfigPage.tsx`
- **清理**：全部页面迁移完成后，删除不再被引用的 `src/data/uiMockPractice.ts`（确保全局搜索零残留引用）。

---

## 二、核心模块详细规格

### 1. 通用 OpenAI 兼容 LLM 客户端（`src/services/llmClient.ts`）
1. **双端网络请求适配（关键！保障打包 APK 后无 CORS 问题）**：
   - 引入 `Capacitor` 与 `CapacitorHttp`（来自 `@capacitor/core`）。
   - URL 规范化：`trim()` 去掉末尾 `/`，若未以 `/chat/completions` 结尾则自动拼接 `/chat/completions`。
   - **Android 原生环境**（`Capacitor.isNativePlatform()`）：使用 `CapacitorHttp.post({ url, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey }, data: payload, connectTimeout: 30000, readTimeout: 90000 })`。
   - **浏览器开发预览环境**：使用 `fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal })`。若捕获 `TypeError` 网络错误，给出可读中文提示：「请求被拦截或网络不可达（浏览器预览可能受接口 CORS 限制，打包为安卓 APK 后将通过原生请求直连）」。
2. **真实连通性测试 `testLlmConnection(config)`**：
   - 发送轻量测试请求（`max_tokens: 64, temperature: 0`），要求返回 `{"ok": true}`；
   - 记录真实往返耗时（秒，保留 1 位小数），返回 `{ ok: true, latencyMs, message: '连接成功 · 延迟 X.Xs · 格式校验通过' }` 或 `{ ok: false, message: '连接失败（HTTP 状态码 / 具体报错）' }`。
3. **行测逻辑填空出题引擎 `generateLogicClozeQuestions({ config, idioms, count, signal, onProgress })`**：
   - **分批防截断策略**：若 `count > 10`（如 12、15、16、20 题），自动拆分为 2 批（每批 `<= 10` 题，如 12→6+6，15→8+7，20→10+10）顺序请求，每批完成后回调 `onProgress({ generated, total })`，且第二批 Prompt 中传入第一批已用题干关键词避免出重复题。
   - **高质量行测 Prompt 工程**：
     - 风格档位：`guokao`（国考真题风：政论/经济/文化/科技书面语境、两空与三空为主、强近义辨析干扰项）、`shengkao`（省考实战风：一空与两空均衡、注重语境呼应与感情色彩）、`basic`（基础巩固风：一空为主、语境线索清晰、侧重易望文生义辨析）。
     - 将用户选中的成语（附 `word`、`coreMeaning`、`confusableWith`）喂给模型，要求每题**必须严格围绕目标成语及其易混词命制**，四选项 A/B/C/D 长度与空数严格一致（单空为单成语，两空用顿号 `、` 分隔如 `因地制宜、有条不紊`）。
     - 要求**严格输出纯 JSON**（不要 markdown 代码块或多余前后缀），字段与 `QuestionItem` 对齐：`stem`（空缺统一用 `____`）、`options: { A, B, C, D }`、`answer: "A"|"B"|"C"|"D"`、`contextClues: string[]`、`overallAnalysis: string`、`optionAnalyses: { A, B, C, D }`、`relatedIdioms: string[]`。
   - **强鲁棒 JSON 提取与校验**：
     - 剥离 `<think>[\s\S]*?</think>`（兼容 DeepSeek-R1 等思考模型）、剥离 ```` ```json ```` 围栏、截取最外层 JSON 对象或数组；
     - 将题干中 `___+`、`（\s*）`、`\(\s*\)` 规范化为 `____`；
     - 校验 `options.A~D` 非空、`answer` 属于 `A|B|C|D`、`optionAnalyses.A~D` 缺失时安全兜底；
     - 单批解析失败或返回题数不足时自动重试 **1 次**；若用户触发 `signal.aborted` 立即中止并抛出 `AbortError`。

### 2. 权重混抽本地题库与答题会话引擎（`src/services/quizEngine.ts`）
1. **本地题库抽题配额公式（必须精确对齐需求）**：
   - `calcLocalQuota(totalCount: QuizCount, ratio: number)`:
     - `ratio <= 0` → `0`；
     - 否则 `Math.min(totalCount, Math.max(1, Math.round(totalCount * ratio)))`。
     - 验证默认 `ratio = 0.2`：`5→1`、`10→2`、`15→3`、`20→4`。
2. **本地旧题智能加权挑选 `pickLocalQuestions(targetIdiomWords: string[], quota: number)`**：
   - 读取 `db.localQuestions.toArray()`，当 `quota === 0` 或题库为空时返回 `[]`。
   - 对每道本地题打分排序：
     - 命中本次选定成语（`relatedIdioms` 与 `targetIdiomWords` 有交集）：`+100`
     - 曾答错过（`wrongCount > 0`）：`+30 + Math.min(20, wrongCount * 5)`
     - 久未练习（从未练过 `+25`，否则按距今时长线性加分最多 `+20`）
     - 加轻微随机扰动 `+ Math.random() * 8`，保证每次刷题不僵化。
   - 取前 `Math.min(quota, all.length)` 道题，标记 `source: 'local'`。
3. **混排组卷与持久化 `createQuizSession(...)`**：
   - 实际抽取 `actualLocal` 道本地旧题，需 AI 生成 `aiNeeded = totalCount - actualLocal` 道新题；
   - 若 `aiNeeded > 0`，调用 `generateLogicClozeQuestions`；
   - 使用 Fisher-Yates 洗牌将本地旧题与 AI 新题随机打散（不固定放开头/结尾），生成 `QuizSession`（含唯一 `id`、`localCount: actualLocal`、`aiCount: aiQuestions.length`、`status: 'in_progress'`、`startedAt: Date.now()`），写入 `db.quizSessions.put(session)` 并返回 `session.id`。
4. **本地题库去重入库、移除与做题统计同步**：
   - `computeQuestionFingerprint(stem, options)`：规范化空白与标点后生成确定性哈希字符串，写入 `LocalQuestion.fingerprint`（严格配合 Dexie `&fingerprint` 唯一索引，避免重复入库报错）。
   - `saveQuestionsToBank(questions: QuestionItem[]): Promise<{ added: number; skipped: number }>`：按 `fingerprint` 查重后批量写入 `db.localQuestions`，返回新入库数与已存在数。
   - `removeQuestionFromBank(questionIdOrFingerprint: string)`：安全删除对应本地题。
   - `recordLocalQuestionOutcome(question: QuestionItem, isCorrect: boolean)`：若该题在 `db.localQuestions` 中存在（按 `id` 或 `fingerprint` 匹配），原子更新 `practiceCount += 1`、`lastPracticedAt = Date.now()`、答错时 `wrongCount += 1`。
     - **即时模式**：选定答案锁定当刻调用一次；
     - **交卷模式**：交卷结算 `finishQuizSession` 时统一按最终答案更新一次（避免交卷前反复改选项导致重复计数）。
5. **本地错题/题库专项复习会话 `createLocalReviewSession(onlyWrong: boolean, maxCount = 15)`**：
   - 从 `db.localQuestions` 中按 `onlyWrong` 筛选（若错题为 0 则允许复习全部本地题或给出提示），创建 `mode: settings.defaultQuizMode`（或 `'instant'`）的 `QuizSession` 写入 `db.quizSessions` 并跳入答题页。

### 3. 完整备份导出、导入恢复与外部语库热导入（`src/services/backupService.ts`）
1. **导出个人数据备份**：
   - 从 Dexie 读取 `localQuestions`、`studyProgress`、`quizSessions`（最近 30 条）、`appSettings`（**默认移除 `llmApiKey` 避免意外泄露密钥**，在 toast 中提示「已导出备份（不含 API Key）」）。
   - 导出规范化 JSON `{ app: 'cijing', version: 2, exportedAt, localQuestions, studyProgress, quizSessions, settings }`，文件名为 `cijing-backup-YYYYMMDD.json`。
   - 兼容 Android WebView：若浏览器 Blob 下载失败，回退尝试 `navigator.clipboard.writeText` 兜底提示。
2. **导入恢复个人备份**：
   - 校验 `app === 'cijing'` 与字段结构，按 `fingerprint` / `idiomId` / `id` 增量合并写入 Dexie（不覆盖当前已保存的非空 `llmApiKey`），返回恢复统计（如「已恢复 X 道本地题、Y 条学习进度」）。
3. **外部语库热导入 `importExternalVocabJson(rawJsonText: string)`**：
   - 解析符合 `语库/SCHEMA.md` 规范的 `idioms` 或 `confusion_groups` JSON 文件，按 `word` / `title` 去重后增量写入 `db.idioms` / `db.confusionGroups`，让用户在手机上随时扩充语库而无需重新编译 APK！

---

## 三、各页面真实化接入清单

1. **`ApiConfigPage.tsx`（`UI-14`）**：
   - 初始值真实读取 `db.appSettings.get('default')`（不再硬编码 `demo-key` 和已连接态）；
   - 「测试连接」真实调用 `testLlmConnection`，测试中按钮显示加载态并禁用重复点击，下方真实显示测试结果（去掉演示角标）；
   - 「保存配置」真实写入 `db.appSettings.put(...)`（自动同步到 `useAppStore.settings`）。
2. **`SettingsPage.tsx`（`UI-13`）**：
   - 抽题权重滑块（`0%~50%`）、默认答题模式（`即时/交卷`）、护眼字号（`标准/偏大`）全部双向绑定真实 `db.appSettings`；
   - `LLM API 配置` 右侧徽章真实反映 `Boolean(settings.llmBaseUrl && settings.llmApiKey && settings.llmModel)`（`已配置` 绿 / `未配置` 灰）；
   - `内置语库管理` 显示真实词库与易混组计数（如 `1000词 · 150组`），点击打开底部抽屉支持查看统计 +「导入外部语库 JSON」；
   - `导出本地题库备份` / `导入恢复数据` 接入真实 `backupService`。
3. **`PracticeSetupPage.tsx`（`UI-06`） & `WordPickerPage.tsx`（`UI-07`）**：
   - `PracticeSetupPage` 顶部 API 状态徽章真实联动 `settings`；历史记录按钮点击打开最近历史试卷列表抽屉（读取 `db.quizSessions` 已完成会话，可点击直达历史报告/复盘，为空时提示「暂无历史记录」）；
   - 4 种选词策略全部真实查询 `db.idioms`、`db.studyProgress`、`db.confusionGroups`：
     - `手动自选`：使用 `useAppStore.selectedWordIds`（通过 `WordPickerPage` 或词库多选带入）；
     - `陌生词优先`：从 `db.studyProgress` 优先挑 `mastery === 0` / `1` 的成语（不足则补高频未学词）；
     - `易混组`：随机或轮换挑选 2~3 组真实易混组并映射到真实成语 ID；
     - `随机`：从 1,000 个成语中随机抽取 8~12 个高频词；
   - 题源分配条实时按 `settings.localBankRatio` + 当前 `db.localQuestions.count()` 展示真实配比（若本地库可用题少于目标比例，清晰标注如 `本地题库 0 题（目标 3 题，余量由 AI 补足）+ AI 新题 15 题`）；
   - `WordPickerPage` 支持检索全部 **1,000 个成语**（20~40 词分页加载避免卡顿），真实读取 `db.studyProgress` 掌握度色点，支持「随机挑10词」与确认回传 `useAppStore.selectedWordIds`。
   - 点击「生成 N 道习题」前校验：若需要 AI 出题（`aiNeeded > 0`）但未配置 LLM API，弹出明确 toast 提示并引导跳转 `/settings/api`；已配置则将本次组卷参数（选定成语 IDs、count、mode）传入 `/practice/generating`。
4. **`QuizGeneratingPage.tsx`（`UI-08`）**：
   - 进入页面后真正启动 `createQuizSession` 流程（严格防 React StrictMode 重复触发双请求！）；
   - 实时更新 3 步状态（1. 本地题库抽取完成数 → 2. LLM 分批生成实时进度 `X/Y` → 3. 校验组装完毕自动 `navigate('/quiz/' + sessionId, { replace: true })`）；
   - 底部等待小贴士从真实 `db.idioms` 中随机抽一条含 `commonMistake` 的高频成语轮播展示；
   - 若调用失败（Key 无效 / 额度不足 / 网络异常 / JSON 解析失败），在卡片内清晰展示错误原因 + 「重新生成」与「检查 API 配置」按钮；点击「取消生成」真实中止请求并返回 `/practice`。
5. **`QuizPlayPage.tsx`（`UI-09` & `UI-09b`）、`QuizResultPage.tsx`（`UI-10`）、`QuizReviewPage.tsx`（`UI-11`）**：
   - 全程从 `db.quizSessions.get(sessionId)` 读写（刷新页面或切走再进不丢答题记录与计时）；
   - 护眼字号真实读取 `settings.fontSize`；
   - `QuizPlayPage` 顶部题源徽章严格区分 `AI新题` / `本地旧题`（交卷模式下也可清晰展示模式标签）；
   - 两种模式严格遵守需求：
     - **即时解析模式**：点选即锁定正误、高亮语境线索、展开逐项解析、单题可一键「收入本地题库 / 已入题库」真实写入 `db.localQuestions`；
     - **交卷解析模式**：不提前泄题、支持选项划线排除、支持标旗记号与 `AnswerSheetModal` 任意跳题，点击交卷统一结算跳转 `QuizResultPage`；
   - `QuizResultPage` 真实计算正确率、总用时、AI/本地题数、答题分布矩阵、本卷薄弱成语；「标为陌生」真实批量写入 `db.studyProgress`（将对应成语 `mastery` 设为 `0`）；「全部收入题库」真实调用 `saveQuestionsToBank`；
   - `QuizReviewPage` 真实筛选全部/仅错题、逐题开关入库状态、「错题全入库」真实入库并提示新增数。
6. **`LocalBankPage.tsx`（`UI-12`）**：
   - 真实通过 `liveQuery` 读取 `db.localQuestions` 与 `settings.localBankRatio`；
   - 统计卡真实显示总收藏数、错题数（`wrongCount > 0`）、当前混抽权重；
   - 题库为空时展示友好 `EmptyState`（引导前往 AI 智能刷题并收藏优质题目）；
   - 真实支持按题干/成语搜索、按「全部 / 仅错题 / 最近入库 / 最久未练」过滤排序、「查看解析」底部抽屉查看完整解析、「移除」真实删除、「发起本地错题专项复习」（若无错题但有收藏题时可降级发起本地题库复习并提示）。

---

## 四、验收命令与汇报要求

完成后必须依次运行并通过：
1. `npx tsc --noEmit`
2. `npm run build`
3. 确认全局已无 `uiMockPractice` 残留导入。

请汇报：
1. 新增/修改/删除的文件清单；
2. 核心功能自检结果（LLM 客户端原生/Web 双端兼容与分批防截断、20% 权重混抽与余量不足兜底、即时/交卷双模式持久化、指纹去重入库、备份导入导出与外部语库热导入）；
3. `tsc` 与 `build` 执行结果。
