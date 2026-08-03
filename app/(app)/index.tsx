// HOME — redirects by role → mechanic | manager
import { Redirect } from "expo-router";
import { useSession } from "@/store/session";

const ROLE_REDIRECT: Record<string, string> = {
  MECHANIC: "/mechanic",
  SUPERVISOR: "/supervisor",
  MANAGER: "/manager",
};

export default function Index() {
  const user = useSession((s) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <Redirect href={(ROLE_REDIRECT[user.role] || "/mechanic") as never} />;
}
