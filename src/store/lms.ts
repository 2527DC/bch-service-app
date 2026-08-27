import { create } from "zustand";
import { apiClient, LearnerProfile, LmsDashboardData } from "../services/apiClient";
import * as mockApi from "../services/mockApi";

export interface CourseLevel {
  id: string;
  name: string;
  levelNumber: number;
  description?: string;
  courses: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    durationMinutes: number;
    completed?: boolean;
    xpReward?: number;
  }>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  passPercentage: number;
  questions: QuizQuestion[];
  xpReward: number;
}

export interface PlaybookScenario {
  id: string;
  title: string;
  description: string;
  customerPersona: {
    name: string;
    role: string;
    avatar?: string;
    mood: string;
    budget: string;
    painPoint: string;
  };
  dialogueSteps: Array<{
    speaker: "customer" | "mechanic";
    message: string;
    options?: Array<{
      text: string;
      score: number;
      feedback: string;
    }>;
  }>;
  xpReward: number;
}

export interface BikeProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image?: string;
  keySpecs: Record<string, string>;
  usps: string[];
  objections: Array<{
    objection: string;
    counterArgument: string;
  }>;
}

export interface LeaderboardRank {
  id: string;
  name: string;
  emoji: string;
  role: string;
  xp: number;
  level: number;
  streakDays: number;
  rank: number;
}

interface LmsState {
  profile: LearnerProfile | null;
  dashboard: LmsDashboardData | null;
  courses: CourseLevel[];
  quizzes: Quiz[];
  playbooks: PlaybookScenario[];
  products: BikeProduct[];
  leaderboard: LeaderboardRank[];
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchCourses: () => Promise<void>;
  fetchQuizzes: () => Promise<void>;
  fetchPlaybooks: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  submitQuizAttempt: (quizId: string, answers: Array<{ questionId: string; selectedOption: number }>) => Promise<any>;
  submitLessonComplete: (lessonId: string) => Promise<any>;
}

