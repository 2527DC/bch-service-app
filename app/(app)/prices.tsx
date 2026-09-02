// Price List — port of src/app/(app)/prices/page.tsx (CRUD against the mock store)
import React, { useState } from "react";
import { Alert, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useData } from "@/store/data";
import type { PriceItem } from "@/mock/types";
import BouncingEmoji from "@/components/BouncingEmoji";
import PressScale from "@/components/PressScale";

const WHEEL_SIZES = ["14", "20", "24", "26", "27.5", "29", "ECYCLE"] as const;

const sizeLabel = (s: string) => (s === "ECYCLE" ? "E-Cycle" : `${s}″`);

export default function PricesScreen() {
  const prices = useData((s) => s.prices);
  const loading = useData((s) => s.loading);
  const refreshing = useData((s) => s.refreshing);
  const refresh = useData((s) => s.refresh);
  const savePrice = useData((s) => s.savePrice);
  const deletePrice = useData((s) => s.deletePrice);

  const [tab, setTab] = useState<"SERVICE" | "PARTS">("SERVICE");
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [wheelSize, setWheelSize] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setPrice("");
    setWheelSize(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    await savePrice({
      id: editingId || undefined,
      name: name.trim(),
      category: tab,
      price: parseFloat(price),
      wheelSize: tab === "PARTS" ? wheelSize : null,
    }).catch(() => {});
    resetForm();
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Remove this item?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deletePrice(id) },
    ]);
  };

  const handleEdit = (item: PriceItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(item.price.toString());
    setWheelSize(item.wheelSize);
    setTab(item.category);
    setShowForm(true);
  };

  const catItems = prices.filter((p) => p.category === tab);
  const filtered =
    tab === "PARTS" && sizeFilter
      ? sizeFilter === "UNIVERSAL"
        ? catItems.filter((p) => !p.wheelSize)
        : catItems.filter((p) => !p.wheelSize || p.wheelSize === sizeFilter)
      : catItems;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <BouncingEmoji emoji="💰" size={40} />
      </View>
    );
  }

  const header = (
    <View className="p-4 pb-0">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">Price List</Text>
        <PressScale
          onPress={() => { resetForm(); setShowForm(true); }}
          className="bg-gray-800 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-bold text-sm">+ Add</Text>
        </PressScale>
      </View>

      {/* Category tabs */}
      <View className="flex-row gap-2 mb-3">
        {(["SERVICE", "PARTS"] as const).map((t) => (
          <PressScale
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg items-center ${tab === t ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <Text className={`font-bold text-sm ${tab === t ? "text-white" : "text-gray-600"}`}>
              {t === "SERVICE" ? "Service" : "Parts"} ({prices.filter((p) => p.category === t).length})
            </Text>
          </PressScale>
        ))}
      </View>

      {/* Wheel size filter for parts */}
      {tab === "PARTS" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
          <PressScale
            onPress={() => setSizeFilter(null)}
            className={`rounded-full px-3 py-1.5 ${!sizeFilter ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <Text className={`text-xs font-bold ${!sizeFilter ? "text-white" : "text-gray-500"}`}>All</Text>
          </PressScale>
          {WHEEL_SIZES.map((s) => (
            <PressScale
              key={s}
              onPress={() => setSizeFilter(sizeFilter === s ? null : s)}
              className={`rounded-full px-3 py-1.5 ${sizeFilter === s ? "bg-gray-800" : "bg-gray-100"}`}
            >
              <Text className={`text-xs font-bold ${sizeFilter === s ? "text-white" : "text-gray-500"}`}>
                {sizeLabel(s)}
              </Text>
            </PressScale>
          ))}
          <PressScale
            onPress={() => setSizeFilter("UNIVERSAL")}
            className={`rounded-full px-3 py-1.5 ${sizeFilter === "UNIVERSAL" ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <Text className={`text-xs font-bold ${sizeFilter === "UNIVERSAL" ? "text-white" : "text-gray-500"}`}>
              Universal
            </Text>
          </PressScale>
        </ScrollView>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <View className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <Text className="font-bold text-gray-700 mb-3">{editingId ? "Edit Item" : "New Item"}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tab === "SERVICE" ? "e.g. Puncture Repair" : "e.g. Brake Shoe Set"}
            placeholderTextColor="#9ca3af"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base bg-white text-gray-800 mb-3"
          />
          <View className="flex-row items-center gap-2 mb-3">
            <Text className="text-xl font-bold text-gray-500">₹</Text>
            <TextInput
              keyboardType="numeric"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ""))}
              placeholder="Price"
              placeholderTextColor="#9ca3af"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-base bg-white text-gray-800"
            />
          </View>

          {/* Wheel size selector (parts only) */}
          {tab === "PARTS" && (
            <View className="mb-3">
              <Text className="text-sm font-semibold text-gray-600 mb-1.5">Wheel Size</Text>
              <View className="flex-row gap-1.5 flex-wrap">
                <PressScale
                  onPress={() => setWheelSize(null)}
                  className={`rounded-full px-3 py-1.5 ${!wheelSize ? "bg-gray-800" : "bg-gray-100"}`}
                >
                  <Text className={`text-xs font-bold ${!wheelSize ? "text-white" : "text-gray-500"}`}>All Sizes</Text>
                </PressScale>
                {WHEEL_SIZES.map((s) => (
                  <PressScale
                    key={s}
                    onPress={() => setWheelSize(s)}
                    className={`rounded-full px-3 py-1.5 ${wheelSize === s ? "bg-gray-800" : "bg-gray-100"}`}
                  >
                    <Text className={`text-xs font-bold ${wheelSize === s ? "text-white" : "text-gray-500"}`}>
                      {sizeLabel(s)}
                    </Text>
                  </PressScale>
                ))}
              </View>
            </View>
          )}

          <View className="flex-row gap-2">
            <PressScale
              onPress={handleSave}
              disabled={!name.trim() || !price || saving}
              className={`flex-1 py-3 rounded-lg items-center ${!name.trim() || !price || saving ? "bg-gray-300" : "bg-green-600"}`}
            >
              <Text className="text-white font-bold">{saving ? "Saving..." : editingId ? "Update" : "Add"}</Text>
            </PressScale>
            <PressScale onPress={resetForm} className="px-6 bg-gray-200 py-3 rounded-lg items-center justify-center">
              <Text className="text-gray-600 font-bold">Cancel</Text>
            </PressScale>
          </View>
        </View>
      )}
    </View>
  );

  const footer = (
    <View className="mt-3 mb-6 items-center">
      <Text className="text-xs text-gray-400">
        {filtered.length} items{" "}
        {sizeFilter && tab === "PARTS"
          ? `for ${sizeFilter === "UNIVERSAL" ? "universal" : sizeLabel(sizeFilter)}`
          : ""}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f2937" />}
      ListEmptyComponent={
        <View className="items-center py-12">
          <Text className="text-gray-400 text-lg">No items</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View className="px-4">
          <View
            className={`flex-row items-center justify-between p-3.5 bg-white ${
              index === 0 ? "rounded-t-lg" : ""
            } ${index === filtered.length - 1 ? "rounded-b-lg" : "border-b border-gray-100"}`}
          >
            <View className="flex-1 mr-2">
              <Text className="font-semibold text-gray-800 text-sm">{item.name}</Text>
              {item.wheelSize ? (
                <Text className="text-xs text-gray-400">{sizeLabel(item.wheelSize)}</Text>
              ) : tab === "PARTS" ? (
                <Text className="text-xs text-gray-300">All sizes</Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-green-700">₹{item.price}</Text>
              <PressScale onPress={() => handleEdit(item)} className="p-1 min-h-[44px] min-w-[36px] items-center justify-center">
                <Text className="text-base">✏️</Text>
              </PressScale>
              <PressScale onPress={() => handleDelete(item.id)} className="p-1 min-h-[44px] min-w-[36px] items-center justify-center">
                <Text className="text-base">🗑️</Text>
              </PressScale>
            </View>
          </View>
        </View>
      )}
    />
  );
}
