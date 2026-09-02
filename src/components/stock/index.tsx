// Small building blocks shared by the Stock Management screens.
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { NEUTRAL } from "@/lib/theme";
import { TONE, type Tone } from "@/lib/stock-constants";
import PressScale from "@/components/PressScale";

/** Screen title row with a back chevron — the app header has no back button of its own. */
export function ScreenHeader({
  title,
  subtitle,
  subtitleNode,
  right,
  back = true,
}: {
  title: string;
  subtitle?: string;
  /** Use instead of `subtitle` when the line is live (a running count, a progress figure). */
  subtitleNode?: React.ReactNode;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const router = useRouter();
  return (
    <View className="px-4 pt-3 pb-2 flex-row items-center gap-2">
      {back && (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate("/stock-management" as never))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          className="w-10 h-10 -ml-2 items-center justify-center rounded-full active:bg-gray-100"
        >
          <ChevronLeft size={24} color={NEUTRAL[800]} />
        </Pressable>
      )}
      <View className="flex-1">
        <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitleNode ??
          (subtitle ? (
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null)}
      </View>
      {right}
    </View>
  );
}

// `Badge` is now the soft-fill StatusBadge (doc/stitch/) — tone background, tone text, no
// border. It is re-exported under the old name so the six screens already importing
// `Badge` move together, which is the whole point of changing it in place.
export { default as Badge } from "./StatusBadge";
export { default as StatusBadge } from "./StatusBadge";

// ── Precision Logic primitives (§13.3) ────────────────────────────────────
export { default as RecordCard } from "./RecordCard";
export { default as MetaRun, type MetaToken } from "./MetaRun";
export { default as DataLabel } from "./DataLabel";
export { default as StatTile, type StatTileProps } from "./StatTile";
export { default as StatGrid } from "./StatGrid";

/** Horizontal filter pills with optional counts (generic; StatusFilter is job-specific). */
export function Pills<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
      {options.map((o) => {
        const active = o.key === value;
        const n = counts?.[o.key];
        return (
          <PressScale
            key={o.key}
            onPress={() => onChange(o.key)}
            className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full min-h-[40px] ${
              active ? "bg-ink" : "bg-white border border-gray-200"
            }`}
          >
            <Text className={`font-semibold text-[13px] ${active ? "text-white" : "text-gray-600"}`}>{o.label}</Text>
            {n !== undefined && (
              <View className={`px-1.5 py-0.5 rounded-full ${active ? "bg-gray-600" : "bg-gray-100"}`}>
                <Text className={`text-[10px] font-bold ${active ? "text-white" : "text-gray-600"}`}>{n}</Text>
              </View>
            )}
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

export function KV({ label, value, tone }: { label: string; value: string | number | null | undefined; tone?: Tone }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-gray-400 font-medium">{label}</Text>
      <Text className={`text-[13px] font-semibold ${tone ? TONE[tone].text : "text-gray-800"}`} numberOfLines={1}>
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </Text>
    </View>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`bg-white rounded-lg border border-gray-100 p-4 ${className}`}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-1 pb-2 pt-4 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{children}</Text>
  );
}

/** Primary/secondary/danger action buttons, 56px tall (AGENTS.md §8). */
export function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  className?: string;
}) {
  const bg =
    variant === "primary" ? "bg-gray-800" : variant === "danger" ? "bg-red-600" : variant === "success" ? "bg-green-600" : "bg-gray-100";
  const fg = variant === "secondary" ? "text-gray-700" : "text-white";
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 min-h-[52px] rounded-lg items-center justify-center px-4 ${bg} ${disabled ? "opacity-40" : ""} ${className}`}
    >
      <Text className={`font-bold text-[15px] ${fg}`}>{label}</Text>
    </PressScale>
  );
}

/** Quantity stepper — big targets for a workshop counter. */
export function Stepper({ value, onChange, min = 0, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);
  return (
    <View className="flex-row items-center gap-2">
      <PressScale onPress={dec} className="w-11 h-11 rounded-lg bg-gray-100 items-center justify-center">
        <Text className="text-xl font-bold text-gray-700">−</Text>
      </PressScale>
      <Text className="w-10 text-center text-lg font-extrabold text-gray-900">{value}</Text>
      <PressScale onPress={inc} className="w-11 h-11 rounded-lg bg-gray-800 items-center justify-center">
        <Text className="text-xl font-bold text-white">+</Text>
      </PressScale>
    </View>
  );
}

/** Blocks a screen when the viewer lacks the module's view grant (cosmetic — mirrors the PWA). */
export function NoAccess({ module }: { module: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-8">
      <Text className="text-5xl mb-3">🔒</Text>
      <Text className="text-lg font-bold text-gray-800 mb-1">No access</Text>
      <Text className="text-gray-400 text-center text-sm">
        Your role cannot open {module}. Ask an admin to grant it.
      </Text>
    </View>
  );
}
