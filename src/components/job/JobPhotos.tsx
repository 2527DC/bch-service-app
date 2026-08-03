// Photo strip / snap carousel — port of BlobPhotos (mock: local assets, no fetch).
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { resolvePhoto } from "../../mock/photos";
import { useData } from "../../store/data";
import PhotoViewer from "./PhotoViewer";

export default function JobPhotos({
  jobId,
  photos,
  large = false,
  photoType = "inward",
}: {
  jobId: string;
  photos: string[];
  large?: boolean;
  photoType?: "inward" | "after";
}) {
  const deletePhoto = useData((s) => s.deletePhoto);
  const [viewing, setViewing] = useState<number | null>(null);
  const { width } = useWindowDimensions();

  const sources = photos.map(resolvePhoto).filter((s): s is number => s != null);
  if (sources.length === 0) return null;

  const handleDelete = (index: number) => {
    Alert.alert("Delete this photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePhoto(jobId, index, photoType) },
    ]);
  };

  const viewer = viewing != null ? <PhotoViewer source={sources[viewing]} onClose={() => setViewing(null)} /> : null;

  if (large) {
    const cardW = width * 0.8; // w-[80vw]
    return (
      <View className="mb-3">
        {viewer}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + 12}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        >
          {sources.map((src, i) => (
            <View key={i} className="relative">
              <Pressable onPress={() => setViewing(i)}>
                <Image
                  source={src}
                  style={{ width: cardW, height: cardW * 0.7, borderRadius: 12 }}
                  contentFit="cover"
                />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(i)}
                className="absolute top-2 right-2 bg-red-500 w-7 h-7 rounded-full items-center justify-center shadow-lg"
              >
                <Text className="text-white text-xs font-bold">✕</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        {sources.length > 1 && (
          <View className="flex-row justify-center gap-1.5 mt-1.5">
            {sources.map((_, i) => (
              <View key={i} className="w-2 h-2 rounded-full bg-gray-300" />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="mb-2">
      {viewer}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {sources.map((src, i) => (
          <View key={i} className="relative">
            <Pressable onPress={() => setViewing(i)}>
              <Image source={src} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(i)}
              className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center shadow"
            >
              <Text className="text-white text-[10px] font-bold">✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
