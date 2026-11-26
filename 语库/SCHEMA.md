# `语库/` 目录数据格式规范（供 Gemini 搜集整理词库使用）

本目录用于存放 App 内置的行测《逻辑填空》成语词库与易混成语对比组数据。
后续构建 App 时，程序会自动扫描并合并本目录下的所有 `.json` 文件，直接导入内置数据库。

---

## 一、推荐文件命名方式（方便分批整理与追加）

你可以让 Gemini 分批生成多个 JSON 文件放入本目录，避免单次输出过长被截断：
- 成语词库文件：`idioms_part1.json`、`idioms_part2.json` ...（每个文件建议 50~100 个成语）
- 易混对比组文件：`confusion_groups_part1.json`、`confusion_groups_part2.json` ...（每个文件建议 20~40 组对比）

---

## 二、成语词库 JSON 结构（`idioms_*.json`）

```json
{
  "type": "idioms",
  "version": "1.0",
  "items": [
    {
      "id": "bu_yi_wei_ran",
      "word": "不以为然",
      "pinyin": "bù yǐ wéi rán",
      "frequency": 5,
      "coreMeaning": "不认为是对的，表示不同意、轻视。",
      "morphemeHint": {
        "keyChar": "然",
        "explanation": "“然”指“对的、正确的”；因此强调不赞同对方的观点，而非不在意。"
      },
      "sentiment": "neutral",
      "intensity": "medium",
      "applicableObjects": ["观点", "意见", "做法"],
      "collocations": ["对此不以为然", "对他的提议不以为然"],
      "commonMistake": "常与“不以为意”混淆；前者是不赞同，后者是不放在心上。",
      "tags": ["国考高频", "易混淆", "望文生义"],
      "examples": [
        {
          "sentence": "面对专家提出的环保预警，部分企业起初____，直到收到罚单才追悔莫及。",
          "highlightClues": ["专家提出的环保预警", "起初", "追悔莫及"]
        }
      ],
      "confusableWith": ["不以为意", "不屑一顾"]
    }
  ]
}
```

### 字段说明
- `id`：唯一英文/拼音标识（或直接留空，导入脚本会自动按 `word` 去重生成）
- `word`：**必填**，成语正文（4字为主，亦可含高频二字/三字实词或熟语）
- `pinyin`：**必填**，带声调拼音
- `frequency`：`1~5` 整数（`5` = 国考/省考超高频，`3` = 常见，`1` = 拓展）
- `coreMeaning`：**必填**，15~35 字直击行测高频义项的精炼解释
- `morphemeHint`：核心语素拆解（`keyChar` 关键字，`explanation` 拆字记忆点）
- `sentiment`：感情色彩，取值 `"positive"`（褒义） | `"negative"`（贬义） | `"neutral"`（中性）
- `intensity`：语义轻重，取值 `"light"`（较轻） | `"medium"`（适中） | `"heavy"`（较重）
- `applicableObjects`：适用对象数组（如 `["人", "政策", "文艺作品"]`）
- `collocations`：高频固定搭配数组
- `commonMistake`：行测常见误用陷阱提示
- `tags`：考点标签（建议从 `国考高频` / `省考高频` / `易望文生义` / `褒贬易错` / `对象易错` / `语义轻重` / `谦敬误用` / `重复累赘` 中选用）
- `examples`：例句数组，句子中用四个下划线 `____` 代替该成语，供 App 实现“遮罩自测”
- `confusableWith`：易混成语名称列表

---

## 三、易混成语对比组 JSON 结构（`confusion_groups_*.json`）

```json
{
  "type": "confusion_groups",
  "version": "1.0",
  "items": [
    {
      "id": "group_buyiwei",
      "title": "不以为然 vs 不以为意",
      "category": "一字之差 · 语素辨析",
      "difficulty": 4,
      "summary": "一字之差决定核心指向：“然”侧重不认同对错，“意”侧重不放在心上。",
      "words": [
        {
          "word": "不以为然",
          "diffChars": ["然"],
          "focus": "不认为是对的（否定正确性/反对观点）",
          "sentiment": "neutral",
          "intensity": "medium",
          "applicable": "多用于对他人观点、建议、理论持否定态度",
          "pitfall": "不能用来形容“对困难/危险毫不在乎”"
        },
        {
          "word": "不以为意",
          "diffChars": ["意"],
          "focus": "不放在心上（轻视、漠视、不当回事）",
          "sentiment": "negative",
          "intensity": "medium",
          "applicable": "多用于对警告、批评、小毛病或他人态度毫不在意",
          "pitfall": "不强调争辩对错，而是根本没当回事"
        }
      ],
      "contrastExamples": [
        {
          "context": "大家都很看好这个激进的改革方案，唯独老王____，并提出了三条反对理由。",
          "correctWord": "不以为然",
          "wrongWord": "不以为意",
          "clue": "提出了三条反对理由 → 明确不赞同观点对错，选“不以为然”。"
        },
        {
          "context": "医生多次叮嘱他少熬夜，他却____，依然每天通宵打游戏。",
          "correctWord": "不以为意",
          "wrongWord": "不以为然",
          "clue": "叮嘱却依然通宵 → 没放在心上，选“不以为意”。"
        }
      ],
      "quickDrills": [
        {
          "stem": "面对外界的质疑声，导演始终____，照旧按照自己的节奏拍摄，甚至懒得回应。",
          "options": ["不以为然", "不以为意"],
          "answer": "不以为意",
          "analysis": "“照旧按自己节奏、懒得回应”体现的是不放在心上、毫不在意，故用“不以为意”。"
        }
      ]
    }
  ]
}
```

---

## 四、给 Gemini 搜集语库的推荐 Prompt（可直接复制使用）

> 你是一名资深公务员考试《行测·言语理解与表达·逻辑填空》教研专家。请帮我整理一批国考、省考高频逻辑填空成语（本批 1000 个，且不要与我之前整理过的重复），严格按照以下 JSON 格式输出纯 JSON（不要额外解释）：
> - 包含字段：`word`、`pinyin`、`frequency`(1-5)、`coreMeaning`、`morphemeHint`(`keyChar` + `explanation`)、`sentiment`(`positive`/`negative`/`neutral`)、`intensity`(`light`/`medium`/`heavy`)、`applicableObjects`、`collocations`、`commonMistake`、`tags`、`examples`(含 `____` 挖空例句及 `highlightClues`)、`confusableWith`。
> - 重点覆盖高频易望文生义成语（如首当其冲、差强人意、万人空巷、不刊之论、目无全牛、安土重迁、炙手可热等）与近义易混成语。
> - 例句须贴合行测真题的书面政论、科技科普、文化评论语境。
