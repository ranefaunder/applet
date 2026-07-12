import { signal } from "@preact/signals";
import type { AppDetail } from "/types/app-config-types";
import { isDraftConfig } from "/types/app-config-types";
import { ssrContext } from "/utils/ssr.client";
import { apiFetch } from "/utils/api.client";
import { getLang } from "/utils/lang";

export const currentApp = signal<AppDetail | null>(null);
export const appLoading = signal(false);
export const appError = signal<string | null>(null);

export function initAppViewStore(): void {
  const { initialApp } = ssrContext();
  if (initialApp !== undefined) {
    currentApp.value = initialApp ?? null;
  }
}

export async function ensureAppReady(slug: string): Promise<boolean> {
  const lang = getLang(window.location.pathname) ?? "en";

  if (currentApp.value?.slug !== slug) {
    currentApp.value = null;
  }

  const hasReadyApp =
    currentApp.value?.slug === slug && !isDraftConfig(currentApp.value.config);

  if (!hasReadyApp) {
    appLoading.value = true;
  }
  appError.value = null;

  try {
    if (isDraftConfig(currentApp.value?.config ?? null)) {
      const build = await apiFetch<{ app: AppDetail }>(`/api/${lang}/app/get`, {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
      if (!build.success) {
        appError.value = build.error.message ?? "Could not build app";
        return false;
      }
      currentApp.value = build.data.app;
      return true;
    }

    const result = await apiFetch<{ app: AppDetail }>(`/api/${lang}/app/get?slug=${encodeURIComponent(slug)}`);
    if (!result.success) {
      appError.value = result.error.message ?? "App not found";
      return false;
    }
    currentApp.value = result.data.app;
    return true;
  } finally {
    appLoading.value = false;
  }
}
