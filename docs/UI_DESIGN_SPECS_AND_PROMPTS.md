# 「词境」全应用 15 页分阶段 UI 设计规范与 Codex `imagegen` 提示词手册

> **用途说明**：本文档面向 **Codex（`imagegen` 视觉生图 + 前端 UI 还原）**。
> - **视觉基准**：Android 移动端竖屏 `390×844`（9:19.5），**清新护眼效率风**（参考粉笔 / 墨墨背单词）。
> - **生图输出目录约定**：`docs/ui-mockups/<编号>.png`（如 `docs/ui-mockups/UI-00.png`）。
> - **严格统一约束**：所有 15 张页面必须共享同一套色彩、字体、卡片圆角与图标语言，避免风格割裂。

---

## 一、全局视觉设计锚点（Global Visual System，所有页面共享）

| Token | 色值 / 规范 | 用途 |
| :--- | :--- | :--- |
| 页面底色 `bg-page` | `#F5F7FA` | 全局护眼浅灰白背景，避免纯白刺眼 |
| 卡片表面 `bg-surface` | `#FFFFFF` | 内容卡片、表单容器、底部导航栏 |
| 次级底色 `bg-subtle` | `#EEF2F7` | 搜索框、胶囊底色、表格表头、遮罩块 |
| 主品牌色 `primary` | `#2563EB`（浅底 `#EFF6FF`） | 主按钮、选中态、核心高亮、进度条 |
| 辅助青蓝 `accent` | `#0EA5E9`（浅底 `#F0F9FF`） | 异字高亮、语境线索标签、AI 标识 |
| 语义绿 `success` | `#10B981`（浅底 `#ECFDF5`） | 正确答案、褒义标签、「掌握」态、连接成功 |
| 语义红 `danger` | `#EF4444`（浅底 `#FEF2F2`） | 错误选项、贬义标签、误用雷区、「陌生」态 |
| 语义橙 `warning` | `#F59E0B`（浅底 `#FFFBEB`） | 易望文生义预警、「模糊」态、本地旧题徽章 |
| 正文主色 `text-primary` | `#0F172A` | 标题、成语正文、题干文字 |
| 正文次色 `text-secondary` | `#475569` | 释义说明、解析段落 |
| 辅助灰 `text-muted` | `#94A3B8` | 拼音、时间戳、占位提示、未选中图标 |
| 分割线 `border` | `#E2E8F0` | 1px 柔和描边 |
| 卡片圆角 / 阴影 | `rounded-2xl (16px)`，`0 2px 10px rgba(15,23,42,0.04)` | 轻盈分层，不使用厚重阴影 |
| 图标风格 | 线性圆角（Lucide Icons，stroke 1.75px） | 简洁克制，无复杂拟物/3D 图标 |

### 通用 `imagegen` 风格前缀（每条 Prompt 均已内置）
- **画幅与呈现**：`Clean flat mobile app UI design mockup, 9:19.5 vertical screen only (edge-to-edge full screen, NO physical phone hardware bezel, NO hands, NO angled 3D mockup, NO background desk).`
- **风格**：`Modern Chinese educational study app aesthetic inspired by Fenbi and MaiMemo, soft eye-friendly light gray background #F5F7FA, crisp white rounded cards #FFFFFF with 16px border radius and ultra-subtle elevation, primary indigo-blue #2563EB and sky-blue #0EA5E9 accents, generous whitespace, sharp PingFang/Noto Sans SC Chinese typography, minimal 1.75px line icons, clean flat vector UI.`

---

## 二、阶段 1：全局设计规范与导航壳（1 张）

