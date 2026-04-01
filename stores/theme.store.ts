import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ThemeState {
  isDarkMode: boolean;
  hasHydrated: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        isDarkMode: false,
        hasHydrated: false,

        setDarkMode: (value: boolean) =>
          set({ isDarkMode: value }, false, "theme/setDarkMode"),

        toggleDarkMode: () =>
          set(
            (state) => ({ isDarkMode: !state.isDarkMode }),
            false,
            "theme/toggleDarkMode",
          ),

        setHasHydrated: (value: boolean) =>
          set({ hasHydrated: value }, false, "theme/setHasHydrated"),
      }),
      {
        name: "theme-storage",
        partialize: (state) => ({ isDarkMode: state.isDarkMode }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
    { name: "ThemeStore" },
  ),
);
