// Inline collapsible notes editor for staff — port of JobNotes in JobCard.tsx
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import PressScale from "../PressScale";
import { useData } from "../../store/data";

export default function JobNotes({ jobId, notes: initial }: { jobId: string; notes: string }) {
  const saveNotes = useData((s) => s.saveNotes);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await saveNotes(jobId, text).catch(() => {});
    setSaving(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <PressScale
        onPress={() => { setText(initial); setOpen(true); }}
        className="w-full mt-2 bg-yellow-50 py-2 rounded-lg border border-yellow-200 items-center"
      >
        <Text className="text-yellow-700 font-bold text-sm">
          📝 {initial ? "View / Edit Notes" : "Add Notes"}
        </Text>
      </PressScale>
    );
  }

  return (
    <View className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <Text className="text-xs font-bold text-yellow-700 mb-1">📝 Notes</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Client didn't answer, will call back..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={2}
        className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 mb-2"
        style={{ minHeight: 56, textAlignVertical: "top" }}
      />
      <View className="flex-row gap-2">
        <PressScale
          onPress={save}
          disabled={saving}
          className={`flex-1 py-2 rounded-lg items-center ${saving ? "bg-gray-300" : "bg-yellow-500"}`}
        >
          <Text className="text-white font-bold text-sm">{saving ? "Saving..." : "Save"}</Text>
        </PressScale>
        <PressScale
          onPress={() => { setText(initial); setOpen(false); }}
          className="px-4 bg-gray-100 py-2 rounded-lg items-center justify-center"
        >
          <Text className="text-gray-600 font-bold text-sm">Cancel</Text>
        </PressScale>
      </View>
    </View>
  );
}