### `UI-00` 全局设计系统规范卡（Design System & App Shell）
- **对应文件**：`src/styles/tokens.css`、`src/components/layout/AppShell.tsx`、`src/components/ui/*`
- **布局描述**：
  - **区域 1（顶部）**：品牌标识「词境 · 逻辑填空」+ 主色/辅助色/语义色 7 枚圆角色卡（标色值）。
  - **区域 2（中上）**：常用标签规范（`褒义` 绿、`贬义` 红、`中性` 灰、`高频` 蓝、`易望文生义` 橙、`AI 新题` 青、`本地旧题` 琥珀）与主/次/描边按钮规范。
  - **区域 3（中下）**：标准成语摘要卡片样式 + 1 条 4 级掌握度指示胶囊（陌生/模糊/熟悉/掌握）。
  - **区域 4（底部）**：标准 4-Tab 底部导航栏预览：`学习`（选中蓝）、`词库`、`刷题`、`题库`。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile UI design system styleguide sheet, vertical 9:19.5 layout, NO phone frame, NO 3D perspective. Soft light gray background #F5F7FA with organized white rounded cards (#FFFFFF, 16px radius). Top header "词境 UI 设计规范" in clean dark slate #0F172A Noto Sans SC font. Section 1: horizontal color palette swatches labeled #2563EB, #0EA5E9, #10B981, #EF4444, #F59E0B, #F5F7FA. Section 2: pill tags row showing "褒义" (soft green), "贬义" (soft red), "中性" (soft gray), "易望文生义" (soft amber), "AI新题" (soft sky blue), "本地旧题" (soft orange), plus primary solid blue button and secondary outlined button. Section 3: sample idiom card with title "不以为然", pinyin "bù yǐ wéi rán", short Chinese definition, and 4 mastery dots. Bottom bar preview: clean white bottom navigation bar with 4 minimalist line icons and labels "学习" (active #2563EB), "词库", "刷题", "题库". Ultra-crisp modern Chinese learning app aesthetic inspired by Fenbi and MaiMemo.
  ```

---

## 三、阶段 2：成语深度理解与易混对比模块（5 张）

### `UI-01` 首页学习看板（Home）
- **路由与目标文件**：`/` → `src/pages/HomePage.tsx`
- **布局描述**：
  - **顶部栏**：左侧问候与标题「词境 · 今日攻克」，右侧连续打卡小徽章（如 `已坚持 7 天`）。
  - **核心看板卡片（纯白大卡）**：左侧环形进度条展示「今日目标 `12/20` 词」，右侧展示 3 项指标（待复习 `8`、已掌握 `64`、本地题库 `32` 题），卡片底部一个通栏圆角主按钮「继续学习 · 待复习 8 词」。
  - **快捷功能双宫格（2 列并排卡）**：
    - 左卡（浅蓝渐变点缀）：「易混词辨析」副标题 `50+ 组高频对比`
    - 右卡（浅青渐变点缀）：「AI 智能出题」副标题 `自选词 · 混抽旧题`
  - **高频易混推荐区（纵向卡片列表，展示 2 张）**：标题「每日一辨」，卡片显示如 `不以为然 vs 不以为意`、`休戚与共 vs 息息相关`，带「一字之差」标签与右侧箭头。
  - **底部导航栏**：4-Tab，「学习」高亮。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel, NO hands. Modern Chinese civil-service exam study app "词境" Home screen, inspired by Fenbi and MaiMemo. Soft eye-friendly gray background #F5F7FA. Top status bar and header: left bold title "词境" with subtitle "逻辑填空专项训练", right soft amber streak pill "已坚持 7 天". Hero white rounded card (16px radius): left clean blue circular progress ring showing "12/20 今日目标", right 3 neat metric blocks ("待复习 8", "已掌握 64", "本地题库 32"), bottom full-width solid indigo-blue button #2563EB "开始今日复习". Below hero: two side-by-side white feature cards with soft pastel icon badges — left "易混词对比" ("高频近义辨析"), right "AI 智能组卷" ("自选成语出题"). Below that section header "每日一辨" with 2 crisp white comparison preview cards: "不以为然 vs 不以为意" (tag "一字之差") and "休戚与共 vs 息息相关" (tag "语义轻重"). Fixed white bottom tab bar with 4 clean line icons: "学习" (active #2563EB), "词库", "刷题", "题库". Sharp Chinese typography, generous whitespace, calm eye-care aesthetic.
  ```

