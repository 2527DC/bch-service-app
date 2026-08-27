import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "bch-bearer-token";
const PERMISSIONS_KEY = "bch-permissions";
const MODULES_KEY = "bch-modules";

// Default localhost URL: 10.0.2.2 for Android emulator, localhost for Web/iOS
const DEFAULT_URL = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

// Gate logging behind environment variable
const IS_LOGGING_ENABLED =
  process.env.EXPO_PUBLIC_API_LOGGING === "true" ||
  process.env.EXPO_PUBLIC_ENABLE_LOGS === "true";

function logRequest(config: InternalAxiosRequestConfig) {
  if (!IS_LOGGING_ENABLED) return;
  const method = (config.method || "GET").toUpperCase();
  const url = `${config.baseURL || ""}${config.url || ""}`;
  const auth = config.headers?.Authorization ? "Bearer [TOKEN]" : "No Auth";

  console.log(`\n📡 [API REQ] ${method} ${url}`);
  console.log(`   🔑 Auth: ${auth}`);
  if (config.params && Object.keys(config.params).length > 0) {
    console.log(`   🔎 Params:`, JSON.stringify(config.params, null, 2));
  }
  if (config.data) {
    console.log(`   📦 Body:`, JSON.stringify(config.data, null, 2));
  }
}

function logResponse(response: any) {
  if (!IS_LOGGING_ENABLED) return;
  const method = (response.config?.method || "GET").toUpperCase();
  const url = response.config?.url || "";
  const status = response.status;
  const duration = response.config?.metadata?.startTime
    ? `${Date.now() - response.config.metadata.startTime}ms`
    : "";

  console.log(`\n✅ [API RES] ${status} ${method} ${url} ${duration ? `(${duration})` : ""}`);
  console.log(`   📄 Data:`, JSON.stringify(response.data, null, 2));
}

function logError(error: any) {
  if (!IS_LOGGING_ENABLED) return;
  const method = (error.config?.method || "GET").toUpperCase();
  const url = error.config?.url || "";
  const status = error.response?.status || "ERR";

  console.log(`\n❌ [API ERR] ${status} ${method} ${url}`);
  console.log(`   ⚠️ Message:`, error.message);
  if (error.response?.data) {
    console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2));
  }
}

export interface MobileLoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    roleKey: string;
    roleName: string;
  };
  access: {
    roleKey: string;
    roleName: string;
    permissions: Record<string, Record<string, boolean>>;
    modules: Array<{
      key: string;
      label: string;
      icon: string | null;
      route: string | null;
      group: string | null;
      sortOrder: number;
    }>;
  };
}

export interface LearnerProfile {
  user: { id: string; name: string };
  progress: {
    xp: number;
    streakDays: number;
    longestStreak: number;
    lastActiveDate: string | null;
    videosWatched: number;
    scenariosCompleted: number;
    level: number;
    title: string;
    needed: number;
    nextAt: number;
    fraction: number;
    isMax: boolean;
  };
  achievements: Array<{
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    xpBonus: number;
    earnedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    activityType: string;
    xpEarned: number;
    createdAt: string;
    details?: Record<string, unknown>;
  }>;
}

