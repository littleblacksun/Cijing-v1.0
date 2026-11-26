import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function BottomSheet({ open, title, children, onClose }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="bottom-sheet fixed inset-x-0 bottom-0 top-auto mx-auto my-0 max-h-[85dvh] w-full max-w-[430px] overflow-y-auto rounded-t-sheet bg-surface text-text-primary"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="px-safe pb-safe">
        <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-border-subtle" aria-hidden="true" />
        <div className="flex min-h-14 items-center justify-between gap-4">
          <h2 className="text-lg font-semibold" id={titleId}>{title}</h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-control text-text-secondary hover:bg-subtle">
            <X aria-hidden="true" size={22} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
