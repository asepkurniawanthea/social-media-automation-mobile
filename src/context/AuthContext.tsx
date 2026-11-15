// context/AuthContext.tsx
import { ROLES, type Role } from "@/lib/menu";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/storage";

// SESUAIKAN dengan bentuk respons login backend Anda
interface LoginResponse {
  statusCode: number;
  message: string;
  data: { access_token: string };
}

interface AuthContextValue {
  token: string | null;
  role: Role | null; // baru
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = useMemo<Role | null>(() => {
    if (!token) return null;
    try {
      const payload = jwtDecode<{ role?: string }>(token);
      const value = payload.role?.toUpperCase();
      return ROLES.find((r) => r === value) ?? null;
    } catch {
      return null;
    }
  }, [token]);

  // Saat aplikasi dibuka: cek apakah token sudah tersimpan.
  useEffect(() => {
    getToken()
      .then(setTokenState)
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    // SESUAIKAN: rute dan nama field body (mis. username, bukan email)
    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    const accessToken = res.data.data.access_token; // SESUAIKAN nama field token
    await setToken(accessToken);
    setTokenState(accessToken);
  }, []);

  const value = useMemo(
    () => ({ token, role, isLoading, signIn, signOut }),
    [token, role, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
