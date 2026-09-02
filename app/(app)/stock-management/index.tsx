// Stock Management hub — port of BCH-Management/src/app/(dashboard)/stock-management/page.tsx
//
// Lists the children of `stock_management` the viewer can actually reach. Rows come from
// the module catalog filtered by the session's permission map — the same test the drawer
// runs — so a person without `transfers.view` sees no Stock Transfers card here either.
// Cosmetic, as in the PWA: each destination re-checks its own grant.
import React, { useEffect } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowDownCircle,
  ArrowRightLeft,
  Boxes,
  ChevronRight,
  ClipboardCheck,
  Package,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import { stockChildren, STOCK_MANAGEMENT_KEY } from "@/lib/modules";
import { TONE, type Tone } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { Card, NoAccess, ScreenHeader } from "@/components/stock";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";

const ICONS: Record<string, LucideIcon> = { Package, Tag, ClipboardCheck, ArrowDownCircle, Truck, ArrowRightLeft };

function Kpi({ label, value, tone, onPress }: { label: string; value: number; tone: Tone; onPress?: () => void }) {
  const t = TONE[tone];
  return (
    <PressScale onPress={onPress} disabled={!onPress} className={`flex-1 min-w-[30%] rounded-lg border p-3 ${t.bg} ${t.border}`}>
      <Text className={`text-2xl font-extrabold ${t.text}`}>{value.toLocaleString("en-IN")}</Text>
      <Text className="text-[11px] font-semibold text-gray-500 mt-0.5" numberOfLines={1}>
        {label}
      </Text>
    </PressScale>
  );
}

export default function StockManagementHub() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const refresh = useStock((s) => s.refresh);
  const loaded = useStock((s) => s.loaded);
  const refreshing = useStock((s) => s.refreshing);
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  // Counters come from their own endpoint. The hub must never pull the catalogue to
  // count it — that is the whole reason /api/stock/summary exists.
  const summary = useStock((s) => s.summary);


  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  if (!can(STOCK_MANAGEMENT_KEY, "view")) return <NoAccess module="Stock Management" />;

  const children = stockChildren().filter((m) => m.route && can(m.key, "view"));

  const go = (href: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(href as never);
  };

  const activeCount = summary?.activeCount ?? 0;
  const low = summary?.lowCount ?? 0;
  const out = summary?.outCount ?? 0;
  const pendingTransfers = summary?.pendingTransfers ?? 0;
  const inTransit = summary?.inboundInTransit ?? 0;
  const todayRuns = summary?.deliveriesToday ?? 0;
  const openCounts = summary?.openCounts ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <ScreenHeader
        back={false}
        title="Stock Management"
        subtitle="Stock, product types, audits, inbound, dispatch and transfers"
        right={
          <View className="w-10 h-10 rounded-lg bg-gray-800 items-center justify-center">
            <Boxes size={20} color="#ffffff" />
          </View>
        }
      />

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {!loaded ? (
        <View className="py-16 items-center">
          <BouncingEmoji emoji="📦" size={40} caption="Loading stock..." />
        </View>
      ) : (
        <>
          {/* KPI strip — one glance at what needs a person today */}
          <View className="px-4 pt-1">
            <View className="flex-row flex-wrap gap-2">
              <Kpi label="Active SKUs" value={activeCount} tone="blue" onPress={can("stock") ? () => go("/stock") : undefined} />
              <Kpi label="Low stock" value={low} tone="amber" onPress={can("stock") ? () => go("/stock?filter=LOW_STOCK") : undefined} />
              <Kpi label="Out of stock" value={out} tone="red" onPress={can("stock") ? () => go("/stock?filter=NO_STOCK") : undefined} />
              <Kpi label="Transfers to review" value={pendingTransfers} tone="purple" onPress={can("transfers") ? () => go("/transfers") : undefined} />
              <Kpi label="Inbound in transit" value={inTransit} tone="orange" onPress={can("inbound") ? () => go("/inbound") : undefined} />
              <Kpi label="Deliveries today" value={todayRuns} tone="green" onPress={can("deliveries") ? () => go("/deliveries") : undefined} />
            </View>
            {openCounts > 0 && can("stock_audit") && (
              <PressScale onPress={() => go("/stock-audit")} className="mt-2 flex-row items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <ClipboardCheck size={16} color={TONE.amber.hex} />
                <Text className="flex-1 text-[12px] font-semibold text-amber-800">
                  {openCounts} stock count{openCounts === 1 ? "" : "s"} waiting to be finished
                </Text>
                <ChevronRight size={16} color={TONE.amber.hex} />
              </PressScale>
            )}
          </View>

          {/* Module cards — derived, never a literal list */}
          <Text className="px-5 pt-5 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Sections</Text>
          <View className="px-4 gap-2">
            {children.length === 0 ? (
              <Card className="items-center py-10">
                <Boxes size={28} color={NEUTRAL[400]} />
                <Text className="text-sm text-gray-500 mt-2">Nothing here yet.</Text>
                <Text className="text-xs text-gray-400 mt-1 text-center px-6">
                  Your role can open Stock Management but none of the sections inside it. Ask an admin to grant the ones you need.
                </Text>
              </Card>
            ) : (
              children.map((m) => {
                const Icon = ICONS[m.icon] ?? Package;
                return (
                  <PressScale key={m.key} onPress={() => go(m.route!)} className="bg-white rounded-lg border border-gray-100 p-3.5 flex-row items-center gap-3 min-h-[64px]">
                    <View className="w-11 h-11 rounded-lg bg-gray-100 items-center justify-center">
                      <Icon size={20} color={NEUTRAL[800]} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-gray-900">{m.label}</Text>
                      <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
                        {m.description}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={NEUTRAL[400]} />
                  </PressScale>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
