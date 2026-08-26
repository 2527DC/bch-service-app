// Chrome-level UI state that several components share (drawer open/closed).
// Kept out of `data` so a drawer toggle never re-renders job lists.
import { create } from "zustand";

type UiState = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useUi = create<UiState>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
