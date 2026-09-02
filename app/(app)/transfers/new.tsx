// New transfer request — port of BCH-Management/src/app/(dashboard)/transfers/new/page.tsx.
// Pick source and destination warehouses, add product lines with quantities, submit for
// approval. Requires `transfers.create`; stock only moves when a reviewer approves.
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, Trash2 } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { Product } from "@/mock/types";
import { NEUTRAL } from "@/lib/theme";
import { ActionButton, Card, NoAccess, ScreenHeader, SectionTitle, Stepper } from "@/components/stock";
import SearchBar from "@/components/SearchBar";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";

// The picked product travels WITH the line. The catalogue is 10k rows and is never held
// in memory, so a line cannot look its product up later — it carries what it needs, and
// availability recomputes from that snapshot when the source warehouse changes.
type Line = { product: Product; quantity: number };

export default function NewTransferScreen() {
  const router = useRouter();
  const can = useSession((s) => s.hasPermission);
  const warehouses = useStock((s) => s.warehouses);
  const loaded = useStock((s) => s.loaded);
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const createTransferOrder = useStock((s) => s.createTransferOrder);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    if (warehouses.length >= 2 && !fromId && !toId) {
      setFromId(warehouses[0].id);
      setToId(warehouses[1].id);
    }
  }, [warehouses, fromId, toId]);

  const availableAt = (p: Product) =>
    p.stockLevels.find((l) => l.warehouseId === fromId)?.quantity ?? 0;

  // Server-side type-ahead, debounced. Filtering a client-side array is not an option at
  // catalogue scale, and the endpoint caps the result rather than paging it.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const found = await mockApi.searchProducts(term, 8);
        if (!cancelled) setCandidates(found);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const picked = useMemo(() => new Set(lines.map((l) => l.product.id)), [lines]);
  const results = useMemo(() => candidates.filter((p) => !picked.has(p.id)), [candidates, picked]);

  if (!can("transfers", "create")) return <NoAccess module="New Transfer" />;
  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="🔁" size={40} />
      </View>
    );
  }

  const addLine = (product: Product) => {
    Haptics.selectionAsync().catch(() => {});
    setLines((ls) => [...ls, { product, quantity: 1 }]);
    setQuery("");
    setCandidates([]);
  };
  const setQty = (productId: string, quantity: number) =>
    setLines((ls) => ls.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  const removeLine = (productId: string) => setLines((ls) => ls.filter((l) => l.product.id !== productId));

  const overdrawn = lines.some((l) => l.quantity > availableAt(l.product));
  const valid = !!fromId && !!toId && fromId !== toId && lines.length > 0 && !overdrawn;

  const submit = async () => {
    if (!valid || !fromId || !toId) return;
    setBusy(true);
    try {
      await createTransferOrder({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        notes: notes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const WhPicker = ({ value, onChange, exclude }: { value: string | null; onChange: (id: string) => void; exclude: string | null }) => (
    <View className="flex-row gap-2">
      {warehouses.map((w) => {
        const disabled = w.id === exclude;
        const active = w.id === value;
        return (
          <PressScale
            key={w.id}
            onPress={() => !disabled && onChange(w.id)}
            disabled={disabled}
            className={`flex-1 py-2.5 rounded-xl items-center ${active ? "bg-gray-800" : "bg-gray-100"} ${disabled ? "opacity-30" : ""}`}
          >
            <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-600"}`} numberOfLines={1}>
              {w.name}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="New Transfer" subtitle="Raise a request — stock moves on approval" />
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <View className="px-4">
        <Card>
          <Text className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">From</Text>
          <WhPicker value={fromId} onChange={setFromId} exclude={toId} />
          <View className="items-center my-2">
            <ArrowRight size={16} color={NEUTRAL[400]} style={{ transform: [{ rotate: "90deg" }] }} />
          </View>
          <Text className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">To</Text>
          <WhPicker value={toId} onChange={setToId} exclude={fromId} />
        </Card>

        <SectionTitle>Items</SectionTitle>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search a product to add…" withIcon />
        {searching && results.length === 0 && query.trim().length >= 2 && (
          <Text className="text-[12px] text-gray-400 text-center py-4">Searching the catalogue…</Text>
        )}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <Text className="text-[12px] text-gray-400 text-center py-4">No active product matches “{query.trim()}”.</Text>
        )}
        {results.length > 0 && (
          <Card className="mt-2 p-0 overflow-hidden">
            {results.map((p, i) => {
              const avail = p.stockLevels.find((l) => l.warehouseId === fromId)?.quantity ?? 0;
              return (
                <PressScale
                  key={p.id}
                  onPress={() => addLine(p)}
                  className={`px-4 py-3 flex-row items-center gap-3 min-h-[56px] ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold text-gray-800" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-[10px] text-gray-400">{p.sku}</Text>
                  </View>
                  <Text className={`text-xs font-bold ${avail > 0 ? "text-gray-600" : "text-red-500"}`}>{avail} here</Text>
                </PressScale>
              );
            })}
          </Card>
        )}

        {lines.length === 0 ? (
          <Text className="text-[12px] text-gray-400 text-center py-6">No items yet — search above to add.</Text>
        ) : (
          <View className="mt-2">
            {lines.map((l) => {
              const p = l.product;
              const avail = availableAt(p);
              const over = l.quantity > avail;
              return (
                <Card key={p.id} className={`mb-2 ${over ? "border-red-300" : ""}`}>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold text-gray-800" numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text className={`text-[10px] ${over ? "text-red-600 font-bold" : "text-gray-400"}`}>
                        {p.sku} · {avail} available at source{over ? " — too many" : ""}
                      </Text>
                    </View>
                    <Stepper value={l.quantity} onChange={(v) => setQty(p.id, v)} min={1} />
                    <PressScale onPress={() => removeLine(p.id)} className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center" accessibilityLabel="Remove line">
                      <Trash2 size={16} color="#dc2626" />
                    </PressScale>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <SectionTitle>Notes</SectionTitle>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Why is this needed? (optional)"
          placeholderTextColor={NEUTRAL[400]}
          multiline
          className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-gray-800 min-h-[72px]"
          style={{ textAlignVertical: "top" }}
        />

        <View className="mt-4">
          <ActionButton
            label={busy ? "Raising…" : `Raise request (${lines.reduce((n, l) => n + l.quantity, 0)} units)`}
            onPress={submit}
            disabled={!valid || busy}
          />
        </View>
      </View>
    </ScrollView>
  );
}