### `UI-02` 词库双视图页（成语列表 & 易混组 + 多选浮条）
- **路由与目标文件**：`/library` → `src/pages/LibraryPage.tsx`
- **布局描述**：
  - **顶部栏**：居中分段控件（Segmented Control）切换「成语库」/「易混组」，右侧按钮「多选出题」（激活态可变为「取消」）。
  - **搜索与筛选区**：圆角灰底搜索框「搜索成语、拼音或释义」；下方可横向滚动的筛选胶囊栏：`全部`（选中蓝）、`陌生`、`模糊`、`国考高频`、`易望文生义`、`褒贬易错`。
  - **成语列表区（展示多选模式下的状态以便还原）**：每张白卡包含左侧复选圆框、成语标题（如 `首当其冲`、`差强人意`、`不以为然`、`万人空巷`）、右侧频次星标或掌握度小圆点（红/橙/蓝/绿）、单行核心释义、底部 2~3 个精简属性标签（如 `中性`、`易望文生义`、`含易混组`）。
  - **悬浮操作条（多选激活时显示在底部导航上方）**：深靛蓝悬浮胶囊条，左侧「已选 6 个成语」，右侧亮白按钮「去 AI 出题 →」。
  - **底部导航栏**：4-Tab，「词库」高亮。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese idiom study app Library screen on #F5F7FA background. Top bar with centered pill segmented control ("成语库" active white pill, "易混组" inactive) and right text button "完成" in #2563EB. Below: soft gray rounded search input "搜索成语、拼音或释义". Below search: horizontal filter pills row ("全部" solid #2563EB, "陌生", "国考高频", "易望文生义", "褒贬易错"). Main list of crisp white rounded cards in multi-select mode, each card has a left circular checkbox (2 cards checked in blue #2563EB), bold Chinese idiom ("首当其冲", "差强人意", "不以为然", "万人空巷"), right colored mastery pill ("陌生" red / "模糊" amber / "熟悉" blue), one-line concise meaning, and small muted attribute tags ("中性", "易望文生义"). Floating above the bottom tab bar: an elevated indigo pill bar showing "已选 2 个成语" on the left and a crisp white button "去 AI 出题 →" on the right. Bottom 4-tab bar with "词库" active in #2563EB. Clean flat vector UI, sharp Chinese text.
  ```

### `UI-03` 成语深度理解卡 / 闪卡页（六维记忆法）
- **路由与目标文件**：`/library/idiom/:id` → `src/pages/IdiomDetailPage.tsx`
- **布局描述**：
  - **顶部栏**：返回箭头、进度指示「14 / 120」、右侧「收藏/加入出题篮」图标按钮。
  - **主卡 1（头部概览卡）**：大号成语正文「首当其**冲**」（关键字 `冲` 用青蓝色底纹高亮）、拼音 `shǒu dāng qí chōng`、右上角橙色预警角标「易望文生义」；下方「核心释义」精炼一句话；底部 4 枚属性小胶囊：`感情：中性`、`轻重：较重`、`对象：人/事件`、`频次：★★★★★`。
  - **主卡 2（核心语素拆解 + 误用避坑卡）**：
    - 浅青色提示块「关键语素拆解」：高亮“冲 = 要冲、首当面对”，破除误解。
    - 浅红色柔和警示块「行测误用雷区」：指明不可误作“冲锋在前、带头做某事”。
  - **主卡 3（真题感例句 · 遮罩自测卡）**：标题「语境自测（点击揭晓）」，例句中成语位置呈圆角虚线浅蓝遮罩块（下方展示第二句已揭晓高亮态示例），句子中的语境线索词带浅蓝下划线；附「常用搭配」短标签。
  - **底部关联入口条**：「查看关联易混辨析：首当其冲 vs 迎难而上 →」。
  - **固定底部掌握度打卡栏**：4 个等宽圆角轻色按钮横向排布：`陌生`（柔红）、`模糊`（柔橙）、`熟悉`（柔蓝）、`掌握`（柔绿），点击后切下一词。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese idiom learning flashcard detail page on #F5F7FA background. Top bar: left back arrow, center muted counter "14 / 120", right bookmark/add-to-quiz icon. Card 1 (white, 16px radius): large bold idiom "首当其冲" with the last character "冲" highlighted in soft sky-blue badge #E0F2FE, pinyin "shǒu dāng qí chōng", top-right soft amber badge "易望文生义", clear core definition paragraph below, and a wrap row of clean attribute tags ("感情: 中性", "轻重: 较重", "频次: 超高频"). Card 2 (white): two structured callout boxes — a soft blue box titled "语素拆解" explaining "冲=要冲、最先受到冲击", and a soft blush-red box titled "行测避坑" warning against misuse. Card 3 (white): titled "语境例句 · 点击自测" showing a formal Chinese sentence with a dashed blue blur/mask pill "点击揭晓成语" inline in the sentence and subtle blue underlines under context clue words. Compact linked card below: "进入易混辨析组 →". Fixed bottom mastery action bar with 4 equal rounded pastel buttons: "陌生" (soft red), "模糊" (soft amber), "熟悉" (soft blue), "掌握" (soft green). Crisp typography, airy spacing.
  ```

