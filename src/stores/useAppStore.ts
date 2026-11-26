import { create } from 'zustand';
import type { AppSettings } from '@/types/domain';

export interface Toast {
  message: string;
  tone?: 'neutral' | 'success' | 'danger';
}

interface AppStore {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings | null) => void;
  selectedWordIds: string[];
  setSelectedWordIds: (ids: string[]) => void;
  toggleSelectedWord: (id: string) => void;
  clearSelectedWords: () => void;
  toast: Toast | null;
  showToast: (toast: Toast) => void;
  dismissToast: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
  selectedWordIds: [],
  setSelectedWordIds: (ids) => set({ selectedWordIds: [...new Set(ids)] }),
  toggleSelectedWord: (id) =>
    set(({ selectedWordIds }) => ({
      selectedWordIds: selectedWordIds.includes(id)
        ? selectedWordIds.filter((wordId) => wordId !== id)
        : [...selectedWordIds, id],
    })),
  clearSelectedWords: () => set({ selectedWordIds: [] }),
  toast: null,
  showToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}));
