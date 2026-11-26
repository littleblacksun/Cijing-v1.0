import { ArrowLeft, CircleAlert, CircleCheck, Eye, EyeOff, Info, KeyRound, Layers, Link2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiFormFromSettings, contentInset, dangerInk, fixedFooter, outlineBlue, presets, successInk, updatePracticeSettings, usePracticeSettings } from '@/hooks/usePracticeData';
import type { PracticeApiReturn, Preset } from '@/hooks/usePracticeData';
import { testLlmConnection, validateLlmConfig } from '@/services/llmClient';
import type { AppSettings } from '@/types/domain';
import { useAppStore } from '@/stores/useAppStore';

const providerNames = ['deepseek', 'qwen', 'zhipu', 'custom'] as const;
const promptStyles = [{ id: 'guokao', label: '国考真题风' }, { id: 'shengkao', label: '省考风' }, { id: 'basic', label: '基础巩固' }] as const;
const iconProps = { size: 20, strokeWidth: 1.7, 'aria-hidden': true } as const;
const inputClass = 'min-h-11 w-full rounded-lg border border-border-subtle bg-page px-3 text-sm text-text-primary focus:border-primary min-[365px]:text-base';

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div><label htmlFor={id} className="mb-2 flex items-center gap-2.5 text-base font-bold"><span className="border-r border-border-subtle pr-2.5 text-text-secondary">{icon}</span>{label}</label>{children(id)}</div>
  );
}

export function ApiConfigPage() {
  const { data, loading } = usePracticeSettings();
  if (!data) return <p role="status" className="pt-safe p-5 text-center text-text-secondary">{loading ? '正在读取 API 配置…' : '无法读取 API 配置'}</p>;
  return <ApiConfigForm settings={data} />;
}

function ApiConfigForm({ settings }: { settings: AppSettings }) {
  const draft = useLocation().state as PracticeApiReturn | null;
  const fromPractice = draft?.source === 'practice';
  const showToast = useAppStore((state) => state.showToast);
  const [form, setForm] = useState(() => apiFormFromSettings(settings));
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);

  function edit(fields: Partial<typeof form>) {
    request.current?.abort();
    setTesting(false);
    setForm((current) => ({ ...current, ...fields }));
    setResult(null);
  }

  function pickPreset(preset: Preset) {
    if (preset === 'custom') edit({ preset });
    else edit({ preset, url: presets[preset].url, model: presets[preset].model, key: form.preset === preset ? form.key : '' });
  }

  async function check() {
    const controller = new AbortController();
    request.current = controller;
    setTesting(true);
    setResult(null);
    try {
      const status = await testLlmConnection(form, controller.signal);
      if (!controller.signal.aborted) setResult(status);
    } finally {
      if (!controller.signal.aborted) setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (form.url.trim() || form.key.trim() || form.model.trim()) validateLlmConfig(form);
      await updatePracticeSettings({
        llmBaseUrl: form.url.trim(), llmApiKey: form.key.trim(), llmModel: form.model.trim(), llmPromptStyle: form.prompt,
      });
      showToast({ message: '已保存 API 配置', tone: 'success' });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : '配置保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex h-full min-h-0 flex-col" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!testing && !saving) void save();
    }}>
      <header className={`pt-safe shrink-0 ${contentInset}`}>
        <div className="flex min-h-[61px] items-center gap-2"><Link to={fromPractice ? '/practice' : '/settings'} state={fromPractice ? { count: draft.count, modeOverride: draft.modeOverride } : undefined} onClick={() => {
          if (fromPractice && useAppStore.getState().selectedWordIds.length === 0) useAppStore.getState().setSelectedWordIds(draft.wordIds);
        }} aria-label={fromPractice ? '返回刷题' : '返回偏好设置'} className="grid size-9 place-items-center"><ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" /></Link><h1 className="text-xl font-bold">LLM API 配置</h1></div>
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 ${contentInset}`}>
        <aside className="flex items-center gap-2.5 rounded-control bg-primary-soft px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary min-[365px]:text-sm"><Info size={19} strokeWidth={1.75} className="shrink-0 text-accent" aria-hidden="true" />支持任意 OpenAI 兼容接口，Key 仅本地保存</aside>
        <Card className="mt-4 !p-3.5">
          <div role="group" aria-label="接口预设" className="grid grid-cols-[1.25fr_1.05fr_0.82fr_0.95fr] gap-1.5">
            {providerNames.map((preset) => <button key={preset} type="button" aria-pressed={form.preset === preset} onClick={() => pickPreset(preset)} className={`min-h-9 rounded-lg px-0.5 text-[12px] font-medium min-[365px]:text-sm ${form.preset === preset ? 'bg-primary text-surface' : 'bg-subtle text-text-secondary'}`}>{presets[preset].label}</button>)}
          </div>
          <div className="mt-5 grid gap-5">
            <Field label="Base URL" icon={<Link2 {...iconProps} />}>{(id) => <input id={id} className={inputClass} type="url" value={form.url} onChange={(event) => edit({ url: event.target.value })} placeholder="https://api.deepseek.com/v1" autoComplete="off" />}</Field>
            <Field label="API Key" icon={<KeyRound {...iconProps} />}>{(id) => <div className="relative"><input id={id} type={revealed ? 'text' : 'password'} autoComplete="off" value={form.key} onChange={(event) => edit({ key: event.target.value })} placeholder="输入 API Key" className={`${inputClass} pr-11`} /><button type="button" aria-label={revealed ? '隐藏 API Key' : '显示 API Key'} aria-pressed={revealed} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-text-secondary" onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff {...iconProps} /> : <Eye {...iconProps} />}</button></div>}</Field>
            <Field label="模型名称 (Model)" icon={<Layers {...iconProps} />}>{(id) => <input id={id} className={inputClass} value={form.model} onChange={(event) => edit({ model: event.target.value })} placeholder="deepseek-chat" autoComplete="off" />}</Field>
          </div>
          <div role="group" aria-label="出题风格" className="mt-5 grid grid-cols-[1.15fr_0.9fr_1fr] gap-2 border-t border-border-subtle pt-4">
            {promptStyles.map(({ id, label }) => <button key={id} type="button" aria-pressed={form.prompt === id} className={`min-h-9 rounded-lg px-0.5 text-[12px] font-medium min-[365px]:text-sm ${form.prompt === id ? 'bg-primary text-surface' : 'bg-subtle text-text-secondary'}`} onClick={() => edit({ prompt: id })}>{label}</button>)}
          </div>
        </Card>
        {result && <div role="status" className={`mt-4 flex items-center gap-2.5 rounded-control px-3.5 py-3 text-[13px] font-semibold leading-normal min-[365px]:text-sm ${result.ok ? `bg-success-soft ${successInk}` : `bg-danger-soft ${dangerInk}`}`}>
          {result.ok ? <CircleCheck size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" /> : <CircleAlert size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />}<span className="border-l border-current pl-2.5">{result.message}</span>
        </div>}
      </div>
      <footer className={fixedFooter}>
        <Button variant="outline" className={outlineBlue} disabled={testing || saving} onClick={() => { void check().catch(() => {}); }}>{testing ? '测试中…' : '测试连接'}</Button><Button type="submit" disabled={saving || testing}>{saving ? '正在保存…' : '保存配置'}</Button>
      </footer>
    </form>
  );
}