### `UI-04` 易混成语对比辨析页（四重辨析法）
- **路由与目标文件**：`/library/confusion/:id` → `src/pages/ConfusionDetailPage.tsx`
- **布局描述**：
  - **顶部栏**：返回按钮、标题「易混成语辨析」、右侧「用本组 AI 出题」小文字按钮。
  - **对比焦点头卡（浅蓝渐变柔和顶卡）**：居中并排展示对比成语，异字用鲜明青蓝/靛蓝底色高亮：`不以为[然]` **VS** `不以为[意]`；下方一句话总结核心分叉点。
  - **核心差异对照矩阵卡（白卡内嵌轻表格）**：左侧维度列（`侧重点`、`感情色彩`、`语义轻重`、`适用对象`、`常见误区`），右侧 2 列清晰对照（超过 2 词支持顶部标签切换或紧凑横滑），文字简短整齐不拥挤。
  - **同句语境对照卡（最小对立语境）**：展示 2 条高相似例句卡，每条内用绿色胶囊标「宜选：不以为然」、红色删除线胶囊标「误选：不以为意」，下方 1 行蓝色线索解析。
  - **底部固定操作栏**：左侧描边按钮「AI 组卷特训」，右侧主蓝按钮「闪电二选一小测（2 题）」。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese confusable idioms comparison screen on #F5F7FA background. Top bar: back arrow, title "易混辨析", right blue link "用本组出题". Header comparison card with soft blue tint: side-by-side bold idioms "不以为然" and "不以为意" separated by a small circular "VS" badge, with differing characters "然" and "意" highlighted in crisp blue pill backgrounds; below is a concise one-line summary distinguishing the two. Main white card "核心差异对照表": clean 2-column comparison table with left subtle gray dimension labels ("核心侧重", "感情色彩", "适用对象", "避坑提醒") and clear structured Chinese text in each cell, subtle 1px #E2E8F0 borders. Below: white card "同境换词对照" showing two example sentences with green "✓ 宜选: 不以为然" and red "✕ 误选: 不以为意" inline pills plus one-line clue explanation. Fixed bottom white bar with two buttons: left outlined "加入出题词单" and right solid #2563EB button "闪电微测 (2题)". Clean flat modern study app design.
  ```

### `UI-05` 易混闪电微练弹窗/浮层（Quick Drill）
- **路由与目标文件**：`src/components/confusion/QuickDrillModal.tsx`
- **布局描述**：
  - **背景**：半透明深灰遮罩覆盖在 `UI-04` 之上，底部升起大圆角白底弹窗（占屏高约 68%）。
  - **弹窗头部**：顶部小拖拽条、标题「闪电微测 · 第 1/2 题」、右侧关闭 `×`。
  - **题干区**：浅灰底圆角框展示一道短逻辑填空例句，空缺处为加粗蓝色下划线。
  - **二选一大按钮区**：2 个宽大圆角选项卡片上下/并排显示（如 `A. 不以为然`、`B. 不以为意`），展示**已答状态**：正确项呈柔绿底 + 绿勾，误选项若被选呈柔红底 + 红叉。
  - **即时一句话解析气泡**：浅绿/浅蓝提示条展示本题语境线索。
  - **底部主按钮**：「下一题 →」（或最后一题显示「完成微测」）。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Dimmed backdrop over a blurred comparison page with a crisp white bottom sheet modal (top corners 24px radius, occupying lower 65% of screen). Modal handle bar at top, header "闪电微测 · 1/2" with close X button. Inside: soft light gray #F5F7FA question box containing a short Chinese fill-in-the-blank sentence with a highlighted blank underline. Below: two large tactile rounded option cards — Option A "不以为然" (neutral white card with subtle border) and Option B "不以为意" (selected correct state: soft mint green background #ECFDF5, #10B981 border, green checkmark icon on right). Below options: compact light blue explanation callout explaining the context clue. Bottom full-width solid #2563EB button "下一题". Crisp Chinese learning app UI.
  ```

---

## 四、阶段 3：LLM 智能出题与组卷配置（3 张）

### `UI-06` AI 刷题组卷配置页（Practice 主页）
- **路由与目标文件**：`/practice` → `src/pages/PracticeSetupPage.tsx`
- **布局描述**：
  - **顶部栏**：标题「AI 智能刷题」，右侧小图标入口「历史记录」与「API 状态绿点（已配置）」。
  - **卡片 1（选定目标成语）**：标题「1. 选择考察成语」，右侧「重选/添加」蓝字；内含 4 个快捷策略小标签（`手动自选`、`陌生词优先`、`易混组特训`、`随机抽取`）；下方以蓝底小胶囊展示已选成语预览（如 `不以为然 ×`、`首当其冲 ×`、`差强人意 ×`、`+ 更多 7 词`）。
  - **卡片 2（题目数量与题源配比预览）**：标题「2. 选择题量」，4 枚等宽圆角胶囊按钮：`5 题`、`10 题`、`15 题`（选中蓝）、`20 题`。下方紧跟一块**可视化的题源构成进度条**（双色条）：
    - 标注：`本次预计：3 道本地题库旧题 (20%) + 12 道 AI 实时新题`
    - 右侧带小字链「调整比例 >」（跳转设置）。
  - **卡片 3（答题模式选择）**：标题「3. 选择答题模式」，两张可切换大卡片并排：
    - 左卡（选中蓝描边 + 勾）：**即时解析模式**（「选完立刻看答案与解析，适合边学边练」）
    - 右卡（未选灰描边）：**交卷解析模式**（「全部做完统一看成绩与解析，模拟实战」）
  - **主操作按钮**：通栏高辨识度渐变靛蓝主按钮「立即生成 15 道逻辑填空题」。
  - **底部导航栏**：4-Tab，「刷题」高亮。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app AI Quiz Setup screen on #F5F7FA background. Top header: bold "AI 智能刷题" on left, right small pill with green dot "API 已就绪" and history icon. Card 1 (white, 16px radius): "1. 选择考察成语", 4 small strategy chips ("手动自选" active, "陌生词优先", "易混组", "随机"), below wrapped sky-blue removable idiom pills ("不以为然 ×", "首当其冲 ×", "差强人意 ×", "万人空巷 ×", "+ 添加成语"). Card 2 (white): "2. 题目数量", 4 equal pill buttons "5题", "10题", "15题" (active solid #2563EB), "20题". Beneath it, a clean dual-color horizontal ratio bar (20% amber, 80% blue) with caption "题源分配：本地题库 3 题 (20%) + AI 新题 12 题" and small link "调整比例". Card 3 (white): "3. 答题模式", two side-by-side selectable cards — left selected (#2563EB border, soft blue tint) "即时解析" ("每题立刻出解析"), right unselected "交卷解析" ("全部答完统一复盘"). Large prominent primary #2563EB rounded button "生成 15 道习题". Bottom 4-tab bar with "刷题" active. Clean Fenbi-inspired UI.
  ```

### `UI-07` 成语选择器全屏页（Word Picker）
- **路由与目标文件**：`/practice/picker` → `src/pages/WordPickerPage.tsx`
- **布局描述**：
  - **顶部栏**：返回/关闭按钮、标题「选择出题成语」、右侧「清空」。
  - **搜索与快捷全选栏**：搜索框 + 横向筛选胶囊（`全部`、`陌生`、`模糊`、`易混词`、`高频`）+ 一键勾选「随机挑 10 个」小按钮。
  - **双列紧凑网格词卡**：相比词库列表更紧凑（2 列网格），每格展示成语名、掌握度色点、右上角蓝勾选中态，一屏可快速勾选十几个词。
  - **底部固定确认栏**：左侧显示已选数量「已选 8 个成语（建议 5~20 个）」，右侧主按钮「确认选词」。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese app Idiom Picker screen on #F5F7FA background. Top bar: close arrow, centered title "选择出题成语", right muted button "清空". Search bar below, followed by horizontal filter pills ("全部", "陌生", "模糊", "国考高频") and a subtle blue chip "🎲 随机挑10词". Main area: clean 2-column grid of compact white rounded tiles, each showing a bold 4-character Chinese idiom, a tiny colored mastery dot, and a top-right checkbox; selected tiles have #2563EB border, #EFF6FF soft blue background, and blue checkmarks. Fixed white bottom bar: left text "已选 8 个成语", right solid #2563EB pill button "确认使用". Minimalist, clean spacing, eye-friendly light theme.
  ```

