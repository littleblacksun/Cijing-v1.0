import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { AppData, AppSnapshot } from '@/components/layout/AppShell';
import { db } from '@/db/database';
import { initDb } from '@/db/initDb';
import { AndroidBridge } from '@/native/androidBridge';
import { ApiConfigPage } from '@/pages/ApiConfigPage';
import { ConfusionDetailPage } from '@/pages/ConfusionDetailPage';
import { HomePage } from '@/pages/HomePage';
import { IdiomDetailPage } from '@/pages/IdiomDetailPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { LocalBankPage } from '@/pages/LocalBankPage';
import { PracticeSetupPage } from '@/pages/PracticeSetupPage';
import { QuizGeneratingPage } from '@/pages/QuizGeneratingPage';
import { QuizPlayPage } from '@/pages/QuizPlayPage';
import { QuizResultPage } from '@/pages/QuizResultPage';
import { QuizReviewPage } from '@/pages/QuizReviewPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WordPickerPage } from '@/pages/WordPickerPage';
import { useAppStore } from '@/stores/useAppStore';

async function readSnapshot(): Promise<AppSnapshot> {
  return db.transaction('r', db.idioms, db.confusionGroups, db.appSettings, async () => {
    const [idiomCount, confusionCount, settings, firstIdiom, firstGroup] = await Promise.all([
      db.idioms.count(),
      db.confusionGroups.count(),
      db.appSettings.get('default'),
      db.idioms.orderBy('frequency').reverse().first(),
      db.confusionGroups.orderBy('title').first(),
    ]);
    return { idiomCount, confusionCount, settings: settings ?? null, firstIdiom, firstGroup };
  });
}

export default function App() {
  const [data, setData] = useState<AppData>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const setSettings = useAppStore((state) => state.setSettings);

  useEffect(() => {
    let disposed = false;
    let subscription: { unsubscribe(): void } | undefined;

    function reportError(error: unknown) {
      if (disposed) return;
      console.error('本地数据库载入失败', error);
      setData({
        status: 'error',
        retry() {
          setData({ status: 'loading' });
          setAttempt((value) => value + 1);
        },
      });
    }

    void initDb().then(() => {
      if (disposed) return;
      subscription = liveQuery(readSnapshot).subscribe({
        next(snapshot) {
          setSettings(snapshot.settings);
          setData({ status: 'ready', ...snapshot });
        },
        error: reportError,
      });
    }).catch(reportError);

    return () => {
      disposed = true;
      subscription?.unsubscribe();
    };
  }, [attempt, setSettings]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AndroidBridge />
      <Routes>
        <Route element={<AppShell data={data} />}>
          <Route index element={<HomePage />} />
          <Route caseSensitive path="library" element={<LibraryPage />} />
          <Route caseSensitive path="library/idiom/:id" element={<IdiomDetailPage />} />
          <Route caseSensitive path="library/confusion/:id" element={<ConfusionDetailPage />} />
          <Route caseSensitive path="practice" element={<PracticeSetupPage />} />
          <Route caseSensitive path="practice/picker" element={<WordPickerPage />} />
          <Route caseSensitive path="practice/generating" element={<QuizGeneratingPage />} />
          <Route caseSensitive path="quiz/:sessionId" element={<QuizPlayPage />} />
          <Route caseSensitive path="quiz/:sessionId/result" element={<QuizResultPage />} />
          <Route caseSensitive path="quiz/:sessionId/review" element={<QuizReviewPage />} />
          <Route caseSensitive path="bank" element={<LocalBankPage />} />
          <Route caseSensitive path="settings" element={<SettingsPage />} />
          <Route caseSensitive path="settings/api" element={<ApiConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
