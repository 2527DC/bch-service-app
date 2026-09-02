// Product detail — port of BCH-Management/src/app/(dashboard)/stock/[id]/page.tsx.
// Stock by warehouse, pricing (cost gated by `cost_price.view`), movement history, and
// an inline Adjust Stock form behind `stock.edit`.
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Package } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import { formatINR, formatDayMonth, formatTime } from "@/lib/format";
import { stockHealth, TX_TYPE } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { ActionButton, Badge, Card, KV, NoAccess, ScreenHeader, SectionTitle, Stepper } from "@/components/stock";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = useSession((s) => s.hasPermission);
  // One product, fetched by id — the catalogue is never held in the store to look through.
  const detail = useStock((s) => s.detail);
  const detailLoading = useStock((s) => s.detailLoading);
  const product = detail?.product.id === id ? detail.product : undefined;
  const history = product ? detail?.transactions : undefined;
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const loadProduct = useStock((s) => s.loadProduct);
  const clearDetail = useStock((s) => s.clearDetail);
  const adjustStock = useStock((s) => s.adjustStock);
  const setProductStatus = useStock((s) => s.setProductStatus);

  const [showAdjust, setShowAdjust] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    if (id) loadProduct(id);
    return () => clearDetail();
  }, [id, loadProduct, clearDetail]);

  useEffect(() => {
    if (product && !warehouseId) setWarehouseId(product.stockLevels[0]?.warehouseId ?? null);
  }, [product, warehouseId]);

  if (!can("stock", "view")) return <NoAccess module="Stock & Inventory" />;

  if (!product && detailLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="📦" size={40} />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScreenHeader title="Product" />
        <EmptyState emoji="🤷" message="Product not found" />
      </View>
    );
  }

  const canEdit = can("stock", "edit");
  const showCost = can("cost_price", "view");
  const h = stockHealth(product);

  const submitAdjust = async () => {
    if (!warehouseId || qty <= 0) return;
    setSaving(true);
    try {
      await adjustStock({ productId: product.id, warehouseId, delta: direction === "IN" ? qty : -qty, reason: reason.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowAdjust(false);
      setQty(1);
      setReason("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = () => {
    const deactivating = product.status === "ACTIVE";
    Alert.alert(
      deactivating ? "Deactivate product?" : "Restore product?",
      deactivating ? "It stays in history and reports but leaves the active pickers." : "It returns to the active list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: deactivating ? "Deactivate" : "Restore",
          style: deactivating ? "destructive" : "default",
          onPress: () => setProductStatus(product.id, deactivating ? "INACTIVE" : "ACTIVE").catch(() => {}),
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={product.name} subtitle={product.sku} />
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <View className="px-4">
        {/* Headline stock */}
        <Card className="flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-lg bg-gray-100 items-center justify-center">
            <Package size={26} color={NEUTRAL[800]} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className={`text-3xl font-extrabold ${h.key === "OUT" ? "text-red-600" : h.key === "LOW" ? "text-amber-600" : "text-green-600"}`}>
                {product.currentStock}
              </Text>
              <Badge label={h.label} tone={h.tone} />
              {product.status !== "ACTIVE" && <Badge label={product.status} tone="gray" />}
            </View>
            <Text className="text-[11px] text-gray-400 mt-0.5">
              {product.reservedStock > 0 ? `${product.reservedStock} reserved · ` : ""}
              reorder at {product.reorderLevel}
              {product.reorderQty ? ` · order ${product.reorderQty}` : ""}
            </Text>
          </View>
        </Card>

        {/* Stock by warehouse */}
        <SectionTitle>By location</SectionTitle>
        <Card>
          {product.stockLevels.map((l, i) => (
            <View key={l.warehouseId} className={`flex-row items-center justify-between py-2 ${i > 0 ? "border-t border-gray-100" : ""}`}>
              <View>
                <Text className="text-[13px] font-semibold text-gray-800">{l.warehouseName}</Text>
                <Text className="text-[10px] text-gray-400">{l.warehouseCode}</Text>
              </View>
              <View className="items-end">
                <Text className="text-lg font-extrabold text-gray-900">{l.quantity}</Text>
                {l.reservedQuantity > 0 && <Text className="text-[10px] text-amber-600">{l.reservedQuantity} reserved</Text>}
              </View>
            </View>
          ))}
          {product.bin && (
            <View className="pt-2 mt-1 border-t border-gray-100">
              <KV label="Bin" value={`${product.bin.code} · ${product.bin.location}`} />
            </View>
          )}
        </Card>

        {/* Actions */}
        {canEdit && (
          <View className="flex-row gap-2 mt-3">
            <ActionButton label={showAdjust ? "Close" : "Adjust Stock"} onPress={() => setShowAdjust((v) => !v)} variant={showAdjust ? "secondary" : "primary"} />
            <ActionButton
              label={product.status === "ACTIVE" ? "Deactivate" : "Restore"}
              onPress={toggleStatus}
              variant={product.status === "ACTIVE" ? "secondary" : "success"}
            />
          </View>
        )}

        {canEdit && showAdjust && (
          <Card className="mt-3 border-gray-800">
            <Text className="text-sm font-bold text-gray-900 mb-3">Adjust stock</Text>

            <Text className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Location</Text>
            <View className="flex-row gap-2 mb-3">
              {product.stockLevels.map((l) => (
                <PressScale
                  key={l.warehouseId}
                  onPress={() => setWarehouseId(l.warehouseId)}
                  className={`flex-1 py-2.5 rounded-lg items-center ${warehouseId === l.warehouseId ? "bg-gray-800" : "bg-gray-100"}`}
                >
                  <Text className={`text-xs font-bold ${warehouseId === l.warehouseId ? "text-white" : "text-gray-600"}`} numberOfLines={1}>
                    {l.warehouseName} ({l.quantity})
                  </Text>
                </PressScale>
              ))}
            </View>

            <Text className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Direction</Text>
            <View className="flex-row gap-2 mb-3">
              {(["IN", "OUT"] as const).map((d) => (
                <PressScale
                  key={d}
                  onPress={() => setDirection(d)}
                  className={`flex-1 py-2.5 rounded-lg items-center ${direction === d ? (d === "IN" ? "bg-green-600" : "bg-red-600") : "bg-gray-100"}`}
                >
                  <Text className={`text-xs font-bold ${direction === d ? "text-white" : "text-gray-600"}`}>{d === "IN" ? "+ Add" : "− Remove"}</Text>
                </PressScale>
              ))}
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[11px] font-bold text-gray-400 uppercase">Quantity</Text>
              <Stepper value={qty} onChange={setQty} min={1} />
            </View>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (damage, found, correction…)"
              placeholderTextColor={NEUTRAL[400]}
              className="border border-gray-200 rounded-lg px-3 py-3 text-sm bg-white text-gray-800 mb-3"
            />

            <ActionButton
              label={saving ? "Saving…" : `Confirm ${direction === "IN" ? "+" : "−"}${qty}`}
              onPress={submitAdjust}
              disabled={saving || !warehouseId}
              variant={direction === "IN" ? "success" : "danger"}
            />
          </Card>
        )}

        {/* Pricing */}
        <SectionTitle>Pricing</SectionTitle>
        <Card>
          <KV label="Selling price" value={formatINR(product.sellingPrice)} />
          <KV label="MRP" value={formatINR(product.mrp)} />
          {showCost && <KV label="Cost price" value={formatINR(product.costPrice)} />}
          <KV label="GST" value={`${product.gstRate}%`} />
          <KV label="HSN" value={product.hsnCode} />
        </Card>

        {/* Details */}
        <SectionTitle>Details</SectionTitle>
        <Card>
          <KV label="Type" value={product.productType.name} />
          <KV label="Brand" value={product.brand?.name} />
          <KV label="Category" value={product.category?.name} />
          <KV label="Size" value={product.size === "ECYCLE" ? "E-Cycle" : product.size ? `${product.size}″` : null} />
          <KV label="Colour" value={product.color} />
          <KV label="Condition" value={product.condition.replace(/_/g, " ")} />
          <KV label="Updated" value={`${formatDayMonth(product.updatedAt)} ${formatTime(product.updatedAt)}`} />
        </Card>

        {/* History */}
        <SectionTitle>Recent movements</SectionTitle>
        <Card>
          {!history ? (
            <Text className="text-xs text-gray-400 py-2">Loading…</Text>
          ) : history.length === 0 ? (
            <Text className="text-xs text-gray-400 py-2">No movements recorded yet.</Text>
          ) : (
            history.slice(0, 15).map((t, i) => {
              const cfg = TX_TYPE[t.type];
              return (
                <View key={t.id} className={`flex-row items-center gap-3 py-2 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                  <Badge label={cfg.label} tone={cfg.tone} small />
                  <View className="flex-1">
                    <Text className="text-[12px] text-gray-800" numberOfLines={1}>
                      {t.referenceNo ?? t.notes ?? "—"}
                    </Text>
                    <Text className="text-[10px] text-gray-400">
                      {formatDayMonth(t.createdAt)} · {t.userName}
                      {t.referenceNo && t.notes ? ` · ${t.notes}` : ""}
                    </Text>
                  </View>
                  <Text className={`text-sm font-extrabold ${t.quantity < 0 ? "text-red-600" : "text-green-600"}`}>
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
