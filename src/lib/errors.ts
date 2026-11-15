// lib/errors.ts
import axios from "axios";

export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    // Tidak ada response = server tidak terjangkau (timeout, firewall, IP salah)
    if (!err.response) {
      return "Connection error. Please check your network.";
    }
    const data = err.response.data as { message?: unknown } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg) return msg;
    return fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};