### `UI-08` AI 出题生成进度与容错页（Generating State）
- **路由与目标文件**：`/practice/generating` → `src/pages/QuizGeneratingPage.tsx`
- **布局描述**：
  - **居中纯白呼吸感卡片**：
    - 顶部柔和青蓝圆环脉冲/书本生成图标（极简扁平矢量，无浮夸特效）。
    - 主标题「正在为您命制行测逻辑填空卷…」
    - 进度条（如 68%），清晰列出分步状态清单：
      - `✓ 已从本地题库抽取 3 道旧题（含 2 道错题）`（绿色完成态）
      - `⟳ 正在调用大模型生成 12 道 AI 新题 (8/12)…`（蓝色进行态）
      - `○ 校验选项与逐项解析格式`（灰色等待态）
    - 底部一句随机展示的「等待小贴士」（展示一个高频成语的一句话避坑口诀，利用等待时间碎片学习！）。
  - **底部次级按钮**：「取消生成」。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app AI Quiz Generating progress screen on soft #F5F7FA background. Centered spacious white rounded card (20px radius). Top minimalist flat blue sparkle-document icon inside a soft #EFF6FF circle. Bold centered title "正在生成逻辑填空试卷" and subtitle "15 题 · 即时解析模式". Clean horizontal blue progress bar at 68%. Below: 3 vertical step status rows — Step 1 green check "已抽取本地题库 3 题 (20%)", Step 2 blue spinner "正在调用 LLM 生成 AI 新题 (8/12)...", Step 3 muted circle "校验题干与逐项解析结构". Below the main card: a soft pale-blue tip card "等待顺手记一词：差强人意 = 大体上还能让人满意（非不满意）". Bottom centered subtle outlined cancel button "取消生成". Calm, refined educational UI.
  ```

---

## 五、阶段 4：双模式沉浸式答题与复盘系统（3 张）

### `UI-09` 沉浸式答题页（核心页：同时提供即时解析态 + 交卷答题卡抽屉参考）
- **路由与目标文件**：`/quiz/:sessionId` → `src/pages/QuizPlayPage.tsx`
- **说明**：本页是刷题核心，建议生成 **1 张主图 `UI-09.png`（展示即时解析模式选完后的完整状态，覆盖题干、A/B/C/D 选项、划线排除图标、展开解析区、加入本地题库按钮）**，以及可选附带 **`UI-09b.png`（交卷模式下的纯净答题态 + 底部弹出答题卡抽屉）**。
- **主图 `UI-09` 布局描述**：
  - **顶部栏**：返回退出图标、题号进度 `3 / 15`、题源小徽章（`AI 新题` 青色 或 `本地旧题` 琥珀色）、右侧计时 `02:18` 与「答题卡」九宫格图标；紧贴顶部栏下方一条 3px 细蓝进度条。
  - **题干区（白卡）**：行测单空/两空标准政论风格题干，空缺处以蓝色加粗下划线标示；已作答后题干内关键提示词自动带柔和荧光黄/浅蓝底高亮。
  - **A/B/C/D 选项区（4 张独立圆角卡片）**：
    - 左侧圆形字母徽章 `A` `B` `C` `D`，中间选项成语（如两空用 `、` 分隔），右侧保留极轻的「划除」小图标（未锁定态可点击给选项加删除线）。
    - 示例展示选中误项 `B`（柔红底 + 红叉）同时正确答案 `C` 自动高亮（柔绿底 + 绿勾）。
  - **即时解析展开区（答题后平滑滑出，白卡）**：
    - 顶行左侧「正确答案：C · 回答错误」，右侧醒目胶囊开关按钮「☆ 收入本地题库」（点击后变琥珀色「★ 已入本地题库」）。
    - 「语境线索」短标签组 + 「逐项辨析」清晰列出 A/B/C/D 为何选/为何排除。
    - 底部关联成语小芯片（点击可弹窗速览词卡）。
  - **底部操作栏**：左侧「上一题」，右侧主蓝按钮「下一题」。
- **Codex `imagegen` Prompt（`UI-09.png` 即时解析核心态）**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese civil-service exam quiz screen inspired by Fenbi app, on #F5F7FA background. Top bar: left exit back arrow, center "3 / 15" with small sky-blue pill "AI新题", right timer "02:18" and grid answer-sheet icon, with a thin 3px #2563EB progress bar underneath. White rounded question card with crisp readable Chinese logic-cloze paragraph featuring two bold blue blank underlines and subtle pale-blue highlights on context keywords. Below: 4 clean vertical rounded option cards A, B, C, D with circular letter badges — Option A neutral white, Option B wrong selected state (soft red #FEF2F2, red border #EF4444, X icon), Option C correct state (soft green #ECFDF5, green border #10B981, check icon), Option D neutral white with subtle strikethrough-exclude icon on right. Below options: expanded white explanation card — header row showing "正确答案 C" on left and an interactive amber pill button "★ 收入本地题库" on right; inside showing "语境线索" chips and structured concise bullet breakdown for options A/B/C/D. Fixed white bottom bar with "上一题" and primary blue button "下一题". Ultra-clean readable typography.
  ```
