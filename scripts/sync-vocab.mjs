import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

const sourceDir = new URL('../语库/', import.meta.url);
const outputDir = new URL('../src/data/', import.meta.url);
const outputPath = new URL('generatedVocab.json', outputDir);
const compareNames = new Intl.Collator('en', { numeric: true }).compare;
const sentiments = ['positive', 'negative', 'neutral'];
const intensities = ['light', 'medium', 'heavy'];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasStrings = (value, fields) =>
  isRecord(value) && fields.every((field) => typeof value[field] === 'string');
const isArrayOf = (value, check) => Array.isArray(value) && value.every(check);
const isTextList = (value) => isArrayOf(value, (item) => typeof item === 'string');
const hasAttributes = (item) => sentiments.includes(item.sentiment) && intensities.includes(item.intensity);

function isIdiom(item) {
  return (
    isRecord(item) &&
    ['word', 'pinyin', 'coreMeaning'].every((key) => hasText(item[key])) &&
    [1, 2, 3, 4, 5].includes(item.frequency) &&
    hasStrings(item, ['commonMistake']) &&
    hasStrings(item.morphemeHint, ['keyChar', 'explanation']) &&
    hasAttributes(item) &&
    ['applicableObjects', 'collocations', 'tags', 'confusableWith'].every((key) => isTextList(item[key])) &&
    isArrayOf(item.examples, (example) =>
      hasStrings(example, ['sentence']) && isTextList(example.highlightClues),
    )
  );
}

function isConfusionGroup(item) {
  return (
    isRecord(item) &&
    hasText(item.title) &&
    hasStrings(item, ['category', 'summary']) &&
    Number.isFinite(item.difficulty) &&
    isArrayOf(item.words, (word) =>
      hasStrings(word, ['word', 'focus', 'applicable', 'pitfall']) &&
      isTextList(word.diffChars) &&
      hasAttributes(word),
    ) &&
    isArrayOf(item.contrastExamples, (example) =>
      hasStrings(example, ['context', 'correctWord', 'wrongWord', 'clue']),
    ) &&
    isArrayOf(item.quickDrills, (drill) =>
      hasStrings(drill, ['stem', 'answer', 'analysis']) && isTextList(drill.options),
    )
  );
}

const sources = {
  idioms: { entries: new Map(), key: 'word', prefix: 'idiom', validate: isIdiom },
  confusion_groups: { entries: new Map(), key: 'title', prefix: 'group', validate: isConfusionGroup },
};

function assignIds({ entries, key, prefix }) {
  const explicitOwners = new Map();
  let repaired = 0;

  for (const entry of entries.values()) {
    if (entry.id && !explicitOwners.has(entry.id)) explicitOwners.set(entry.id, entry[key]);
  }

  const usedIds = new Set(explicitOwners.keys());
  const records = [...entries.values()].map((entry) => {
    if (entry.id && explicitOwners.get(entry.id) === entry[key]) return entry;
    if (entry.id) repaired += 1;

    const hash = createHash('sha256').update(entry[key]).digest('hex').slice(0, 24);
    const base = `${prefix}_${hash}`;
    let id = base;
    for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${base}_${suffix}`;
    usedIds.add(id);
    return { ...entry, id };
  });

  return { records, repaired };
}

async function syncVocabulary() {
  const sourceFiles = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => compareNames(a, b) || (a < b ? -1 : Number(a > b)));
  let duplicates = 0;

  for (const name of sourceFiles) {
    const json = await readFile(new URL(encodeURIComponent(name), sourceDir), 'utf8');
    let data;
    try {
      data = JSON.parse(json.replace(/^\uFEFF/, ''));
    } catch (error) {
      throw new Error(`${name} 无法解析为 JSON`, { cause: error });
    }

    if (!isRecord(data)) throw new Error(`${name} 的根节点应为对象`);
    if (!Object.hasOwn(sources, data.type)) {
      console.warn(`跳过 ${name}（不支持的语库类型）`);
      continue;
    }

    const { entries, key, validate } = sources[data.type];
    if (!Array.isArray(data.items)) throw new Error(`${name} 缺少 items 数组`);

    for (const [index, item] of data.items.entries()) {
      if (!validate(item) || (item.id != null && typeof item.id !== 'string')) {
        throw new Error(`${name} 的 items[${index}] 不符合语库字段规范`);
      }
      const nameKey = item[key].trim();
      const id = item.id?.trim();
      const previous = entries.get(nameKey);
      if (previous) {
        duplicates += 1;
        if (!previous.id && id) previous.id = id;
      } else {
        entries.set(nameKey, { ...item, [key]: nameKey, id });
      }
    }
  }

  const idioms = assignIds(sources.idioms);
  const groups = assignIds(sources.confusion_groups);
  const generated = {
    idioms: idioms.records,
    confusionGroups: groups.records,
    sourceFiles,
    syncedAt: new Date().toISOString(),
  };

  await mkdir(outputDir, { recursive: true });
  const temporaryPath = new URL(`.generatedVocab-${randomUUID()}.tmp`, outputDir);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(generated, null, 2)}\n`);
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  console.log(
    `已同步 ${sourceFiles.length} 个 JSON 文件：${idioms.records.length} 个成语、` +
      `${groups.records.length} 组易混词，合并 ${duplicates} 条重复记录，` +
      `修复 ${idioms.repaired + groups.repaired} 个冲突 ID。`,
  );
}

try {
  await syncVocabulary();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
