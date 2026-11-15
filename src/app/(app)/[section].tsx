// app/(app)/[section].tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MENU_ITEMS } from "@/lib/menu";

export default function SectionPlaceholder() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const title =
    MENU_ITEMS.find((m) => m.href === `/${section}`)?.name ?? "Halaman";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>Halaman ini belum dibuat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  sub: { color: "#64748b" },
});
