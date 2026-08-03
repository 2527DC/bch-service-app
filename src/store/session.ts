import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as mockApi from "../services/mockApi";
import { USERS } from "../mock/users";
import type { User } from "../mock/types";

const SESSION_KEY = "bch-session";
const REMEMBERED_KEY = "bch-user"; // mirrors localStorage.getItem("bch-user") in the PWA

type SessionState = {
  user: User | null;
  rememberedUser: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (name: string, pin: string) => Promise<User>;
  logout: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  user: null,
  rememberedUser: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const [sessionName, remembered] = await Promise.all([
        AsyncStorage.getItem(SESSION_KEY),
        AsyncStorage.getItem(REMEMBERED_KEY),
      ]);
      const user = sessionName ? USERS.find((u) => u.name === sessionName) ?? null : null;
      set({ user, rememberedUser: remembered, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  login: async (name, pin) => {
    const user = await mockApi.login(name, pin);
    await AsyncStorage.multiSet([
      [SESSION_KEY, user.name],
      [REMEMBERED_KEY, user.name],
    ]);
    set({ user, rememberedUser: user.name });
    return user;
  },

  logout: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },
}));
