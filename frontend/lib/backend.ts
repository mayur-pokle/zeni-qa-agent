import { env } from "@/lib/env";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getBackendApiBaseUrl() {
  const configured = env.BACKEND_API_URL || env.NEXT_PUBLIC_BACKEND_API_URL;
  return configured ? trimTrailingSlash(configured) : null;
}

export async function fetchBackendJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBackendApiBaseUrl();

  if (!baseUrl) {
    throw new Error("BACKEND_API_URL is not configured");
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error ?? `Backend request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