- **Codex `imagegen` Prompt（`UI-09b.png` 交卷模式 + 底部答题卡抽屉，可选增强）**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Chinese exam app quiz page in Exam Mode ("交卷模式") with a white bottom Answer Sheet drawer open over dimmed quiz options. Top bar shows "8 / 15" and "交卷模式" tag. The bottom sheet (24px top radius) displays title "答题卡", legend dots ("已答" blue, "未答" gray, "标记" amber), a clean 5-column grid of circular question numbers 1 to 15 (1-7 solid blue, 8 outlined blue active, 9-15 light gray, number 4 has a small amber bookmark dot). Bottom full-width solid #2563EB button "立即交卷并查看解析". Clean flat Fenbi-style mobile UI.
  ```

### `UI-10` 交卷成绩结算报告页（Quiz Result）
- **路由与目标文件**：`/quiz/:sessionId/result` → `src/pages/QuizResultPage.tsx`
- **布局描述**：
  - **顶部栏**：返回首页按钮、标题「练习报告」。
  - **成绩概览大卡（白卡 + 柔和顶部浅蓝光晕）**：
    - 中央醒目环形正确率图（如 `80%`，下方小字 `答对 12 / 15 题`）。
    - 下方 3 列核心统计：`用时 08:42`、`AI 新题 12 道`、`本地旧题 3 道`。
  - **答题情况矩阵卡**：标题「答题卡总览（点击题号直达解析）」，5 列圆圈矩阵，绿色代表答对、红色代表答错，带微小角标区分本地旧题。
  - **本卷薄弱成语提示卡**：自动汇总答错题涉及的成语（如 `首当其冲`、`不以为然`、`差强人意`），右侧小按钮「一键标记为陌生」。
  - **底部固定操作栏**：左侧描边按钮「一键全部入库」，右侧主蓝按钮「查看全部解析 / 错题复盘」。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app Quiz Result Report screen on #F5F7FA background. Top bar: close icon and centered title "练习报告". Hero white rounded card: large clean circular donut chart in #2563EB and #10B981 showing "80%" bold in center with subtitle "答对 12 / 15 题"; below 3 clean stat columns ("总用时 08:42", "AI新题 12", "本地旧题 3"). Second white card "答题分布": neat 5-column grid of circular numbered badges 1 to 15 (12 soft green with #10B981 text, 3 soft red with #EF4444 text). Third white card "本卷薄弱成语": wrapped soft red-tinted chips ("首当其冲", "不以为然", "差强人意") with subtle right action "标为陌生". Fixed bottom bar with two buttons: left outlined "全部收入题库" and right solid #2563EB "查看解析复盘". Calm, clear educational data visualization.
  ```

