import type { Course, CourseProgress } from "./types";

export const COURSES: Course[] = [
  {
    id: "c1",
    title: "Workshop Safety Basics",
    description: "Tool handling, lifting, and what to do when something goes wrong on the floor.",
    category: "SAFETY",
    level: "BEGINNER",
    emoji: "🦺",
    requiredFor: ["MECHANIC", "SUPERVISOR", "MANAGER"],
    lessons: [
      { id: "c1l1", title: "Personal protective gear", durationMins: 8, kind: "VIDEO", summary: "Gloves, eye protection, and when each is mandatory." },
      { id: "c1l2", title: "Safe lifting and stands", durationMins: 12, kind: "PRACTICAL", summary: "Mounting a bike on the stand without straining your back." },
      { id: "c1l3", title: "Chemical and degreaser handling", durationMins: 10, kind: "READING", summary: "Storage, ventilation, and spill cleanup." },
      { id: "c1l4", title: "Incident reporting", durationMins: 6, kind: "READING", summary: "Who to inform and what to record after an injury." },
    ],
  },
  {
    id: "c2",
    title: "Gear & Brake Tuning",
    description: "Derailleur indexing, cable tension, and getting brakes right the first time.",
    category: "REPAIR",
    level: "INTERMEDIATE",
    emoji: "⚙️",
    requiredFor: ["MECHANIC"],
    lessons: [
      { id: "c2l1", title: "Reading a worn drivetrain", durationMins: 14, kind: "VIDEO", summary: "Chain stretch, cassette hooking, and when to replace." },
      { id: "c2l2", title: "Indexing a rear derailleur", durationMins: 18, kind: "PRACTICAL", summary: "Limit screws, barrel adjuster, one click at a time." },
      { id: "c2l3", title: "V-brake vs disc setup", durationMins: 16, kind: "PRACTICAL", summary: "Pad alignment, rotor truing, and eliminating rub." },
      { id: "c2l4", title: "Hydraulic brake bleed", durationMins: 22, kind: "VIDEO", summary: "Full bleed procedure without introducing air." },
      { id: "c2l5", title: "Final road test checklist", durationMins: 7, kind: "READING", summary: "The 9 checks before a bike goes back to the customer." },
    ],
  },
  {
    id: "c3",
    title: "E-Cycle Service",
    description: "Battery, controller, and motor diagnostics for the e-cycle range.",
    category: "REPAIR",
    level: "ADVANCED",
    emoji: "🔋",
    requiredFor: ["MECHANIC"],
    lessons: [
      { id: "c3l1", title: "Battery safety and storage", durationMins: 11, kind: "READING", summary: "Charge limits, heat, and damaged-cell protocol." },
      { id: "c3l2", title: "Reading controller error codes", durationMins: 15, kind: "VIDEO", summary: "Mapping display codes to the actual fault." },
      { id: "c3l3", title: "Hub motor removal & refit", durationMins: 25, kind: "PRACTICAL", summary: "Torque arms, cable routing, and spoke tension." },
      { id: "c3l4", title: "Range complaint diagnosis", durationMins: 13, kind: "READING", summary: "Separating a real fault from normal range expectations." },
    ],
  },
  {
    id: "c4",
    title: "Assembly Standards",
    description: "The A50 / A85 / Full assembly checklists and what a pass looks like.",
    category: "SERVICE",
    level: "BEGINNER",
    emoji: "📦",
    requiredFor: ["MECHANIC"],
    lessons: [
      { id: "c4l1", title: "A50 checklist walkthrough", durationMins: 9, kind: "VIDEO", summary: "Half-assembly scope and handover points." },
      { id: "c4l2", title: "A85 checklist walkthrough", durationMins: 12, kind: "VIDEO", summary: "What A85 adds over A50." },
      { id: "c4l3", title: "Torque values that matter", durationMins: 10, kind: "READING", summary: "Stem, seatpost, crank, and rotor bolts." },
      { id: "c4l4", title: "Photographing your work", durationMins: 5, kind: "PRACTICAL", summary: "Angles and lighting for the assembly log." },
    ],
  },
  {
    id: "c5",
    title: "Customer Handover",
    description: "Explaining the work done, the bill, and setting the right expectation.",
    category: "CUSTOMER",
    level: "BEGINNER",
    emoji: "🤝",
    requiredFor: ["MECHANIC", "SUPERVISOR"],
    lessons: [
      { id: "c5l1", title: "Explaining the job card", durationMins: 8, kind: "READING", summary: "Walking a customer through what was replaced and why." },
      { id: "c5l2", title: "Handling a price objection", durationMins: 11, kind: "VIDEO", summary: "Staying calm and pointing at the price list." },
      { id: "c5l3", title: "Asking for the Google review", durationMins: 6, kind: "PRACTICAL", summary: "When to ask, and how not to make it awkward." },
    ],
  },
];

// Seeded progress so the module does not open empty. Everything else is 0%.
export const INITIAL_PROGRESS: CourseProgress[] = [
  { courseId: "c1", userId: "u1", completedLessonIds: ["c1l1", "c1l2", "c1l3", "c1l4"] },
  { courseId: "c2", userId: "u1", completedLessonIds: ["c2l1", "c2l2"] },
  { courseId: "c1", userId: "u2", completedLessonIds: ["c1l1", "c1l2"] },
  { courseId: "c4", userId: "u4", completedLessonIds: ["c4l1", "c4l2", "c4l3"] },
  { courseId: "c1", userId: "u3", completedLessonIds: ["c1l1"] },
  { courseId: "c3", userId: "u6", completedLessonIds: ["c3l1", "c3l2", "c3l3"] },
];
