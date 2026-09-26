/** Client fetch with offline-friendly errors (Capacitor-ready). */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<{ data?: T; error?: string; offline?: boolean }> {
  try {
    const res = await fetch(input, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (data as { error?: string }).error ?? res.statusText };
    }
    return { data: data as T };
  } catch {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    return {
      offline,
      error: offline ? "You appear to be offline. Check your connection and try again." : "Network error. Please try again.",
    };
  }
}