export interface LmsDashboardData {
  metrics: {
    totalXp: number;
    streakDays: number;
    completedCourses: number;
    totalCourses: number;
    weeklyTestsTaken: number;
    scenariosCompleted: number;
    roleplayAccuracy: number;
    weeklyRank: number;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    createdAt: string;
  }>;
  dailyTip: {
    id: string;
    title: string;
    content: string;
    category: string;
  } | null;
  recentActivity: Array<{
    id: string;
    activityType: string;
    xpEarned: number;
    createdAt: string;
  }>;
}

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Request Interceptor: Attach Bearer Token and log request
    this.instance.interceptors.request.use(
      async (config) => {
        (config as any).metadata = { startTime: Date.now() };
        const token = await this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        logRequest(config);
        return config;
      },
      (error) => {
        logError(error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor: Extract data, log response, and handle 401
    this.instance.interceptors.response.use(
      (response) => {
        logResponse(response);
        const resData = response.data;
        if (resData && resData.success !== undefined) {
          if (!resData.success) {
            throw new Error(resData.error || "Operation failed");
          }
          return resData.data !== undefined ? resData.data : resData;
        }
        return resData;
      },
      async (error) => {
        logError(error);
        if (error.response?.status === 401) {
          await this.setToken(null);
          return Promise.reject(new Error("Session expired. Please sign in again."));
        }
        const message =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Network request failed";
        return Promise.reject(new Error(message));
      }
    );
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = await AsyncStorage.getItem(TOKEN_KEY);
    return this.token;
  }

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(PERMISSIONS_KEY);
      await AsyncStorage.removeItem(MODULES_KEY);
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async mobileLogin(accessCode: string): Promise<MobileLoginResponse> {
    const res: any = await this.instance.post("/api/auth/mobile-login", {
      accessCode: accessCode.trim().toUpperCase(),
    });

    const data: MobileLoginResponse = res;
    await this.setToken(data.token);
    await AsyncStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data.access.permissions));
    await AsyncStorage.setItem(MODULES_KEY, JSON.stringify(data.access.modules));

    return data;
  }

  async logout(): Promise<void> {
    await this.setToken(null);
  }

  // ── Staff LMS ─────────────────────────────────────────────────────────────
  async getLearnerProfile(): Promise<LearnerProfile> {
    return this.instance.get("/api/staff-lms/me");
  }

  async getDashboard(): Promise<LmsDashboardData> {
    return this.instance.get("/api/staff-lms/dashboard");
  }

  async postHeartbeat(action: string = "app_open", metadata?: Record<string, unknown>): Promise<any> {
    return this.instance.post("/api/staff-lms/heartbeat", { action, metadata });
  }

  async getLearningTree(): Promise<any> {
    return this.instance.get("/api/staff-lms/learning");
  }

  async getCourses(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/learning/courses");
  }

  async getCourseDetail(id: string): Promise<any> {
    return this.instance.get(`/api/staff-lms/learning/courses/${id}`);
  }

  async getLessonDetail(id: string): Promise<any> {
    return this.instance.get(`/api/staff-lms/learning/lessons/${id}`);
  }

  async submitLessonProgress(id: string, timeSpentSeconds = 60): Promise<any> {
    return this.instance.post(`/api/staff-lms/learning/lessons/${id}/progress`, {
      completed: true,
      timeSpentSeconds,
    });
  }

  async getQuizzes(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/learning/quizzes");
  }

  async getQuizDetail(id: string): Promise<any> {
    return this.instance.get(`/api/staff-lms/learning/quizzes/${id}`);
  }

  async submitQuizAttempt(id: string, answers: Array<{ questionId: string; selectedOption: number }>): Promise<any> {
    return this.instance.post(`/api/staff-lms/learning/quizzes/${id}/attempts`, { answers });
  }

  async getWeeklyTests(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/learning/weekly-tests");
  }

  async submitWeeklyTest(id: string, answers: Array<{ questionId: string; selectedOption: number }>): Promise<any> {
    return this.instance.post(`/api/staff-lms/learning/weekly-tests/${id}/attempts`, { answers });
  }

  async getPlaybooks(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/learning/playbooks");
  }

  async getPlaybookDetail(id: string): Promise<any> {
    return this.instance.get(`/api/staff-lms/learning/playbooks/${id}`);
  }

  async getProducts(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/products");
  }

  async getProductDetail(id: string): Promise<any> {
    return this.instance.get(`/api/staff-lms/products/${id}`);
  }

  async getProductObjections(): Promise<any[]> {
    return this.instance.get("/api/staff-lms/products/objections");
  }

  async getLeaderboard(): Promise<any> {
    return this.instance.get("/api/staff-lms/rank");
  }

  // ── Workshop / Services Endpoints ─────────────────────────────────────────
  async getJobs(params?: Record<string, unknown>): Promise<any> {
    return this.instance.get("/api/services/jobs", { params });
  }

  async updateJobStatus(jobId: string, status: string, notes?: string): Promise<any> {
    return this.instance.patch(`/api/services/jobs/${jobId}`, { status, notes });
  }
}

export const apiClient = new ApiClient();
