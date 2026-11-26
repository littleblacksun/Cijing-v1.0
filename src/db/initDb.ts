import type { Table } from 'dexie';
import { fallbackSeed } from '@/data/fallbackSeed';
import vocabularyUrl from '@/data/generatedVocab.json?url&no-inline';
import type { AppSettings, GeneratedVocabulary } from '@/types/domain';
import { db } from './database';

const defaultSettings: AppSettings = {
  id: 'default',
  localBankRatio: 0.2,
  defaultQuizMode: 'instant',
  fontSize: 'normal',
  llmBaseUrl: '',
  llmApiKey: '',
  llmModel: '',
  llmPromptStyle: 'guokao',
};

let initialization: Promise<void> | undefined;

export function initDb(): Promise<void> {
  initialization ??= seedDatabase().finally(() => {
    initialization = undefined;
  });
  return initialization;
}

async function seedDatabase() {
  const response = await fetch(vocabularyUrl);
  if (!response.ok) throw new Error(`语库读取失败（HTTP ${response.status}）`);
  // The build runs sync-vocab.mjs to validate every entry in this packaged asset.
  const vocabulary = (await response.json()) as GeneratedVocabulary;
  const seed = {
    idioms: vocabulary.idioms.length > 0 ? vocabulary.idioms : fallbackSeed.idioms,
    confusionGroups: vocabulary.confusionGroups.length > 0 ? vocabulary.confusionGroups : fallbackSeed.confusionGroups,
  };

  await db.transaction('rw', db.idioms, db.confusionGroups, db.appSettings, async () => {
    await Promise.all([
      addMissing(db.idioms, 'word', seed.idioms),
      addMissing(db.confusionGroups, 'title', seed.confusionGroups),
    ]);
    if (!(await db.appSettings.get('default'))) await db.appSettings.add(defaultSettings);
  });
}

async function addMissing<K extends string, T extends { id: string } & Record<K, string>>(
  table: Table<T, string>,
  uniqueField: K,
  records: T[],
) {
  if (records.length === 0) return;

  const [existingIds, existingNames] = await Promise.all([
    table.toCollection().primaryKeys(),
    table.orderBy(uniqueField).keys(),
  ]);
  const ids = new Set(existingIds);
  const names = new Set(existingNames);
  const additions = records.filter((record) => !ids.has(record.id) && !names.has(record[uniqueField]));
  if (additions.length > 0) await table.bulkAdd(additions);
}
