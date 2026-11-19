import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import axios from "axios";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ArticleDetail {
  id: number;
  url: string;
  title: string | null;
  raw_content: string | null;
  published_at: string | null;
  author: string | null;
  sources_id: number;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export default function ArticleViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState<string | null>(null);

  const screenTitle = "View Article";

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await api.get<ApiResponse<ArticleDetail>>(
          `/articles/${id}`,
          { signal: controller.signal },
        );
        setArticle(res.data.data);
      } catch (err: unknown) {
        if (!axios.isCancel(err)) {
          setLoadError(getErrorMessage(err, "Failed to load article."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (loadError || !article) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <Text style={styles.errorText}>
          {loadError ?? "Article not found."}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{article.title ?? "(No title)"}</Text>
          <Text style={styles.url} selectable>
            {article.url}
          </Text>
          <Text style={styles.meta}>
            {`${article.author ?? "-"} · ${
              article.published_at
                ? new Date(article.published_at).toLocaleString("id-ID")
                : "-"
            }`}
          </Text>

          <View style={styles.contentBox}>
            {article.raw_content ? (
              <Text style={styles.contentText} selectable>
                {article.raw_content}
              </Text>
            ) : (
              <Text style={styles.empty}>Content is not available yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#f1f5f9",
  },
  content: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 6 },
  title: { fontSize: 18, fontWeight: "600", color: "#0f172a" },
  url: { fontSize: 12, color: "#64748b" },
  meta: { fontSize: 12, color: "#64748b" },
  contentBox: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 14,
  },
  contentText: { fontSize: 14, lineHeight: 21, color: "#334155" },
  empty: { fontSize: 14, color: "#64748b" },
  link: { color: "#2563eb", fontWeight: "600" },
  linkBtn: { padding: 8 },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center" },
});
