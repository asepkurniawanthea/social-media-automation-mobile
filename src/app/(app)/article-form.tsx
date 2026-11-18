// app/(app)/user-form.tsx
// Halaman form tambah / ubah user.
//   Tambah: /user-form
//   Ubah:   /user-form?id=3
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

type Role = "admin" | "editor" | "scheduler" | "viewer";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "scheduler", label: "Scheduler" },
  { value: "viewer", label: "Viewer" },
];

// SESUAIKAN: ubah menjadi (r) => r.toUpperCase() jika backend memakai ADMIN, EDITOR, dst.
const toApiRole = (r: Role): string => r;

interface UserDetail {
  id: number;
  email: string;
  role: string;
  active: boolean | null; // SESUAIKAN dengan tipe kolom di database
}

export default function UserFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("viewer"); // default: hak akses terendah
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
        const res = await api.get<{ data: UserDetail }>(`/users/${id}`, {
          signal: controller.signal,
        });
        const u = res.data.data;
        setEmail(u.email);
        setRole(
          ROLE_OPTIONS.find((o) => o.value === u.role.toLowerCase())?.value ??
            "viewer",
        );
        setActive(Boolean(u.active));
      } catch (err: unknown) {
        if (!axios.isCancel(err)) {
          setLoadError(getErrorMessage(err, "Failed to load user."));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!isEdit && !password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        email: trimmedEmail,
        role: toApiRole(role),
        active,
        // Saat ubah, password dikirim hanya kalau diisi.
        ...(password ? { password } : {}),
      };

      if (isEdit) {
        await api.patch(`/users/${id}`, payload);
      } else {
        await api.post("/users", payload);
      }

      // Kembali ke daftar; daftar memuat ulang sendiri saat layarnya terlihat lagi.
      router.back();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save user."));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? "Edit User" : "Add User";

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
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  isEdit ? "Leave blank to keep current" : "Password"
                }
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.link}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>
            {isEdit && (
              <Text style={styles.hint}>
                Filled only if you want to change the password.
              </Text>
            )}

            <Text style={styles.label}>Role</Text>
            <View style={styles.chips}>
              {ROLE_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setRole(o.value)}
                  style={[styles.chip, role === o.value && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      role === o.value && styles.chipTextActive,
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
