// The search box's raw value, and the debounced value the query actually uses.
//
// This block was copy-pasted into all four listing screens (plan E4). It is small but it
// is the kind of small that drifts: one screen at 300ms, the next at 250, one forgetting
// to `.trim()`, one forgetting to clear the timer on unmount.
//
// The raw value NEVER reaches the query — that is the whole point. `value` re-renders on
// every keystroke so the TextInput stays responsive; `debounced` changes once typing
// pauses, and it is `debounced` that belongs in `resetKey`.
import { useEffect, useState } from "react";

export function useDebouncedSearch(delay = 300) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return { value, setValue, debounced };
}
