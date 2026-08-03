// Replaces <input type="date"> — Pressable field opening the native date picker.
import React, { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DatePickerField({
  label,
  value, // YYYY-MM-DD or ""
  onChange,
  placeholder = "Select date",
  maxToday = false,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxToday?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(`${value}T12:00:00`) : new Date();

  const picker = (
    <DateTimePicker
      value={dateValue}
      mode="date"
      display={Platform.OS === "ios" ? "spinner" : "default"}
      maximumDate={maxToday ? new Date() : undefined}
      onChange={(event, date) => {
        if (Platform.OS === "android") setOpen(false);
        if (event.type === "set" && date) onChange(toYMD(date));
      }}
    />
  );

  return (
    <View className="flex-1">
      {label ? <Text className="text-[10px] text-gray-400 mb-0.5">{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        className="border border-gray-200 rounded-lg px-2 py-2 bg-white"
      >
        <Text className={`text-xs ${value ? "text-gray-800" : "text-gray-400"}`}>
          {value || placeholder}
        </Text>
      </Pressable>

      {open && Platform.OS === "android" && picker}

      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
            <Pressable className="bg-white rounded-t-3xl p-4" onPress={() => {}}>
              {picker}
              <View className="flex-row gap-2 mt-2">
                {value ? (
                  <Pressable
                    onPress={() => { onChange(""); setOpen(false); }}
                    className="px-5 py-3 rounded-xl bg-gray-100"
                  >
                    <Text className="text-gray-600 font-bold text-sm">Clear</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => { if (!value) onChange(toYMD(dateValue)); setOpen(false); }}
                  className="flex-1 py-3 rounded-xl bg-gray-800 items-center"
                >
                  <Text className="text-white font-bold text-sm">Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