export const useLms = create<LmsState>((set, get) => ({
  profile: null,
  dashboard: null,
  courses: [],
  quizzes: [],
  playbooks: [],
  products: [],
  leaderboard: [],
  loading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });
      const profile = await apiClient.getLearnerProfile();
      set({ profile, loading: false });
    } catch (err: any) {
      // Fallback to mock profile
      set({
        profile: {
          user: { id: "u1", name: "Ramesh" },
          progress: {
            xp: 240,
            streakDays: 5,
            longestStreak: 8,
            lastActiveDate: new Date().toISOString(),
            videosWatched: 3,
            scenariosCompleted: 2,
            level: 2,
            title: "Technician Apprentice",
            needed: 60,
            nextAt: 300,
            fraction: 0.8,
            isMax: false,
          },
          achievements: [
            { id: "a1", key: "first_fix", title: "First Tune-up", description: "Completed brake tuning", icon: "🔧", xpBonus: 50, earnedAt: new Date().toISOString() },
            { id: "a2", key: "streak_5", title: "5-Day Streak", description: "Active on 5 consecutive days", icon: "🔥", xpBonus: 75, earnedAt: new Date().toISOString() },
          ],
          recentActivity: [
            { id: "act1", activityType: "quiz_completed", xpEarned: 25, createdAt: new Date().toISOString() },
          ],
        },
        loading: false,
      });
    }
  },

  fetchDashboard: async () => {
    try {
      const dashboard = await apiClient.getDashboard();
      set({ dashboard });
    } catch {
      set({
        dashboard: {
          metrics: {
            totalXp: 240,
            streakDays: 5,
            completedCourses: 4,
            totalCourses: 12,
            weeklyTestsTaken: 2,
            scenariosCompleted: 3,
            roleplayAccuracy: 88,
            weeklyRank: 3,
          },
          announcements: [
            { id: "ann1", title: "New Hydraulic Disc Brake Module", content: "Check out Shimano bleed procedure course.", priority: "HIGH", createdAt: new Date().toISOString() },
          ],
          dailyTip: {
            id: "tip1",
            title: "Drivetrain Wear Check",
            content: "Always check chain elongation with a gauge before replacing rear sprockets.",
            category: "Workshop Tip",
          },
          recentActivity: [],
        },
      });
    }
  },

  fetchCourses: async () => {
    try {
      const data = await apiClient.getLearningTree();
      if (Array.isArray(data)) {
        set({ courses: data });
      }
    } catch {
      // Mock fallback courses
      const mockCourses = await mockApi.getCourses();
      set({
        courses: [
          {
            id: "lvl-1",
            name: "Level 1: Workshop Fundamentals",
            levelNumber: 1,
            courses: mockCourses.slice(0, 3).map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              level: c.level,
              durationMinutes: c.lessons?.reduce((acc, l) => acc + (l.durationMins || 10), 0) || 15,
              completed: true,
              xpReward: 50,
            })),
          },
          {
            id: "lvl-2",
            name: "Level 2: Drivetrain & Gear Tuning",
            levelNumber: 2,
            courses: mockCourses.slice(3, 6).map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              level: c.level,
              durationMinutes: c.lessons?.reduce((acc, l) => acc + (l.durationMins || 10), 0) || 20,
              completed: false,
              xpReward: 75,
            })),
          },
          {
            id: "lvl-3",
            name: "Level 3: Hydraulic Brakes & Suspension",
            levelNumber: 3,
            courses: mockCourses.slice(6).map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              level: c.level,
              durationMinutes: c.lessons?.reduce((acc, l) => acc + (l.durationMins || 10), 0) || 25,
              completed: false,
              xpReward: 100,
            })),
          },
        ],
      });
    }
  },

  fetchQuizzes: async () => {
    try {
      const quizzes = await apiClient.getQuizzes();
      set({ quizzes });
    } catch {
      set({
        quizzes: [
          {
            id: "q-derailleur",
            title: "Rear Derailleur Indexing",
            description: "Test your knowledge on B-tension adjustment and cable tensioning.",
            passPercentage: 80,
            xpReward: 40,
            questions: [
              {
                id: "q1",
                question: "What is the primary function of the B-tension screw on a rear derailleur?",
                options: [
                  "Adjust high gear limit",
                  "Set distance between upper pulley and largest sprocket",
                  "Tighten cable clamp",
                  "Align hanger perpendicular to wheel",
                ],
                correctOption: 1,
                explanation: "The B-tension screw sets the clearance between the guide pulley and the cassette teeth.",
              },
              {
                id: "q2",
                question: "If the chain hesitates when shifting to a LARGER rear cog, you should:",
                options: [
                  "Turn barrel adjuster clockwise (loosen cable)",
                  "Turn barrel adjuster counter-clockwise (tighten cable)",
                  "Adjust the H-limit screw in",
                  "Lube the chain only",
                ],
                correctOption: 1,
                explanation: "Turning counter-clockwise adds cable tension, pulling the derailleur inward towards larger cogs.",
              },
              {
                id: "q3",
                question: "A bent derailleur hanger will most commonly cause:",
                options: [
                  "Brake rubbing",
                  "Inconsistent shifting across different gears",
                  "Bottom bracket clicking",
                  "Tire deflation",
                ],
                correctOption: 1,
                explanation: "A misaligned hanger alters the pulley cage angle, causing skipping in middle cogs.",
              },
            ],
          },
          {
            id: "q-disc-brakes",
            title: "Hydraulic Disc Brake Bleeding",
            description: "Mineral oil vs DOT fluid, lever feel, and contamination prevention.",
            passPercentage: 75,
            xpReward: 50,
            questions: [
              {
                id: "db-1",
                question: "What fluid MUST be used in Shimano hydraulic brake systems?",
                options: ["DOT 5.1 fluid", "Mineral oil only", "Synthetic 10W40", "DOT 4 fluid"],
                correctOption: 1,
                explanation: "Shimano uses proprietary mineral oil. Using DOT fluid will destroy the rubber seals.",
              },
              {
                id: "db-2",
                question: "What is the best way to clean contaminated brake rotors?",
                options: ["WD-40 spray", "Isopropyl alcohol (IPA ≥ 90%)", "Chain degreaser", "Tap water"],
                correctOption: 1,
                explanation: "Pure isopropyl alcohol leaves no residue and cleans rotor braking surfaces safely.",
              },
            ],
          },
        ],
      });
    }
  },

  fetchPlaybooks: async () => {
    try {
      const playbooks = await apiClient.getPlaybooks();
      set({ playbooks });
    } catch {
      set({
        playbooks: [
          {
            id: "sc-1",
            title: "Customer: 'Brakes making loud screeching noise'",
            description: "Diagnose disc brake squeal and recommend the right cleaning or pad replacement.",
            customerPersona: {
              name: "Vikram R.",
              role: "Commuter Cyclist",
              mood: "Frustrated",
              budget: "₹500 - ₹1,500",
              painPoint: "High pitched squeal whenever stopping in traffic.",
            },
            dialogueSteps: [
              {
                speaker: "customer",
                message: "Hi, every time I pull the front brake, it makes a deafening screech! People turn around to look. Can you fix it quickly?",
              },
              {
                speaker: "mechanic",
                message: "Let's inspect what's happening.",
                options: [
                  {
                    text: "Screeching is usually caused by oil or chain lube contamination on the pads. Let me check the rotor and pad surface with you.",
                    score: 10,
                    feedback: "Excellent! Direct diagnosis, explains root cause, and invites customer collaboration.",
                  },
                  {
                    text: "Just buy new brakes, these disc brakes always make noise.",
                    score: 0,
                    feedback: "Poor response! Dismissive and attempts unnecessary upselling without inspection.",
                  },
                  {
                    text: "I'll put some WD-40 on the pads to quiet them down.",
                    score: -10,
                    feedback: "Dangerous! Never spray lubricant on braking surfaces.",
                  },
                ],
              },
            ],
            xpReward: 60,
          },
          {
            id: "sc-2",
            title: "Customer: 'Gears slipping when pedaling hard uphill'",
            description: "Identify worn chain/cassette teeth vs cable tension issue.",
            customerPersona: {
              name: "Ananya S.",
              role: "Weekend Fitness Rider",
              mood: "Concerned",
              budget: "₹1,000 - ₹3,000",
              painPoint: "Chain skips violently under pedaling load.",
            },
            dialogueSteps: [
              {
                speaker: "customer",
                message: "Whenever I stand up to pedal on a slope, the pedal jerks forward with a clunk sound. Am I going to break the cycle?",
              },
              {
                speaker: "mechanic",
                message: "How would you handle this?",
                options: [
                  {
                    text: "That clunk is typical chain skipping. It happens when the chain is elongated or the rear cassette cogs are worn. Let's measure your chain wear with our gauge.",
                    score: 10,
                    feedback: "Great explanation! Uses objective measurement tool (chain gauge) to show proof.",
                  },
                  {
                    text: "You just need to pedal softer uphill.",
                    score: -5,
                    feedback: "Unhelpful! Does not solve the mechanical failure.",
                  },
                ],
              },
            ],
            xpReward: 60,
          },
        ],
      });
    }
  },

  fetchProducts: async () => {
    try {
      const res: any = await apiClient.getProducts();
      if (Array.isArray(res) && res.length > 0) {
        const normalized: BikeProduct[] = res.map((p: any) => ({
          id: p.id,
          name: p.name || p.title || "Bicycle Model",
          brand: p.brand || "BCH",
          category: p.category || "Hybrid",
          price: Number(p.price || p.msrp || 0),
          image: p.imageUrl || p.image,
          keySpecs:
            p.specs && typeof p.specs === "object"
              ? Object.entries(p.specs).reduce((acc, [k, v]) => {
                  acc[k] = String(v);
                  return acc;
                }, {} as Record<string, string>)
              : (p.keySpecs || {}),
          usps: Array.isArray(p.usps) ? p.usps : (p.pitch ? [p.pitch] : ["Lightweight alloy frame", "Shimano drivetrain"]),
          objections: Array.isArray(p.commonObjections)
            ? p.commonObjections.map((o: any) => ({
                objection: o.objection || o.title || o.objectionText || "",
                counterArgument: o.counter || o.counterArgument || o.talkingPoint || o.response || "",
              }))
            : (Array.isArray(p.objections) ? p.objections : []),
        }));
        set({ products: normalized });
        return;
      }
      throw new Error("No products");
    } catch {
      set({
        products: [
          {
            id: "prod-1",
            name: "Firefox Montra Helicon Disc 700C",
            brand: "Montra",
            category: "Hybrid",
            price: 22500,
            keySpecs: {
              "Frame": "6061 Alloy Lightweight",
              "Gears": "Shimano Tourney 21-Speed",
              "Brakes": "Dual Mechanical Disc",
              "Tires": "700x35C Fast Rolling",
            },
            usps: [
              "Ergonomic geometry for daily Bangalore commutes",
              "Rust-free alloy components with lifetime frame warranty",
              "Dual disc brakes ensure reliable stopping in rain",
            ],
            objections: [
              {
                objection: "Why is this more expensive than basic roadsters?",
                counterArgument: "High-grade 6061 aluminum alloy weighs 4kg less, Shimano gearing makes flyovers effortless, and disc brakes require 50% less hand effort.",
              },
            ],
          },
          {
            id: "prod-2",
            name: "Trek Marlin 5 Gen 3 29er",
            brand: "Trek",
            category: "MTB",
            price: 49999,
            keySpecs: {
              "Frame": "Alpha Silver Aluminium",
              "Fork": "SR Suntour XCT 30 100mm with Hydraulic Lockout",
              "Gears": "Shimano Cues 1x9 Wide-Range",
              "Brakes": "Tektro HD-M275 Hydraulic Disc",
            },
            usps: [
              "Legendary Trek frame with internal cable routing",
              "Hydraulic lockout fork saves energy on smooth tarmac",
              "Shimano Cues 1x drivetrain provides 3x longer chain life",
            ],
            objections: [
              {
                objection: "Isn't 1x9 gearing fewer gears than 21-speed?",
                counterArgument: "1x9 eliminates front derailleur chain-drops while the 11-46T cassette gives identical climbing range with half the maintenance.",
              },
            ],
          },
        ],
      });
    }
  },

  fetchLeaderboard: async () => {
    try {
      const leaderboard = await apiClient.getLeaderboard();
      set({ leaderboard });
    } catch {
      set({
        leaderboard: [
          { id: "u1", name: "Ramesh Kumar", emoji: "👨‍🔧", role: "Senior Mechanic", xp: 1420, level: 5, streakDays: 14, rank: 1 },
          { id: "u2", name: "Suresh P.", emoji: "🛠️", role: "Assembly Tech", xp: 1180, level: 4, streakDays: 9, rank: 2 },
          { id: "u3", name: "Manoj Gowda", emoji: "🚲", role: "Mechanic", xp: 890, level: 3, streakDays: 6, rank: 3 },
          { id: "u4", name: "Kiran R.", emoji: "⚙️", role: "Junior Tech", xp: 620, level: 2, streakDays: 4, rank: 4 },
        ],
      });
    }
  },

  submitQuizAttempt: async (quizId, answers) => {
    try {
      return await apiClient.submitQuizAttempt(quizId, answers);
    } catch {
      // Mock score computation
      const state = get();
      const quiz = state.quizzes.find((q) => q.id === quizId);
      let correct = 0;
      if (quiz) {
        answers.forEach((ans) => {
          const q = quiz.questions.find((item) => item.id === ans.questionId);
          if (q && q.correctOption === ans.selectedOption) correct++;
        });
      }
      const score = quiz ? Math.round((correct / quiz.questions.length) * 100) : 100;
      const passed = score >= (quiz?.passPercentage || 75);
      const earnedXp = passed ? (quiz?.xpReward || 40) : 10;

      // Update profile XP locally
      if (state.profile) {
        set({
          profile: {
            ...state.profile,
            progress: {
              ...state.profile.progress,
              xp: state.profile.progress.xp + earnedXp,
            },
          },
        });
      }

      return { score, passed, earnedXp, correct, total: quiz?.questions.length || answers.length };
    }
  },

  submitLessonComplete: async (lessonId) => {
    try {
      return await apiClient.submitLessonProgress(lessonId);
    } catch {
      const state = get();
      if (state.profile) {
        set({
          profile: {
            ...state.profile,
            progress: {
              ...state.profile.progress,
              xp: state.profile.progress.xp + 25,
            },
          },
        });
      }
      return { success: true, earnedXp: 25 };
    }
  },
}));
