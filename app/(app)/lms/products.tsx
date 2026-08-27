// Bike Specs Pocket Guide — Mobile Native Experience
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  IndianRupee,
  Search,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react-native";
import { useLms, BikeProduct } from "@/store/lms";
import PressScale from "@/components/PressScale";
import SearchBar from "@/components/SearchBar";
import { formatINR } from "@/lib/format";

const CATEGORIES = ["ALL", "MTB", "Hybrid", "Road", "Kids", "EV"] as const;

export default function ProductLearningScreen() {
  const router = useRouter();
  const products = useLms((s) => s.products);
  const fetchProducts = useLms((s) => s.fetchProducts);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleExpand = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setExpandedProduct(expandedProduct === id ? null : id);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Search & Category Filter ──────────────────────────────────────── */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 shadow-sm">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search Trek, Montra, Firefox models..." />

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2 mt-3 -mx-4 px-4"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <PressScale
                key={cat}
                scaleTo={0.95}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedCategory(cat);
                }}
                className={`px-3.5 py-1.5 rounded-full border ${
                  active
                    ? "bg-brand-600 border-brand-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-600"}`}>
                  {cat}
                </Text>
              </PressScale>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-1">
          {filteredProducts.length} Models Available
        </Text>

        <View className="gap-3.5">
          {filteredProducts.map((prod) => {
            const isExpanded = expandedProduct === prod.id;

            return (
              <View
                key={prod.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Product Summary Header */}
                <PressScale scaleTo={0.98} onPress={() => toggleExpand(prod.id)} className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200">
                          <Text className="text-brand-700 text-[10px] font-bold">{prod.brand}</Text>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-gray-100">
                          <Text className="text-gray-600 text-[10px] font-semibold">{prod.category}</Text>
                        </View>
                      </View>

                      <Text className="text-gray-900 font-bold text-base leading-snug">{prod.name}</Text>
                      <Text className="text-brand-700 font-extrabold text-base mt-1">
                        {formatINR(prod.price)}
                      </Text>
                    </View>

                    <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                      {isExpanded ? <ChevronUp size={18} color="#4b5563" /> : <ChevronDown size={18} color="#4b5563" />}
                    </View>
                  </View>
                </PressScale>

                {/* Expanded Details: Specs, USPs, Customer Objections */}
                {isExpanded && (
                  <View className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                    {/* Key Technical Specs */}
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Technical Specs
                    </Text>
                    <View className="bg-white p-3 rounded-2xl border border-gray-100 mb-3.5 gap-2">
                      {Object.entries(prod.keySpecs).map(([key, value]) => (
                        <View key={key} className="flex-row justify-between text-xs py-0.5">
                          <Text className="text-gray-500 text-xs font-medium">{key}</Text>
                          <Text className="text-gray-900 text-xs font-bold text-right flex-1 ml-2" numberOfLines={1}>
                            {value}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Selling USPs */}
                    <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
                      Key Selling Points
                    </Text>
                    <View className="gap-1.5 mb-3.5">
                      {prod.usps.map((usp, uIdx) => (
                        <View key={uIdx} className="flex-row items-start gap-2">
                          <CheckCircle2 size={14} color="#059669" className="mt-0.5" />
                          <Text className="text-gray-700 text-xs flex-1 leading-relaxed">{usp}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Customer Objections & Counters */}
                    {prod.objections && prod.objections.length > 0 && (
                      <View>
                        <Text className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
                          Objection Handling
                        </Text>
                        {prod.objections.map((obj, oIdx) => (
                          <View key={oIdx} className="bg-amber-50 p-3 rounded-2xl border border-amber-200 mb-2">
                            <View className="flex-row items-center gap-1.5 mb-1">
                              <HelpCircle size={14} color="#d97706" />
                              <Text className="text-amber-900 font-bold text-xs">Customer: "{obj.objection}"</Text>
                            </View>
                            <Text className="text-amber-950 text-xs leading-relaxed mt-0.5">
                              💡 <Text className="font-semibold">Counter:</Text> {obj.counterArgument}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
