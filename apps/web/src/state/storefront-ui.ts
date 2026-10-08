'use client';

import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface StorefrontUiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useStorefrontUi = create<StorefrontUiState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));
