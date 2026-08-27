import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../services/apiClient";
import * as mockApi from "../services/mockApi";
import { USERS } from "../mock/users";
import type { User } from "../mock/types";

const SESSION_KEY = "bch-session";
const REMEMBERED_KEY = "bch-user";
const USER_PROFILE_KEY = "bch-user-profile";
const PERMISSIONS_KEY = "bch-permissions";
const MODULES_KEY = "bch-modules";

export interface SessionUser extends User {
  roleKey?: string;
  roleName?: string;
}

type SessionState = {
  user: SessionUser | null;
  rememberedUser: string | null;
  permissions: Record<string, Record<string, boolean>>;
  modules: Array<{ key: string; label: string; icon: string | null; route: string | null }>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (name: string, pin: string) => Promise<SessionUser>;
  loginWithCode: (accessCode: string) => Promise<SessionUser>;
  hasPermission: (moduleKey: string, action?: string) => boolean;
  logout: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  rememberedUser: null,
  permissions: {},
  modules: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const [sessionName, remembered, savedProfile, savedPerms, savedMods] = await Promise.all([
        AsyncStorage.getItem(SESSION_KEY),
        AsyncStorage.getItem(REMEMBERED_KEY),
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(PERMISSIONS_KEY),
        AsyncStorage.getItem(MODULES_KEY),
      ]);

      let user: SessionUser | null = null;
      if (savedProfile) {
        user = JSON.parse(savedProfile);
      } else if (sessionName) {
        user = USERS.find((u) => u.name === sessionName) ?? null;
      }

      const permissions = savedPerms ? JSON.parse(savedPerms) : {};
      const modules = savedMods ? JSON.parse(savedMods) : [];

      set({ user, rememberedUser: remembered, permissions, modules, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  loginWithCode: async (accessCode: string) => {
    try {
      const resp = await apiClient.mobileLogin(accessCode);
      const role = (resp.user.roleKey === "ADMIN" || resp.user.roleKey === "STAFF_LMS_ADMIN" || resp.user.roleKey === "MANAGER")
        ? "MANAGER"
        : resp.user.roleKey === "SUPERVISOR"
        ? "SUPERVISOR"
        : "MECHANIC";

      const user: SessionUser = {
        id: resp.user.id,
        name: resp.user.name,
        email: resp.user.email,
        emoji: "👨‍🔧",
        role: role as any,
        roleKey: resp.user.roleKey,
        roleName: resp.user.roleName,
      };

      await AsyncStorage.multiSet([
        [SESSION_KEY, user.name],
        [REMEMBERED_KEY, accessCode],
        [USER_PROFILE_KEY, JSON.stringify(user)],
      ]);

      set({
        user,
        rememberedUser: accessCode,
        permissions: resp.access.permissions,
        modules: resp.access.modules,
      });

      return user;
    } catch (err: any) {
      // Fallback: If mock login matches
      const matched = USERS.find((u) => u.name.toUpperCase() === accessCode.toUpperCase());
      if (matched) {
        return get().login(matched.name, "1234");
      }
      throw err;
    }
  },

  login: async (name: string, pin: string) => {
    const user = await mockApi.login(name, pin);
    await AsyncStorage.multiSet([
      [SESSION_KEY, user.name],
      [REMEMBERED_KEY, user.name],
      [USER_PROFILE_KEY, JSON.stringify(user)],
    ]);
    set({ user, rememberedUser: user.name });
    return user;
  },

  hasPermission: (moduleKey: string, action: string = "view") => {
    const perms = get().permissions;
    if (!perms || Object.keys(perms).length === 0) return true; // Default allow in mock
    return perms[moduleKey]?.[action] === true;
  },

  logout: async () => {
    await apiClient.logout();
    await AsyncStorage.multiRemove([SESSION_KEY, USER_PROFILE_KEY, PERMISSIONS_KEY, MODULES_KEY]);
    set({ user: null, permissions: {}, modules: [] });
  },
}));
