import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, CaseSensitive, ChevronRight, CircleCheck, Layers, PenLine, Server } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppData } from '@/components/layout/AppShell';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { contentInset, counts, successInk, updatePracticeSettings, usePracticeSettings } from '@/hooks/usePracticeData';
import { exportPersonalBackup, importExternalVocabJson, restorePersonalBackup } from '@/services/backupService';
import { configFromSettings, isLlmConfigured } from '@/services/llmClient';
import { calcLocalQuota } from '@/services/quizEngine';
import { useAppStore } from '@/stores/useAppStore';

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="grid shrink-0 grid-cols-2 rounded-lg bg-subtle p-0.5 text-[13px] min-[365px]:text-sm">
      {options.map((option) => <button key={option.value} type="button" aria-pressed={option.value === value} className={`min-h-8 rounded-md px-2.5 font-medium min-[365px]:px-4 ${option.value === value ? 'bg-primary text-surface' : 'text-text-secondary'}`} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  );
}

function RowLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span className="flex min-w-0 flex-1 items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center border-r border-border-subtle pr-2 text-text-secondary">{icon}</span><span>{children}</span></span>;
}

const row = 'flex min-h-[59px] w-full items-center justify-between gap-2 py-2 text-left text-sm font-semibold min-[365px]:text-base';
const iconProps = { size: 22, strokeWidth: 1.65, 'aria-hidden': true } as const;

