// Replaces <input type="month"> — modal list of the last 12 months.
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear();
    const m = d.getMonth();
    out.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${d.toLocaleString("en-US", { month: "short" })} ${y}`,
    });
    d.setMonth(m - 1);
  }
  return out;
}

export default function MonthPickerField({
  value, // "YYYY-MM" or ""
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const months = lastMonths(12);
  const selectedLabel = value ? months.find((m) => m.key === value)?.label ?? value : "";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
      >
        <Text className={`text-sm ${value ? "text-gray-800" : "text-gray-400"}`}>
          {selectedLabel || "Pick a month…"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-white rounded-t-3xl p-4 max-h-[60%]" onPress={() => {}}>
            <Text className="font-bold text-gray-800 text-base mb-3">Select month</Text>
            <ScrollView>
              {value ? (
                <Pressable
                  onPress={() => { onChange(""); setOpen(false); }}
                  className="py-3 px-2 rounded-xl"
                >
                  <Text className="text-sm font-medium text-red-500">Clear month filter</Text>
                </Pressable>
              ) : null}
              {months.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => { onChange(m.key); setOpen(false); }}
                  className={`py-3 px-2 rounded-xl ${value === m.key ? "bg-gray-100" : ""}`}
                >
                  <Text className={`text-sm ${value === m.key ? "font-bold text-gray-900" : "text-gray-700"}`}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
