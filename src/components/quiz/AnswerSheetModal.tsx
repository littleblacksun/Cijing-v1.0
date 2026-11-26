import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import type { QuizSession } from '@/types/domain';

interface AnswerSheetModalProps {
  open: boolean;
  run: QuizSession;
  index: number;
  onClose: () => void;
  onPick: (index: number) => void;
  onSubmit: () => void;
}

const legend = [
  { label: '已答', color: 'bg-primary' },
  { label: '未答', color: 'bg-text-muted' },
  { label: '标记', color: 'bg-warning' },
];

export function AnswerSheetModal({ open, run, index: currentIndex, onClose, onPick, onSubmit }: AnswerSheetModalProps) {
  return (
    <div className="[&_dialog::backdrop]:backdrop-blur-[1px] [&_h2]:font-bold [&_.px-safe]:px-[var(--learning-gutter)]">
      <BottomSheet open={open} title="答题卡" onClose={onClose}>
        <div aria-label="答题卡图例" className="pointer-events-none absolute right-[calc(var(--learning-gutter)+41px)] top-[35px] flex items-center gap-2.5 text-xs text-text-secondary min-[365px]:gap-3">
          {legend.map(({ label, color }) => <span key={label} className="inline-flex items-center gap-1"><span aria-hidden="true" className={`size-2 rounded-full ${color}`} />{label}</span>)}
        </div>
        <div className="grid grid-cols-5 justify-items-center gap-y-4 pb-5 pt-2">
          {run.questions.map((item, index) => {
            const current = index === currentIndex;
            const answered = Boolean(run.userAnswers[item.id]);
            const flagged = run.flaggedQuestionIds.includes(item.id);
            const color = current ? 'border-primary bg-surface text-primary' : answered ? 'border-primary bg-primary text-surface' : 'border-transparent bg-subtle text-text-secondary';
            return (
              <button key={item.id} type="button" aria-current={current ? 'step' : undefined} aria-label={`第 ${index + 1} 题，${answered ? '已答' : '未答'}${flagged ? '，已标记' : ''}`} onClick={() => onPick(index)} className={`relative grid size-11 place-items-center rounded-full border-2 text-lg font-bold tabular-nums ${color}`}>
                {index + 1}{flagged && <span className="absolute -right-0.5 top-0 size-2.5 rounded-full border border-surface bg-warning" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <Button className="w-full !text-base" onClick={onSubmit}>立即交卷并查看解析</Button>
      </BottomSheet>
    </div>
  );
}
