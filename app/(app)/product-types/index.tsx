// Product Types — port of BCH-Management/src/app/(dashboard)/product-types/page.tsx.
// The tabs on Stock and what every product is filed under. No delete (a type in use is
// RESTRICTed in the schema); retire with isActive=false instead.
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Pencil, Tag } from "lucide-react-native";
import { useSession } from "@/store/session";
import { useStock } from "@/store/stock";
import type { ProductType } from "@/mock/types";
import { BRAND, NEUTRAL } from "@/lib/theme";
import { ActionButton, Badge, Card, NoAccess, ScreenHeader } from "@/components/stock";
import PressScale from "@/components/PressScale";
import ErrorBanner from "@/components/ErrorBanner";
import BouncingEmoji from "@/components/BouncingEmoji";
import EmptyState from "@/components/EmptyState";

export default function ProductTypesScreen() {
  const can = useSession((s) => s.hasPermission);
  const types = useStock((s) => s.productTypes);
  const loaded = useStock((s) => s.loaded);
  const refreshing = useStock((s) => s.refreshing);
  const error = useStock((s) => s.error);
  const setError = useStock((s) => s.setError);
  const ensureLoaded = useStock((s) => s.ensureLoaded);
  const refresh = useStock((s) => s.refresh);
  const saveProductType = useStock((s) => s.saveProductType);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  if (!can("product_types", "view")) return <NoAccess module="Product Types" />;

  const canCreate = can("product_types", "create");
  const canEdit = can("product_types", "edit");

  const openNew = () => {
    setEditing(null);
    setName("");
    setShowForm(true);
  };
  const openEdit = (t: ProductType) => {
    setEditing(t);
    setName(t.name);
    setShowForm(true);
  };
  const close = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveProductType({ id: editing?.id, name });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      close();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (t: ProductType, v: boolean) => {
    saveProductType({ id: t.id, name: t.name, isActive: v }).catch(() => {});
  };

  const active = types.filter((t) => t.isActive);
  const retired = types.filter((t) => !t.isActive);

  const Row = ({ t }: { t: ProductType }) => (
    <Card className={`mb-2 flex-row items-center gap-3 ${t.isActive ? "" : "opacity-70"}`}>
      <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
        <Tag size={18} color={NEUTRAL[800]} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-bold text-gray-900">{t.name}</Text>
          {!t.isActive && <Badge label="Retired" tone="gray" small />}
        </View>
        <Text className="text-[11px] text-gray-400 mt-0.5">
          {t.productCount} product{t.productCount === 1 ? "" : "s"} · order {t.sortOrder}
        </Text>
      </View>
      {canEdit && (
        <>
          <PressScale onPress={() => openEdit(t)} className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center" accessibilityLabel={`Rename ${t.name}`}>
            <Pencil size={16} color={NEUTRAL[800]} />
          </PressScale>
          <Switch value={t.isActive} onValueChange={(v) => toggleActive(t, v)} trackColor={{ true: BRAND[600], false: NEUTRAL[400] }} thumbColor="#ffffff" />
        </>
      )}
    </Card>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Product Types"
        subtitle={`${active.length} active · ${retired.length} retired`}
        right={
          canCreate ? (
            <PressScale onPress={openNew} className="bg-gray-800 px-4 py-2.5 rounded-lg min-h-[44px] justify-center">
              <Text className="text-white font-bold text-sm">+ Add</Text>
            </PressScale>
          ) : undefined
        }
      />
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <View className="px-4">
        {showForm && (
          <Card className="mb-3 border-gray-800">
            <Text className="text-sm font-bold text-gray-900 mb-2">{editing ? `Rename "${editing.name}"` : "New product type"}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="e.g. Cycles, Spares, Accessories"
              placeholderTextColor={NEUTRAL[400]}
              className="border border-gray-200 rounded-lg px-3 py-3 text-base bg-white text-gray-800 mb-3"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <View className="flex-row gap-2">
              <ActionButton label="Cancel" onPress={close} variant="secondary" />
              <ActionButton label={saving ? "Saving…" : editing ? "Save" : "Add"} onPress={submit} disabled={saving || !name.trim()} />
            </View>
          </Card>
        )}

        {!loaded ? (
          <View className="py-16 items-center">
            <BouncingEmoji emoji="🏷️" size={40} />
          </View>
        ) : types.length === 0 ? (
          <EmptyState emoji="🏷️" message="No product types yet" />
        ) : (
          <>
            {active.map((t) => (
              <Row key={t.id} t={t} />
            ))}
            {retired.length > 0 && (
              <>
                <Text className="px-1 pb-2 pt-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Retired</Text>
                {retired.map((t) => (
                  <Row key={t.id} t={t} />
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
