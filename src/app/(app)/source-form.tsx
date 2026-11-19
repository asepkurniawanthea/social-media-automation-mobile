import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import axios from "axios";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Channel = "hardcode" | "ngabring" | "1001colors" | "kangbadru";

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: "hardcode", label: "Hardcode" },
  { value: "ngabring", label: "Ngabring" },
  { value: "1001colors", label: "1001 Colors" },
  { value: "kangbadru", label: "Kang Badru" },
];

// SESUAIKAN: ubah menjadi (r) => r.toUpperCase() jika backend memakai ADMIN, EDITOR, dst.
const toApiChannel = (r: Channel): string => r;

interface SourceDetail {
  id: number;
  name: string;
  domain: string;
  channel: string;
  active: boolean | null; // SESUAIKAN dengan tipe kolom di database
}

export default function SourceFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const domainRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [channel, setChannel] = useState<Channel>("hardcode");
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode ubah: ambil data user yang dipilih.
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    (async () => {
      try {
        // SESUAIKAN: respons dibungkus { data: ... } seperti endpoint lain
        const res = await api.get<{ data: SourceDetail }>(`/sources/${id}`, {
          signal: controller.signal,
        });
        const u = res.data.data;
        setName(u.name);
        setDomain(u.domain);
        setChannel(
          CHANNEL_OPTIONS.find((o) => o.value === u.channel)?.value ??
            "hardcode",
        );
        setActive(Boolean(u.active));
      } catch (err: unknown) {
        if (!axios.isCancel(err)) {
          setLoadError(getErrorMessage(err, "Failed to load source."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) {
      setError("Domain is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: trimmedName,
        domain: trimmedDomain,
        channel: toApiChannel(channel),
        active,
      };

      if (isEdit) {
        await api.patch(`/sources/${id}`, payload);
      } else {
        await api.post("/sources", payload);
      }

      // Kembali ke daftar; daftar memuat ulang sendiri saat layarnya terlihat lagi.
      router.back();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save source."));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? "Edit Source" : "Add Source";

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Source Name"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => domainRef.current?.focus()}
            />

            <Text style={styles.label}>Domain</Text>
            <TextInput
              ref={domainRef}
              style={styles.input}
              value={domain}
              onChangeText={setDomain}
              placeholder="Source Domain"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />

            <Text style={styles.label}>Channel</Text>
            <View style={styles.chips}>
              {CHANNEL_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setChannel(o.value)}
                  style={[
                    styles.chip,
                    channel === o.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      channel === o.value && styles.chipTextActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>

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
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  passwordInput: { flex: 1 },
  hint: { fontSize: 12, color: "#64748b" },
  link: { color: "#2563eb", fontWeight: "600" },
  linkBtn: { padding: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 13, color: "#334155", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
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
});
