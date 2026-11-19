import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import axios from "axios";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronDown } from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ArticleDetail {
  id: number;
  url: string;
  title: string;
  sources_id: number; // sesuaikan dengan respons API
}

type SourceOption = {
  id: number;
  domain: string;
};

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

type SourceSelectProps = {
  options: SourceOption[];
  value: number | null;
  onChange: (id: number) => void;
  loading?: boolean;
  error?: string | null;
};

function SourceSelect({
  options,
  value,
  onChange,
  loading,
  error,
}: SourceSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const disabled = loading || !!error;

  const label = loading
    ? "Loading sources..."
    : error
      ? error
      : (selected?.domain ?? "Select source");

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.select, disabled && styles.selectDisabled]}
      >
        <Text
          style={[
            styles.selectText,
            !selected && styles.selectPlaceholder,
            !!error && styles.errorText,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ChevronDown size={18} color="#64748b" />
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Pressable kosong agar tap di dalam sheet tidak menutup modal */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select Source</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.id)}
              ListEmptyComponent={
                <Text style={styles.sheetEmpty}>No sources available.</Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    style={[styles.option, isSelected && styles.optionActive]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.domain}
                    </Text>
                    {isSelected && <Check size={18} color="#2563eb" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function ArticleFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const urlRef = useRef<ComponentRef<TextInput>>(null);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenTitle = isEdit ? "Edit Article" : "Add Article";

  // Ambil daftar source untuk select.
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await api.get<ApiResponse<SourceOption[]>>(
          "/sources/options",
          { signal: controller.signal },
        );
        setSources(res.data.data);
      } catch (e: unknown) {
        if (!axios.isCancel(e)) {
          setSourcesError(getErrorMessage(e, "Failed to load source list."));
        }
      } finally {
        if (!controller.signal.aborted) setSourcesLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Mode ubah: ambil data article yang dipilih.
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await api.get<ApiResponse<ArticleDetail>>(
          `/articles/${id}`,
          { signal: controller.signal },
        );
        const a = res.data.data;
        setTitle(a.title);
        setUrl(a.url);
        setSourceId(a.sources_id ?? null);
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

  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("URL is required.");
      return;
    }
    if (sourceId === null) {
      setError("Source is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: trimmedTitle,
        url: trimmedUrl,
        sources_id: sourceId, // sesuaikan dengan DTO backend
      };

      if (isEdit) {
        await api.patch(`/articles/${id}`, payload);
      } else {
        await api.post("/articles", payload);
      }

      // Kembali ke daftar; daftar memuat ulang sendiri saat layarnya terlihat lagi.
      router.back();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save article."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: screenTitle }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={title}
              onChangeText={setTitle}
              placeholder="Article title"
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              returnKeyType="next"
              onSubmitEditing={() => urlRef.current?.focus()}
            />

            <Text style={styles.label}>URL</Text>
            <TextInput
              ref={urlRef}
              style={[styles.input, styles.textarea]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://..."
              autoCapitalize="none"
              multiline
              numberOfLines={3}
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />

            <Text style={styles.label}>Source</Text>
            <SourceSelect
              options={sources}
              value={sourceId}
              onChange={setSourceId}
              loading={sourcesLoading}
              error={sourcesError}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.buttons}>
              <Pressable
                onPress={() => router.back()}
                disabled={submitting}
                style={[styles.btn, styles.btnSecondary]}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  submitting && styles.btnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {isEdit ? "Save Changes" : "Save"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: { fontSize: 13, fontWeight: "500", color: "#334155", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  link: { color: "#2563eb", fontWeight: "600" },
  linkBtn: { padding: 8 },

  // Select source
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectDisabled: { opacity: 0.6 },
  selectText: { flex: 1, fontSize: 15, color: "#0f172a" },
  selectPlaceholder: { color: "#94a3b8" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 8,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetEmpty: { textAlign: "center", color: "#64748b", padding: 16 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionActive: { backgroundColor: "#eff6ff" },
  optionText: { flex: 1, fontSize: 15, color: "#334155" },
  optionTextActive: { color: "#2563eb", fontWeight: "600" },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  switchLabel: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  btnSecondary: { borderWidth: 1, borderColor: "#cbd5e1" },
  btnSecondaryText: { color: "#334155", fontWeight: "600", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  textarea: {
    minHeight: 50,
    paddingTop: 5, // iOS: padding atas eksplisit agar teks tidak menempel
  },
});
