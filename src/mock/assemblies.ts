// Today's assembly logs
import type { AssemblyLog } from "./types";
import { USERS } from "./users";

const mech = (name: string) => {
  const u = USERS.find((x) => x.name === name)!;
  return { name: u.name, emoji: u.emoji };
};

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const INITIAL_ASSEMBLIES: AssemblyLog[] = [
  { id: "a1", assemblyType: "FULL", bikeModel: "Btwin Rockrider ST100", photos: ["bike2"], createdAt: todayAt(9, 40), mechanic: mech("Mohan") },
  { id: "a2", assemblyType: "A85", bikeModel: "Hero Sprint Pro", photos: ["bike1"], createdAt: todayAt(10, 15), mechanic: mech("Mohan") },
  { id: "a3", assemblyType: "A50", bikeModel: "Kids BSA Champ 20″", photos: [], createdAt: todayAt(11, 5), mechanic: mech("Iqbal") },
  { id: "a4", assemblyType: "FULL", bikeModel: "Ninety One Meraki", photos: ["bike3"], createdAt: todayAt(11, 50), mechanic: mech("Mohan") },
  { id: "a5", assemblyType: "A85", bikeModel: "Firefox Bad Attitude", photos: [], createdAt: todayAt(12, 30), mechanic: mech("Mujju") },
  { id: "a6", assemblyType: "A50", bikeModel: "EMotorad X2", photos: ["bike5"], createdAt: todayAt(13, 10), mechanic: mech("Iqbal") },
  { id: "a7", assemblyType: "FULL", bikeModel: "Montra Helicon", photos: ["bike4"], createdAt: todayAt(14, 25), mechanic: mech("Mujju") },
];
