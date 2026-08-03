// Full-screen parts/service picker with qty steppers and live total —
// port of src/components/PartsSelector.tsx
import React, { useState } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BIKE_CATEGORIES } from "../lib/constants";
import { useData } from "../store/data";
import PressScale from "./PressScale";

export default function PartsSelector({
  initialAmount,
  onConfirm,
  onCancel,
  isHold = false,
}: {
  initialAmount: number | null;
  onConfirm: (partsText: string, totalAmount: number, holdReason?: string) => void;
  onCancel: () => void;
  isHold?: boolean;
}) {
  const priceItems = useData((s) => s.prices);
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [servicePrice, setServicePrice] = useState<number | null>(initialAmount);
  const [partsSearch, setPartsSearch] = useState("");
  const [bikeCategory, setBikeCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceText, setEditingPriceText] = useState("");
  const [holdReason, setHoldReason] = useState("");

  const togglePart = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelected((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setSelected((prev) => ({ ...prev, [id]: qty }));
    }
  };

  const getPrice = (id: string) =>
    customPrices[id] !== undefined ? customPrices[id] : (priceItems.find((p) => p.id === id)?.price ?? 0);
  const partsTotal = Object.entries(selected).reduce((sum, [id, qty]) => sum + getPrice(id) * qty, 0);
  const grandTotal = (servicePrice ?? 0) + partsTotal;

  const services = priceItems.filter((p) => p.category === "SERVICE");
  const parts = priceItems.filter((p) => p.category === "PARTS");
  const sizedParts = (() => {
    if (!bikeCategory) return parts;
    const cat = BIKE_CATEGORIES[bikeCategory as keyof typeof BIKE_CATEGORIES];
    if (cat) return parts.filter((p) => !p.wheelSize || cat.sizes.includes(p.wheelSize));
    return parts;
  })();
  const filteredParts = partsSearch.trim()
    ? sizedParts.filter((p) => p.name.toLowerCase().includes(partsSearch.toLowerCase()))
    : sizedParts;

  const commitPriceEdit = (id: string, itemPrice: number) => {
    const val = Number(editingPriceText);
    if (val > 0 && val !== itemPrice) setCustomPrices((p) => ({ ...p, [id]: val }));
    else setCustomPrices((p) => { const n = { ...p }; delete n[id]; return n; });
    setEditingPriceId(null);
  };

  const handleConfirm = () => {
    setSubmitting(true);
    const partsList = Object.entries(selected)
      .map(([id, qty]) => {
        const item = priceItems.find((p) => p.id === id);
        const price = getPrice(id);
        return item ? `${item.name}${qty > 1 ? ` x${qty}` : ""} (₹${price * qty})` : "";
      })
      .filter(Boolean)
      .join(", ");
    onConfirm(partsList, grandTotal, holdReason || undefined);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-gray-50"
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="bg-white flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text className="text-gray-500 font-semibold text-sm">← Back</Text>
          </Pressable>
          <Text className="font-bold text-base text-gray-900">Parts & Service</Text>
          <Text className="text-lg font-black text-gray-900">₹{grandTotal}</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* Service */}
          <View className="bg-white p-4 mb-2">
            <Text className="font-bold text-gray-800 text-sm mb-2">Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {services.map((s) => (
                <PressScale
                  key={s.id}
                  onPress={() => setServicePrice(servicePrice === s.price ? null : s.price)}
                  className={`rounded-xl px-4 py-2.5 border ${
                    servicePrice === s.price ? "border-gray-800 bg-gray-800" : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${servicePrice === s.price ? "text-white" : "text-gray-700"}`}>
                    {s.name} · ₹{s.price}
                  </Text>
                </PressScale>
              ))}
            </ScrollView>
            <View className="flex-row items-center gap-2 mt-3">
              <Text className="text-sm text-gray-500">Custom:</Text>
              <TextInput
                keyboardType="numeric"
                value={servicePrice != null ? String(servicePrice) : ""}
                onChangeText={(t) => setServicePrice(t ? Number(t.replace(/\D/g, "")) : null)}
                placeholder="₹ Amount"
                placeholderTextColor="#9ca3af"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
              />
            </View>
          </View>

          {/* Bike category */}
          <View className="bg-white p-4 mb-2">
            <Text className="font-bold text-gray-800 text-sm mb-2">Bike Category</Text>
            <View className="flex-row gap-2 flex-wrap">
              {Object.entries(BIKE_CATEGORIES).map(([key, cat]) => (
                <PressScale
                  key={key}
                  onPress={() => setBikeCategory(bikeCategory === key ? null : key)}
                  className={`rounded-full px-4 py-2 ${bikeCategory === key ? "bg-gray-800" : "bg-gray-100"}`}
                >
                  <Text className={`text-sm font-bold ${bikeCategory === key ? "text-white" : "text-gray-600"}`}>
                    {cat.emoji} {cat.label}
                  </Text>
                </PressScale>
              ))}
            </View>
          </View>

          {/* Parts */}
          <View className="bg-white p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-gray-800 text-sm">
                Parts {bikeCategory ? `(${BIKE_CATEGORIES[bikeCategory]?.label || bikeCategory})` : ""}
              </Text>
              <Text className="text-xs text-gray-400">{filteredParts.length} items</Text>
            </View>
            <TextInput
              value={partsSearch}
              onChangeText={setPartsSearch}
              placeholder="Search parts..."
              placeholderTextColor="#9ca3af"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 bg-white text-gray-800"
            />

            {/* Selected parts */}
            {Object.keys(selected).length > 0 && (
              <View className="mb-3 pb-3 border-b border-gray-100">
                {Object.entries(selected).map(([id, qty]) => {
                  const item = priceItems.find((p) => p.id === id);
                  if (!item) return null;
                  return (
                    <View key={id} className="flex-row items-center justify-between rounded-xl px-3 py-2 mb-1 bg-gray-800">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Text className="font-medium text-sm text-white" numberOfLines={1}>{item.name}</Text>
                        {editingPriceId === id ? (
                          <TextInput
                            keyboardType="numeric"
                            autoFocus
                            value={editingPriceText}
                            onChangeText={setEditingPriceText}
                            onBlur={() => commitPriceEdit(id, item.price)}
                            onSubmitEditing={() => commitPriceEdit(id, item.price)}
                            className="ml-2 w-16 border border-gray-500 rounded px-1 py-0.5 text-sm text-white bg-gray-700 text-right"
                          />
                        ) : (
                          <Pressable onPress={() => { setEditingPriceId(id); setEditingPriceText(String(getPrice(id))); }}>
                            <Text className="text-gray-300 text-sm ml-2">
                              ₹{getPrice(id) * qty} {customPrices[id] !== undefined && "✏️"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() => setQty(id, qty - 1)}
                          className="w-7 h-7 rounded-full bg-gray-600 items-center justify-center"
                        >
                          <Text className="text-white font-bold text-sm">−</Text>
                        </Pressable>
                        <Text className="font-bold text-sm w-5 text-center text-white">{qty}</Text>
                        <Pressable
                          onPress={() => setQty(id, qty + 1)}
                          className="w-7 h-7 rounded-full bg-white items-center justify-center"
                        >
                          <Text className="text-gray-800 font-bold text-sm">+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Available parts */}
            <View style={{ gap: 4 }}>
              {filteredParts
                .filter((p) => !selected[p.id])
                .map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => togglePart(p.id)}
                    className="flex-row items-center justify-between rounded-xl px-3 py-2.5 border border-gray-100 bg-white active:bg-gray-50 min-h-[48px]"
                  >
                    <Text className="font-medium text-sm text-gray-800 flex-1 mr-2">{p.name}</Text>
                    <Text className="text-gray-400 text-sm font-semibold">₹{getPrice(p.id)}</Text>
                  </Pressable>
                ))}
            </View>
          </View>

          {/* Hold reason — only when putting on hold */}
          {isHold && (
            <View className="bg-white p-4 mt-2">
              <Text className="font-bold text-gray-800 text-sm mb-2">📌 Reason for Hold *</Text>
              <TextInput
                value={holdReason}
                onChangeText={setHoldReason}
                placeholder="e.g. Waiting for tube 26T, spoke set ordered..."
                placeholderTextColor="#9ca3af"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-800"
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View
          className="bg-white border-t border-gray-200 p-4 shadow-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm text-gray-500">
              Service ₹{servicePrice ?? 0} + Parts ₹{partsTotal}
            </Text>
            <Text className="text-2xl font-black text-gray-800">₹{grandTotal}</Text>
          </View>
          <PressScale
            onPress={handleConfirm}
            disabled={submitting || (isHold && !holdReason.trim())}
            className={`w-full py-3.5 rounded-xl items-center ${
              submitting || (isHold && !holdReason.trim()) ? "bg-gray-300" : "bg-gray-800"
            }`}
          >
            <Text className="text-white font-bold text-base">
              {submitting ? "Saving..." : isHold && !holdReason.trim() ? "Enter hold reason" : isHold ? "Confirm & Hold" : "Confirm Bill"}
            </Text>
          </PressScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
