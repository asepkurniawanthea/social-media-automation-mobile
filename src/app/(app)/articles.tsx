import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useRouter, type Href } from "expo-router";
import { Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Status = "pending" | "processed" | "failed";
type StatusFilter = "all" | Status;

interface Article {
  id: number;
  url: string;
  title: string | null;
  author: string | null;
  published_at: string | null;
  status: Status;
  sources: { domain: string; channel: string };
}

interface ApiResponse<T> {
  data: T;
  meta: { currentPage: number; totalPages: number; totalItems: number };
}

const STATUS_STYLE: Record<Status, { label: string; bg: string; fg: string }> =
  {
    pending: { label: "Pending", bg: "#fef3c7", fg: "#92400e" },
    processed: { label: "Processed", bg: "#d1fae5", fg: "#065f46" },
    failed: { label: "Failed", bg: "#fee2e2", fg: "#991b1b" },
  };

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "failed", label: "Failed" },
];

const LIMIT = 10;

export default function ArticlesScreen() {
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  // Mencegah respons lama menimpa respons yang lebih baru
  // (mis. saat mengetik cepat atau mengganti filter).
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (pageToLoad: number, append: boolean) => {
      const id = ++requestId.current;
      try {
        const res = await api.get<ApiResponse<Article[]>>("/articles", {
          params: {
            page: pageToLoad,
            limit: LIMIT,
            search: debouncedSearch || undefined,
            status: status === "all" ? undefined : status,
          },
        });
        if (id !== requestId.current) return;

        setArticles((prev) =>
          append ? [...prev, ...res.data.data] : res.data.data,
        );
        setPage(res.data.meta.currentPage);
        setTotalPages(res.data.meta.totalPages);
        setError(null);
      } catch (err: unknown) {
        if (id !== requestId.current) return;
        setError(getErrorMessage(err, "Failed to load articles."));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, status],
  );

  // Muat ulang dari halaman 1 setiap pencarian atau filter berubah.
  useEffect(() => {
    setLoading(true);
    void load(1, false);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load(1, false);
  };

  const onEndReached = () => {
    if (loading || refreshing || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    void load(page + 1, true);
  };

  const openForm = (id?: number) => {
    router.push({
      pathname: "/user-form",
      params: id !== undefined ? { id: String(id) } : {},
    } as Href);
  };

  const doDelete = async (article: Article) => {
    setDeletingId(article.id);
    try {
      await api.delete(`/articles/${article.id}`);
      await load(1, false);
    } catch (err: unknown) {
      Alert.alert(
        "Failed to delete",
        getErrorMessage(err, "Failed to delete article."),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (article: Article) => {
    Alert.alert(
      "Delete Article",
      `Are you sure you want to delete ${article.title}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void doDelete(article),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Article }) => {
    const s = STATUS_STYLE[item.status] ?? {
      label: "Unknown",
      bg: "#e5e7eb",
      fg: "#374151",
    };
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.source} numberOfLines={1}>
            {item.sources.domain} · {item.sources.channel}
          </Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.url}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.author ?? "-"} ·{" "}
          {item.published_at
            ? new Date(item.published_at).toLocaleDateString("id-ID")
            : "-"}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => openForm(item.id)}
            style={[styles.actionBtn, styles.editBtn]}
            hitSlop={6}
          >
            <Pencil size={16} color="#475569" />
          </Pressable>
          <Pressable
            onPress={() => confirmDelete(item)}
            disabled={deletingId !== null}
            style={[
              styles.actionBtn,
              styles.deleteBtn,
              deletingId !== null && styles.actionDisabled,
            ]}
            hitSlop={6}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Trash2 size={16} color="#dc2626" />
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search url or title..."
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setStatus(f.value)}
            style={[styles.chip, status === f.value && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                status === f.value && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !error ? (
              <Text style={styles.empty}>Data is empty.</Text>
            ) : undefined
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 13, color: "#334155", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  // paddingBottom besar agar item terakhir tidak tertutup tombol tambah
  list: { padding: 16, paddingBottom: 96, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardBody: { flex: 1, gap: 6 },
  title: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  meta: { fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: { borderColor: "#cbd5e1" },
  deleteBtn: { borderColor: "#fecaca" },
  actionDisabled: { opacity: 0.4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabPressed: { opacity: 0.8 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1, color: "#dc2626", fontSize: 13 },
  retry: { color: "#2563eb", fontWeight: "600" },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  source: { flex: 1, fontSize: 12, color: "#64748b" },
});
