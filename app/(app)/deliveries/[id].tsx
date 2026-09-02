// Delivery detail — port of BCH-Management/src/app/(dashboard)/deliveries/[id]/page.tsx.
// Status ladder (deliveries.edit): PENDING → VERIFIED → SCHEDULED → OUT_FOR_DELIVERY →
// DELIVERED, with WALK_OUT and FLAGGED as side exits. Un-flagging needs deliveries.approve.
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { MessageCircle, Phone } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { Delivery, DeliveryStatus } from "@/mock/types";
import { formatDayMonth, formatINR, formatTime } from "@/lib/format";
import { DELIVERY_STATUS, TONE } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { ActionButton, Badge, Card, KV, NoAccess, ScreenHeader, SectionTitle } from "@/components/stock";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const [d, setD] = useState<Delivery | null>(null);
  const [loaded, setLoaded] = useState(false);
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const updateDeliveryStatus = useStock((s) => s.updateDeliveryStatus);

  const [flagging, setFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // One delivery by id, re-fetched whenever a write bumps the revision.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    mockApi
      .getDelivery(id)
      .then((x) => !cancelled && setD(x))
      .catch(() => !cancelled && setD(null))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [id, revision]);

  if (!can("deliveries", "view")) return <NoAccess module="Deliveries & Dispatch" />;
  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="🛵" size={40} />
      </View>
    );
  }
  if (!d) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScreenHeader title="Delivery" />
        <EmptyState emoji="🤷" message="Delivery not found" />
      </View>
    );
  }

  const cfg = DELIVERY_STATUS[d.status];
  const canEdit = can("deliveries", "edit");
  const canApprove = can("deliveries", "approve");

  const move = async (status: DeliveryStatus, extra?: { flagReason?: string; vehicleNo?: string }) => {
    setBusy(true);
    try {
      await updateDeliveryStatus({ id: d.id, status, ...extra });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFlagging(false);
      setFlagReason("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, body: string, status: DeliveryStatus, destructive = false) =>
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      { text: title, style: destructive ? "destructive" : "default", onPress: () => move(status) },
    ]);

  const actions: React.ReactNode = (() => {
    if (!canEdit) return null;
    switch (d.status) {
      case "PENDING":
        return (
          <View className="flex-row gap-2">
            <ActionButton label="Walk-out" variant="secondary" onPress={() => confirm("Walk-out", "Customer took it from the store — no delivery needed.", "WALK_OUT")} disabled={busy} />
            <ActionButton label="Verify invoice" onPress={() => move("VERIFIED")} disabled={busy} />
          </View>
        );
      case "VERIFIED":
      case "PREBOOKED":
        return (
          <View className="flex-row gap-2">
            <ActionButton label="Walk-out" variant="secondary" onPress={() => confirm("Walk-out", "Customer took it from the store — no delivery needed.", "WALK_OUT")} disabled={busy} />
            <ActionButton label="Schedule today" onPress={() => move("SCHEDULED")} disabled={busy} />
          </View>
        );
      case "SCHEDULED":
        return (
          <View>
            {!d.isOutstation && (
              <TextInput
                value={vehicleNo}
                onChangeText={setVehicleNo}
                autoCapitalize="characters"
                placeholder="Vehicle no. (optional) e.g. KA-05-MK-2231"
                placeholderTextColor={NEUTRAL[400]}
                className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-gray-800 mb-2"
              />
            )}
            <View className="flex-row gap-2">
              <ActionButton label="Flag issue" variant="danger" onPress={() => setFlagging(true)} disabled={busy} />
              <ActionButton label="Dispatch" onPress={() => move("OUT_FOR_DELIVERY", { vehicleNo: vehicleNo.trim() || undefined })} disabled={busy} />
            </View>
          </View>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <View className="flex-row gap-2">
            <ActionButton label="Flag issue" variant="danger" onPress={() => setFlagging(true)} disabled={busy} />
            <ActionButton label="Mark delivered" variant="success" onPress={() => confirm("Mark delivered", `Confirm ${d.customerName} received the order.`, "DELIVERED")} disabled={busy} />
          </View>
        );
      case "FLAGGED":
        return canApprove ? (
          <ActionButton label="Resolve & reschedule" onPress={() => move("SCHEDULED")} disabled={busy} />
        ) : (
          <Text className="text-[11px] text-gray-400 text-center">A supervisor needs to resolve this flag.</Text>
        );
      default:
        return null;
    }
  })();

  const timeline: Array<{ label: string; at: string | null }> = [
    { label: "Invoiced", at: d.invoiceDate },
    { label: "Scheduled", at: d.scheduledDate },
    { label: "Dispatched", at: d.dispatchedAt },
    { label: "Delivered", at: d.deliveredAt },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={d.customerName} subtitle={d.invoiceNo} right={<Badge label={cfg.label} tone={cfg.tone} />} />
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <View className="px-4">
        {d.flagReason ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-3.5 py-3 mb-3">
            <Text className="text-[11px] font-extrabold uppercase text-red-500">Flagged</Text>
            <Text className="text-[13px] font-semibold text-red-700 mt-0.5">{d.flagReason}</Text>
          </View>
        ) : null}

        {/* Customer */}
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-[13px] text-gray-800">{d.customerAddress ?? "No address on file"}</Text>
              <Text className="text-[11px] text-gray-400 mt-0.5">
                {[d.customerArea, d.customerPincode].filter(Boolean).join(" · ") || "—"}
              </Text>
            </View>
            {d.customerPhone && (
              <View className="flex-row gap-2">
                <PressScale onPress={() => Linking.openURL(`tel:${d.customerPhone}`)} className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center" accessibilityLabel="Call customer">
                  <Phone size={18} color={NEUTRAL[800]} />
                </PressScale>
                <PressScale
                  onPress={() => Linking.openURL(`https://wa.me/91${d.customerPhone}`)}
                  className="w-11 h-11 rounded-xl bg-green-50 border border-green-200 items-center justify-center"
                  accessibilityLabel="WhatsApp customer"
                >
                  <MessageCircle size={18} color={TONE.green.hex} />
                </PressScale>
              </View>
            )}
          </View>
        </Card>

        {/* Actions */}
        {actions ? <View className="mt-3">{actions}</View> : null}

        {flagging && canEdit && (
          <Card className="mt-3 border-red-200">
            <Text className="text-sm font-bold text-gray-900 mb-2">What went wrong?</Text>
            <TextInput
              value={flagReason}
              onChangeText={setFlagReason}
              autoFocus
              placeholder="e.g. Customer not reachable — 3 attempts"
              placeholderTextColor={NEUTRAL[400]}
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-gray-800 mb-3"
            />
            <View className="flex-row gap-2">
              <ActionButton label="Back" variant="secondary" onPress={() => setFlagging(false)} />
              <ActionButton label="Flag delivery" variant="danger" onPress={() => move("FLAGGED", { flagReason })} disabled={busy || !flagReason.trim()} />
            </View>
          </Card>
        )}

        {/* Order */}
        <SectionTitle>Order</SectionTitle>
        <Card>
          {d.lineItems.map((l, i) => (
            <View key={`${l.name}-${i}`} className={`flex-row items-center justify-between py-1.5 ${i > 0 ? "border-t border-gray-100" : ""}`}>
              <Text className="flex-1 text-[13px] text-gray-800" numberOfLines={2}>
                {l.name}
              </Text>
              <Text className="text-[13px] font-bold text-gray-900 ml-3">× {l.qty}</Text>
            </View>
          ))}
          <View className="pt-2 mt-1 border-t border-gray-100">
            <KV label="Invoice amount" value={formatINR(d.invoiceAmount)} />
            <KV label="Sales person" value={d.salesPerson} />
            {d.vehicleNo && <KV label="Vehicle" value={d.vehicleNo} />}
            {d.isOutstation && <KV label="Courier" value={[d.courierName, d.courierTrackingNo].filter(Boolean).join(" · ")} />}
          </View>
          {d.deliveryNotes ? <Text className="text-[12px] text-gray-500 italic mt-2">“{d.deliveryNotes}”</Text> : null}
          {d.notes ? <Text className="text-[12px] text-gray-500 italic mt-1">“{d.notes}”</Text> : null}
        </Card>

        {/* Timeline */}
        <SectionTitle>Timeline</SectionTitle>
        <Card>
          {timeline.map((t, i) => (
            <View key={t.label} className={`flex-row items-center gap-3 py-2 ${i > 0 ? "border-t border-gray-100" : ""}`}>
              <View className={`w-2.5 h-2.5 rounded-full ${t.at ? "bg-brand-600" : "bg-gray-200"}`} />
              <Text className={`flex-1 text-[13px] ${t.at ? "text-gray-800 font-semibold" : "text-gray-400"}`}>{t.label}</Text>
              <Text className="text-[11px] text-gray-400">{t.at ? `${formatDayMonth(t.at)} · ${formatTime(t.at)}` : "—"}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}
