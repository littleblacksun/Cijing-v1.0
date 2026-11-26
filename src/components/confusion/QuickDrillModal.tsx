import { Check, Info, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { recordConfusionDrillMistake } from '@/services/learningService';
import { useAppStore } from '@/stores/useAppStore';
import type { ConfusionGroup } from '@/types/domain';

interface QuickDrillModalProps {
  group: ConfusionGroup;
  onClose: () => void;
}

const answerStyles = {
  available: { card: 'border-border-subtle bg-surface hover:border-primary', letter: 'bg-subtle text-text-secondary' },
  correct: { card: 'border-success bg-success-soft', letter: 'bg-[color-mix(in_srgb,var(--color-success)_18%,var(--bg-surface))] text-[color:var(--learning-success-ink)]' },
  incorrect: { card: 'border-danger bg-danger-soft', letter: 'bg-[color-mix(in_srgb,var(--color-danger)_16%,var(--bg-surface))] text-[color:var(--learning-danger-ink)]' },
};

export function QuickDrillModal({ group, onClose }: QuickDrillModalProps) {
  const drills = group.quickDrills;
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const showToast = useAppStore((state) => state.showToast);
  const question = drills[step];
  const answered = selected !== null;
  const last = step === drills.length - 1;
  if (!question) return null;

  async function advance() {
    if (!last) {
      setStep((current) => current + 1);
      setSelected(null);
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    try {
      if (correctCount < drills.length) await recordConfusionDrillMistake(group);
      onClose();
      showToast({ message: `微测完成：答对 ${correctCount}/${drills.length} 题`, tone: 'success' });
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  }

  return (
    <div className="[&_dialog::backdrop]:backdrop-blur-[1.25px] [&_h2]:pl-7 [&_h2]:font-bold [&_.px-safe]:px-[var(--learning-gutter)]">
      <BottomSheet open title={`闪电微测 · ${step + 1}/${drills.length}`} onClose={() => { if (!saving) onClose(); }}>
        <Zap size={21} strokeWidth={1.9} className="pointer-events-none absolute left-[calc(var(--learning-gutter)+4px)] top-[33px] text-primary" aria-hidden="true" />
        <div className="mt-1 rounded-control bg-subtle px-4 py-4 text-[17px] font-medium leading-[1.8]">
          {question.stem.split(/(____)/u).map((part, index) => part === '____' ? (
            <span key={index} aria-label="填空" className="mx-1 inline-block w-11 border-b-2 border-primary align-baseline">&nbsp;</span>
          ) : part)}
        </div>

        <div role="group" aria-label="选词" className="mt-3.5 grid gap-2.5">
          {question.options.map((option, index) => {
            const state = answered && option === question.answer ? 'correct' : selected === index ? 'incorrect' : 'available';
            const style = answerStyles[state];
            return (
              <button key={index} type="button" disabled={answered} aria-pressed={selected === index} onClick={() => {
                setSelected(index);
                if (option === question.answer) setCorrectCount((count) => count + 1);
              }} className={`flex min-h-[60px] w-full items-center gap-3 rounded-control border px-3.5 py-2 text-left transition-colors motion-reduce:transition-none ${style.card}`}>
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[15px] font-bold ${style.letter}`}>{String.fromCharCode(65 + index)}</span>
                <span className="min-w-0 flex-1 text-[17px] font-bold">{option}</span>
                {state === 'correct' && <><span className="sr-only">正确选项</span><span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-surface"><Check size={14} strokeWidth={2.5} aria-hidden="true" /></span></>}
                {state === 'incorrect' && <><span className="sr-only">错误选项</span><span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger text-surface"><X size={14} strokeWidth={2.5} aria-hidden="true" /></span></>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div role="status" className="mt-4 flex items-start gap-2 rounded-control bg-primary-soft px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary">
            <Info size={18} strokeWidth={1.85} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <p>线索：{question.analysis}</p>
          </div>
        )}
        {saveFailed && <p role="alert" className="mt-3 text-sm text-danger">复习记录保存失败，请重试</p>}
        <Button className="mt-4 w-full !text-base" disabled={!answered || saving} onClick={advance}>
          {saving ? '正在保存…' : last ? '完成微测' : '下一题'}
        </Button>
      </BottomSheet>
    </div>
  );
}
