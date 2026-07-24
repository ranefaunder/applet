import { signal } from "@preact/signals";
import type { AppSummary } from "/types/app-types";
import { ssrContext } from "/utils/ssr.client";
import { apiFetch } from "/utils/api.client";
import { getLang } from "/utils/lang";

export const apps = signal<AppSummary[]>([]);

export function initAppStore(): void {
  const { initialApps } = ssrContext();
  if (initialApps !== undefined) {
    apps.value = initialApps;
  }
}

export async function loadApps(): Promise<void> {
  const lang = getLang(window.location.pathname) ?? "en";
  const result = await apiFetch<{ apps: AppSummary[] }>(`/api/${lang}/app/list`);
  if (result.success) {
    apps.value = result.data.apps;
  }
}

export async function deleteApp(slug: string): Promise<boolean> {
  const lang = getLang(window.location.pathname) ?? "en";
  const previous = apps.value;
  apps.value = previous.filter((app) => app.slug !== slug);

  const result = await apiFetch<{ slug: string }>(`/api/${lang}/app/delete`, {
    method: "POST",
    body: JSON.stringify({ slug }),
  });

  if (!result.success) {
    apps.value = previous;
    return false;
  }
  return true;
}

/** Remove an app from the home library (owned or not). */
export async function uninstallFromLibrary(slug: string): Promise<boolean> {
  const lang = getLang(window.location.pathname) ?? "en";
  const previous = apps.value;
  apps.value = previous.filter((app) => app.slug !== slug);

  const result = await apiFetch<{ slug: string; installed: boolean }>(
    `/api/${lang}/app/uninstall`,
    {
      method: "POST",
      body: JSON.stringify({ slug }),
    },
  );

  if (!result.success) {
    apps.value = previous;
    return false;
  }
  return true;
}

export function clearApps(): void {
  apps.value = [];
}