export function SettingsPage() {
  const data = useOutletContext<AppData>();
  const { data: settings, loading } = usePracticeSettings();
  const configured = isLlmConfigured(configFromSettings(settings));
  const ratio = settings?.localBankRatio ?? 0.2;
  const defaultMode = settings?.defaultQuizMode ?? 'instant';
  const fontSize = settings?.fontSize ?? 'normal';
  const [vocabOpen, setVocabOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const vocabInput = useRef<HTMLInputElement>(null);
  const showToast = useAppStore((state) => state.showToast);
  const input = useRef<HTMLInputElement>(null);
  const percent = Math.round(ratio * 100);
  const bar = `linear-gradient(to right, var(--color-primary) ${percent * 2}%, var(--border-subtle) ${percent * 2}%)`;

  function change(patch: Parameters<typeof updatePracticeSettings>[0]) {
    void updatePracticeSettings(patch).catch(() => showToast({ message: '偏好保存失败，请重试', tone: 'danger' }));
  }

  async function transfer(task: () => Promise<string>) {
    setWorking(true);
    try { showToast({ message: await task(), tone: 'success' }); }
    catch (error) { showToast({ message: error instanceof Error ? error.message : '操作失败，请重试', tone: 'danger' }); }
    finally { setWorking(false); }
  }

  async function importVocab(file: File) {
    const result = await importExternalVocabJson(await file.text());
    setVocabOpen(false);
    return `已导入 ${result.added} ${result.type === 'idioms' ? '个成语' : '组易混词'}，跳过 ${result.skipped} 条重复记录`;
  }

  return (
    <div className={`pt-safe pb-safe ${contentInset}`}>
      <header className="grid min-h-[62px] grid-cols-[40px_1fr_40px] items-center">
        <Link to="/bank" aria-label="返回本地题库" className="grid size-9 place-items-center"><ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" /></Link><h1 className="text-center text-xl font-bold">偏好设置</h1>
      </header>
      <div className="grid grid-cols-1 gap-4">
        <Card className="!p-3.5">
          <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">本地题库抽题权重</h2><output htmlFor="bank-weight" className="text-[23px] font-bold tabular-nums text-primary">{percent}%</output></div>
          <div className="mt-5">
            <input id="bank-weight" type="range" aria-label="本地题库抽题权重" aria-valuetext={`${percent}%`} min="0" max="50" step="5" disabled={!settings || loading} value={percent} onChange={(event) => change({ localBankRatio: Number(event.target.value) / 100 })} style={{ background: bar }} className="block h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-[17px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-[17px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface" />
            <div className="mt-2 flex justify-between text-xs font-medium text-text-secondary" aria-hidden="true"><span>0%</span><span>50%</span></div>
          </div>
          <div className="mt-4 grid grid-cols-4 divide-x divide-border-subtle rounded-lg bg-subtle py-2 text-center text-[11px] font-medium leading-5 text-text-secondary min-[365px]:text-[13px]" aria-label="本地题库抽题预览">
            {counts.map((count) => <span key={count}>{count}题→抽{calcLocalQuota(count, ratio)}</span>)}
          </div>
          <p className="mt-3 text-xs text-text-secondary">本地题库余量不足时，自动由 AI 补足剩余题量</p>
        </Card>
        <Card className="divide-y divide-border-subtle !px-3 !py-1">
          <Link to="/settings/api" className={row}><RowLabel icon={<Server {...iconProps} />}>LLM API 配置</RowLabel><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ${configured ? `bg-success-soft ${successInk}` : 'bg-subtle text-text-secondary'}`}>{configured && <CircleCheck size={15} aria-hidden="true" />}{configured ? '已配置' : '未配置'}</span><ChevronRight className="shrink-0 text-text-muted" size={16} aria-hidden="true" /></Link>
          <div className={row}><RowLabel icon={<PenLine {...iconProps} />}>默认答题模式</RowLabel><Segmented label="默认答题模式" value={defaultMode} options={[{ label: '即时', value: 'instant' }, { label: '交卷', value: 'exam' }]} onChange={(mode) => change({ defaultQuizMode: mode })} /></div>
          <div className={row}><RowLabel icon={<CaseSensitive {...iconProps} />}>护眼字号</RowLabel><Segmented label="护眼字号" value={fontSize} options={[{ label: '标准', value: 'normal' }, { label: '偏大', value: 'large' }]} onChange={(font) => change({ fontSize: font })} /></div>
        </Card>
        <Card className="!p-3">
          <h2 className="px-0.5 pb-1 text-lg font-bold">语库与备份</h2>
          <div className="divide-y divide-border-subtle">
            <button type="button" onClick={() => setVocabOpen(true)} className={row}><RowLabel icon={<Layers {...iconProps} />}>内置语库管理 {data.status === 'ready' && <span className="text-sm font-medium text-text-secondary">({data.idiomCount}词 · {data.confusionCount}组)</span>}</RowLabel><ChevronRight size={16} className="text-text-muted" aria-hidden="true" /></button>
            <button type="button" className={row} disabled={working || !settings} onClick={() => transfer(async () => (await exportPersonalBackup()) === 'download'
              ? '已导出备份（不含 API Key）' : '已复制备份到剪贴板（不含 API Key），可另存为 JSON 文件')}><RowLabel icon={<ArrowUpFromLine {...iconProps} />}>导出本地题库备份</RowLabel><ChevronRight size={16} className="text-text-muted" aria-hidden="true" /></button>
            <button type="button" className={row} disabled={working || !settings} onClick={() => input.current?.click()}><RowLabel icon={<ArrowDownToLine {...iconProps} />}>导入恢复数据</RowLabel><ChevronRight size={16} className="text-text-muted" aria-hidden="true" /></button>
          </div>
          <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void transfer(async () => {
              const result = await restorePersonalBackup(await file.text());
              return `已恢复 ${result.questions} 道本地题、${result.progress} 条学习进度、${result.sessions} 份试卷`;
            });
            event.target.value = '';
          }} />
        </Card>
      </div>
      <BottomSheet open={vocabOpen} title="内置语库管理" onClose={() => { if (!working) setVocabOpen(false); }}>
        {data.status === 'ready' && <p className="pb-3 text-sm text-text-secondary">成语 {data.idiomCount} 个 · 易混组 {data.confusionCount} 组</p>}
        <Button disabled={working || data.status !== 'ready'} className="w-full" onClick={() => vocabInput.current?.click()}>{working ? '正在导入…' : '导入外部语库 JSON'}</Button>
        <input ref={vocabInput} type="file" accept=".json,application/json" className="hidden" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void transfer(async () => {
            try { return await importVocab(file); }
            catch (error) { setVocabOpen(false); throw error; }
          });
        }} />
      </BottomSheet>
    </div>
  );
}