### `UI-11` 整卷解析复盘页（Review & Batch Save）
- **路由与目标文件**：`/quiz/:sessionId/review` → `src/pages/QuizReviewPage.tsx`
- **布局描述**：
  - **顶部栏**：返回、居中分段开关「全部解析 (15)」/「只看错题 (3)」，右侧「批量入库」。
  - **题目复盘滚动卡片（展示 1~2 张完整复盘卡）**：
    - 卡片顶部：题号 `第 4 题` + 错题红标「你的选择 B · 正确答案 C」+ 右侧独立的入库切换胶囊按钮（`★ 已入本地题库` / `+ 收入本地题库`）。
    - 题干与正确选项高亮展示。
    - 精简清晰的「核心解析与干扰项排除」区块。
    - 底部涉及成语快捷跳转芯片。
  - **底部摘要条**：显示「本卷已收入本地题库 5 / 15 题」，右侧「完成并返回」按钮。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app Quiz Review screen on #F5F7FA background. Top bar: back arrow, centered pill segmented toggle ("全部 15" inactive, "仅错题 3" active white pill), right blue text "错题全入库". Scrollable list of detailed white review cards: Card 1 header shows "第 4 题", red status pill "你选 B · 正解 C", and a right amber toggle button "★ 已入题库"; below is the Chinese fill-in-the-blank stem with highlighted context words, compact 4-option summary showing green C and red B, and a clean light-gray analysis block breaking down why C fits and why A/B/D fail. Card 2 partially visible below with "+ 收入本地题库" outlined button. Fixed white bottom summary bar showing "已入库 5 题" on left and solid #2563EB button "完成复盘" on right. Clean Fenbi-inspired review layout.
  ```

---

## 六、阶段 5：本地题库管理、权重抽题与 API 设置（3 张）

### `UI-12` 本地题库管理页（我的题库 Tab 主页）
- **路由与目标文件**：`/bank` → `src/pages/LocalBankPage.tsx`
- **布局描述**：
  - **顶部栏**：标题「本地题库」，右侧两个图标按钮：「设置中心（齿轮）」与「API 配置（钥匙/闪电）」。
  - **题库统计与快捷复习卡（柔和浅蓝白卡）**：展示「已收藏题目 `48` 道」「其中错题 `14` 道」「当前混抽权重 `20%`」；右侧主按钮「专练本地错题」。
  - **搜索与筛选栏**：搜索框「按题干或成语搜索题库」+ 筛选胶囊：`全部 (48)`、`历史错题 (14)`、`最近入库`、`最久未刷`。
  - **本地题目卡片列表**：每张白卡展示 2 行省略的题干预览、关联成语蓝标签、历史正确/错误微统计（如 `练过 3 次 · 错 1 次`）、底部操作行：「展开解析」「移出题库」。
  - **底部导航栏**：4-Tab，「题库」高亮。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app Local Question Bank screen on #F5F7FA background. Top bar: bold title "本地题库" on left, two clean line icons on right (API plug icon and Settings gear icon). Top summary white card with subtle blue accent: 3 compact metrics ("总收藏 48题", "错题 14题", "混抽权重 20%") and a bottom full-width soft-blue tinted action button "发起本地错题专项复习". Below: rounded search bar "搜索题干或成语" and horizontal filter pills ("全部 48" active blue, "仅错题 14", "最近入库", "最久未练"). Scrollable list of crisp white question cards: each shows a 2-line Chinese logic-cloze preview, blue idiom tags ("首当其冲", "不以为然"), tiny stats badge ("错 1 / 练 3"), and a clean bottom row with "查看解析" and subtle red "移除" actions. Bottom 4-tab bar with "题库" active in #2563EB. Clean modern light UI.
  ```

