// app/(app)/index.tsx
import { useRouter, type Href } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS, type MenuItem } from "@/lib/menu";

export default function MenuScreen() {
  const router = useRouter();
  const { role, signOut } = useAuth();

  const items = useMemo(
    () =>
      MENU_ITEMS.filter(
        (item) => role !== null && item.allowedRoles.includes(role),
      ),
    [role],
  );

  const renderItem = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon;
    return (
      <Pressable
        onPress={() => router.push(item.href as Href)}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        <View style={[styles.iconWrap, { backgroundColor: item.color + "1A" }]}>
          <Icon size={32} color={item.color} />
        </View>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Menu</Text>
          {role && <Text style={styles.role}>Role: {role}</Text>}
        </View>
        <Pressable onPress={() => void signOut()}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.href}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Role akun tidak dikenali, sehingga tidak ada menu yang tersedia.
            Hubungi admin.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  role: { fontSize: 12, color: "#64748b", marginTop: 2 },
  logout: { color: "#dc2626", fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  row: { justifyContent: "space-between" },
  tile: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tilePressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
});
