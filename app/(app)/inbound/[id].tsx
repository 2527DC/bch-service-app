// Inbound shipment detail — port of BCH-Management/src/app/(dashboard)/inbound/[id]/page.tsx.
// Receive each bill line (inbound.edit): the received quantity lands in BCH Warehouse as an
// INWARD movement and the shipment status is recomputed from its lines.
import React, { useEffect, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { CheckCircle2, Phone } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import * as mockApi from "@/services/mockApi";
import type { InboundLineItem, InboundShipment } from "@/mock/types";
import { formatDayMonth, formatINR } from "@/lib/format";
import { INBOUND_STATUS, TONE } from "@/lib/stock-constants";
import { NEUTRAL } from "@/lib/theme";
import { ActionButton, Badge, Card, KV, NoAccess, ScreenHeader, SectionTitle, Stepper } from "@/components/stock";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";

function LineRow({ line, editable, onReceive }: { line: InboundLineItem; editable: boolean; onReceive: (qty: number) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(line.deliveredQty ?? line.quantity);
  const [busy, setBusy] = useState(false);
  const full = line.isDelivered && (line.deliveredQty ?? 0) >= line.quantity;

  const receive = async () => {
    setBusy(true);
    try {
      await onReceive(qty);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-2">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-gray-900">{line.productName}</Text>
          <Text className="text-[11px] text-gray-400 mt-0.5">
            {line.sku ?? "unmatched"} · {line.quantity} × {formatINR(line.rate)} · GST {line.gstPercent}%
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
            {full ? (
              <Badge label={`Received ${line.deliveredQty}`} tone="green" small />
            ) : line.isDelivered ? (
              <Badge label={`Short — ${line.deliveredQty}/${line.quantity}`} tone="amber" small />
            ) : (
              <Badge label="Awaiting" tone="gray" small />
            )}
            {line.bin && <Badge label={`Bin ${line.bin.code}`} tone="blue" small />}
            {line.preBookedCustomerName && <Badge label={`Pre-booked · ${line.preBookedCustomerName}`} tone="orange" small />}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-extrabold text-gray-900">{formatINR(Math.round(line.amount))}</Text>
          {full ? <CheckCircle2 size={18} color={TONE.green.hex} /> : null}
        </View>
      </View>

      {line.preBookedCustomerPhone && (
        <PressScale
          onPress={() => Linking.openURL(`tel:${line.preBookedCustomerPhone}`)}
          className="mt-2 flex-row items-center gap-1.5 self-start bg-orange-50 border border-orange-200 rounded-lg px-2 py-1"
        >
          <Phone size={12} color={TONE.orange.hex} />
          <Text className="text-[11px] font-bold text-orange-700">{line.preBookedCustomerPhone}</Text>
        </PressScale>
      )}

      {editable && !full && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          {!open ? (
            <ActionButton label={line.isDelivered ? "Receive balance" : "Receive"} onPress={() => setOpen(true)} />
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[11px] font-bold text-gray-400 uppercase">Quantity received</Text>
                <Stepper value={qty} onChange={setQty} min={0} max={line.quantity} />
              </View>
              <View className="flex-row gap-2">
                <ActionButton label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
                <ActionButton label={busy ? "Receiving…" : `Receive ${qty}`} variant="success" onPress={receive} disabled={busy || qty <= 0} />
              </View>
            </>
          )}
        </View>
      )}
    </Card>
  );
}

export default function InboundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = useSession((s) => s.hasPermission);
  const revision = useStock((s) => s.revision);
  const [shipment, setShipment] = useState<InboundShipment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const receiveInboundLine = useStock((s) => s.receiveInboundLine);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // One shipment by id, re-fetched whenever a write bumps the revision.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    mockApi
      .getInboundShipment(id)
      .then((s) => !cancelled && setShipment(s))
      .catch(() => !cancelled && setShipment(null))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [id, revision]);

  if (!can("inbound", "view")) return <NoAccess module="Inbound Tracking" />;
  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <BouncingEmoji emoji="🚚" size={40} />
      </View>
    );
  }
  if (!shipment) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScreenHeader title="Shipment" />
        <EmptyState emoji="🤷" message="Shipment not found" />
      </View>
    );
  }

  const cfg = INBOUND_STATUS[shipment.status];
  const canReceive = can("inbound", "edit");
  const received = shipment.lineItems.reduce((n, l) => n + (l.deliveredQty ?? 0), 0);

  const onReceive = async (lineId: string, qty: number) => {
    try {
      await receiveInboundLine({ shipmentId: shipment.id, lineId, deliveredQty: qty });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader title={`${shipment.brand.name} · ${shipment.billNo}`} subtitle={shipment.shipmentNo} right={<Badge label={cfg.label} tone={cfg.tone} />} />
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <View className="px-4">
        <Card>
          <KV label="Bill date" value={formatDayMonth(shipment.billDate)} />
          <KV label="Expected" value={formatDayMonth(shipment.expectedDeliveryDate)} />
          <KV label="Bill total" value={formatINR(Math.round(shipment.totalAmount))} />
          <KV label="Units" value={`${received} / ${shipment.totalItems} received`} tone={received >= shipment.totalItems ? "green" : undefined} />
          <KV label="Raised by" value={`${shipment.createdBy.name} · ${formatDayMonth(shipment.createdAt)}`} />
          {shipment.deliveredAt && <KV label="Received on" value={formatDayMonth(shipment.deliveredAt)} />}
          {shipment.putawayAt && <KV label="Put away" value={formatDayMonth(shipment.putawayAt)} tone="green" />}
          {shipment.notes ? <Text className="text-[12px] text-gray-500 italic mt-2">“{shipment.notes}”</Text> : null}
        </Card>

        <SectionTitle>{`Bill lines (${shipment.lineItems.length})`}</SectionTitle>
        {shipment.lineItems.map((line) => (
          <LineRow key={line.id} line={line} editable={canReceive} onReceive={(qty) => onReceive(line.id, qty)} />
        ))}

        {!canReceive && shipment.status !== "DELIVERED" && (
          <Text className="text-[11px] text-gray-400 text-center mt-2">You can view this shipment but not receive it.</Text>
        )}
        <View className="h-2" />
        <Text className="text-[10px] text-gray-300 text-center">
          <Text style={{ color: NEUTRAL[400] }}>Receiving posts stock to BCH Warehouse.</Text>
        </Text>
      </View>
    </ScrollView>
  );
}