### `UI-13` 设置中心页（抽题权重与数据管理）
- **路由与目标文件**：`/settings` → `src/pages/SettingsPage.tsx`
- **布局描述**：
  - **顶部栏**：返回按钮、标题「偏好设置」。
  - **分组卡 1（本地题库混抽比例 — 核心特色）**：
    - 标题「本地题库抽题权重」，右侧加粗蓝色数字 `20%`。
    - 可拖动滑块（范围 `0%` ~ `50%`，步长 `5%`）。
    - 下方 4 列迷你预览网格，实时联动显示各题量下的旧题数：`5题→抽1`、`10题→抽2`、`15题→抽3`、`20题→抽4`。
    - 底部小字说明：「本地题库余量不足时，自动由 AI 补足剩余题量」。
  - **分组卡 2（大模型与答题偏好）**：列表行形式，带右箭头或开关：
    - 「LLM API 接口配置」（右侧绿色小标签 `已配置 · deepseek-chat` >）
    - 「默认答题模式」（右侧分段小开关 `即时` / `交卷`）
    - 「题目字号大小」（`标准` / `偏大护眼`）
  - **分组卡 3（语库与数据备份）**：
    - 「导入外部语库 JSON」（显示当前内置 `320 词 · 65 组`）
    - 「导出本地题库与进度备份（JSON）」
    - 「从备份文件恢复数据」
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app Settings screen on #F5F7FA background. Top bar: back arrow and centered title "偏好设置". Card 1 (white, 16px radius): header "本地题库抽题权重" with bold blue value "20%" on right; clean custom blue slider from 0% to 50% positioned at 20%; below slider a 4-column soft gray preview strip showing "5题→抽1", "10题→抽2", "15题→抽3", "20题→抽4"; small muted helper caption underneath. Card 2 (white): grouped clean setting rows with subtle dividers — Row 1 "LLM API 配置" with green badge "已连接" and chevron; Row 2 "默认答题模式" with inline toggle "即时 / 交卷"; Row 3 "护眼字号" with "标准 / 偏大". Card 3 (white): "语库与备份" rows — "内置语库管理 (320词)", "导出本地题库备份", "导入恢复数据". Crisp minimalist iOS/Android modern settings aesthetic.
  ```

### `UI-14` LLM API 配置与连通性测试页
- **路由与目标文件**：`/settings/api` → `src/pages/ApiConfigPage.tsx`
- **布局描述**：
  - **顶部栏**：返回按钮、标题「LLM API 配置」。
  - **顶部说明提示条（浅蓝底）**：支持任意 OpenAI 兼容接口（DeepSeek / 通义千问 / 豆包 / 智谱 / OpenAI / 中转站），密钥仅保存在本机，不上传任何第三方服务器。
  - **配置表单白卡**：
    - 快捷填充参考标签（轻描边小胶囊）：`DeepSeek`、`通义千问`、`智谱 GLM`、`自定义`（仅帮填 Base URL 示例，用户仍可自由修改）。
    - 输入框 1：`Base URL`（示例 `https://api.deepseek.com/v1`）
    - 输入框 2：`API Key`（密码脱敏掩码 + 右侧小眼睛切换显示）
    - 输入框 3：`Model 名称`（示例 `deepseek-chat`）
    - 下拉/胶囊选择：`出题风格偏好`（`国考真题风`、`省考实战风`、`基础巩固风`）
  - **测试结果反馈条**：绿色柔和提示块「✓ 连接成功 · 响应耗时 1.2s · 模型可正常输出 JSON」（失败态为柔红提示具体错误）。
  - **底部操作栏**：左侧描边按钮「测试连接」，右侧主蓝按钮「保存配置」。
- **Codex `imagegen` Prompt**：
  ```text
  Clean flat mobile app UI screen, 9:19.5 edge-to-edge vertical screen, NO phone bezel. Modern Chinese study app LLM API Configuration screen on #F5F7FA background. Top bar: back arrow and title "LLM API 配置". Top soft sky-blue info banner explaining "支持任意 OpenAI 兼容接口，Key 仅本地保存". Main white form card (16px radius): top quick-preset hint chips ("DeepSeek", "通义千问", "智谱", "自定义"); clean labeled form inputs — "Base URL" with value "https://api.deepseek.com/v1", "API Key" with masked dots and eye icon, "模型名称 (Model)" with value "deepseek-chat"; below a row of 3 style pills "国考真题风" (active blue), "省考风", "基础巩固". Below form card: soft green status banner "✓ 连接成功 · 延迟 1.2s · 格式校验通过". Fixed bottom white bar with two equal buttons: left outlined blue button "测试连接" and right solid #2563EB button "保存配置". Crisp modern form UI.
  ```

---

## 七、可直接发给 Codex 执行生图的汇总指令（Copy-Paste Prompt）

你可以直接复制下方指令交给 Codex，让它按规范批量（或分阶段）调用 `imagegen` 生图：

> 请阅读项目中的 `docs/UI_DESIGN_SPECS_AND_PROMPTS.md`，严格按照里面的「全局视觉设计锚点」和各页面 Prompt，使用 `imagegen` 技能依次生成所有 UI 设计稿（共 16 张：`UI-00.png` 至 `UI-14.png`，含 `UI-09b.png`），统一保存至 `docs/ui-mockups/` 目录下（文件名严格对应 `UI-00.png`、`UI-01.png` ... `UI-14.png`）。
> 要求：
> 1. 保持 9:19.5 竖屏比例，不要出现手机物理边框、手指、桌面或 3D 倾斜透视；
> 2. 所有页面保持高度统一的「清新护眼效率风」色板（`#F5F7FA` 底色、`#FFFFFF` 16px 圆角卡片、`#2563EB` 主色）和清晰的中文排版；
> 3. 建议按阶段分批生成（先生成阶段 1+2 的 `UI-00`~`UI-05`，确认视觉一致性后再生成 `UI-06`~`UI-14`），每批完成后汇报输出文件路径。
