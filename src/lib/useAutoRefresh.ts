// 60s polling like the PWA's setInterval(fetchJobs, 60000) — but paused when
// the screen is unfocused and re-fired when the app returns to foreground.
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useData } from "../store/data";

export function useAutoRefresh(intervalMs = 60000) {
  const refresh = useData((s) => s.refresh);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      timer.current = setInterval(refresh, intervalMs);
      return () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      };
    }, [refresh, intervalMs])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);
}
