import { signal } from "@preact/signals";
import type { StoreAppCard, StoreAppDetail } from "/types/app-types";
import type { AppDetail } from "/types/app-config-types";
import { apiFetch } from "/utils/api.client";
import { getLang } from "/utils/lang";
import type { AppCategory } from "/utils/app-categories";
import { apps, loadApps } from "/app/stores/appStore";

export const exploreApps = signal<StoreAppCard[]>([]);
export const exploreLoading = signal(false);
export const exploreQuery = signal("");
export const exploreCategory = signal<AppCategory | null>(null);
export const exploreError = signal<string | null>(null);

export const storeApp = signal<StoreAppDetail | null>(null);
export const storeLoading = signal(false);
export const storeError = signal<string | null>(null);
export const storeBusy = signal(false);

function lang(): string {
  return getLang(window.location.pathname) ?? "en";
}

export async function loadExplore(opts?: {
  q?: string;
  category?: AppCategory | null;
}): Promise<void> {
  const q = opts?.q ?? exploreQuery.value;
  const category = opts?.category !== undefined ? opts.category : exploreCategory.value;
  exploreQuery.value = q;
  exploreCategory.value = category;
  exploreLoading.value = true;
  exploreError.value = null;

  try {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    const qs = params.toString();
    const result = await apiFetch<{ apps: StoreAppCard[] }>(
      `/api/${lang()}/app/explore${qs ? `?${qs}` : ""}`,
    );
    if (!result.success) {
      exploreError.value = result.error.message ?? result.error.code;
      exploreApps.value = [];
      return;
    }
    exploreApps.value = result.data.apps;
  } finally {
    exploreLoading.value = false;
  }
}

export async function loadStoreApp(slug: string): Promise<void> {
  storeLoading.value = true;
  storeError.value = null;
  storeApp.value = null;
  try {
    const result = await apiFetch<{ app: StoreAppDetail }>(
      `/api/${lang()}/app/store-get?slug=${encodeURIComponent(slug)}`,
    );
    if (!result.success) {
      storeError.value = result.error.message ?? result.error.code;
      return;
    }
    storeApp.value = result.data.app;
  } finally {
    storeLoading.value = false;
  }
}

export async function installStoreApp(slug: string): Promise<boolean> {
  if (storeBusy.value) return false;
  storeBusy.value = true;
  storeError.value = null;
  try {
    const result = await apiFetch<{ slug: string; installed: boolean }>(
      `/api/${lang()}/app/install`,
      { method: "POST", body: JSON.stringify({ slug }) },
    );
    if (!result.success) {
      storeError.value = result.error.message ?? result.error.code;
      return false;
    }
    if (storeApp.value?.slug === slug) {
      storeApp.value = {
        ...storeApp.value,
        installed: true,
        installCount: storeApp.value.installCount + (storeApp.value.installed ? 0 : 1),
      };
    }
    exploreApps.value = exploreApps.value.map((a) =>
      a.slug === slug
        ? {
            ...a,
            installed: true,
            installCount: a.installed ? a.installCount : a.installCount + 1,
          }
        : a,
    );
    void loadApps();
    return true;
  } finally {
    storeBusy.value = false;
  }
}

export async function uninstallStoreApp(slug: string): Promise<boolean> {
  if (storeBusy.value) return false;
  storeBusy.value = true;
  storeError.value = null;
  try {
    const result = await apiFetch<{ slug: string; installed: boolean }>(
      `/api/${lang()}/app/uninstall`,
      { method: "POST", body: JSON.stringify({ slug }) },
    );
    if (!result.success) {
      storeError.value = result.error.message ?? result.error.code;
      return false;
    }
    if (storeApp.value?.slug === slug) {
      storeApp.value = {
        ...storeApp.value,
        installed: false,
        installCount: Math.max(
          0,
          storeApp.value.installCount - (storeApp.value.installed ? 1 : 0),
        ),
      };
    }
    exploreApps.value = exploreApps.value.map((a) =>
      a.slug === slug
        ? {
            ...a,
            installed: false,
            installCount: Math.max(0, a.installCount - (a.installed ? 1 : 0)),
          }
        : a,
    );
    apps.value = apps.value.filter((a) => a.slug !== slug);
    return true;
  } finally {
    storeBusy.value = false;
  }
}

/** Remix a public app into an editable clone. Returns the new AppDetail or null. */
export async function remixStoreApp(slug: string): Promise<AppDetail | null> {
  if (storeBusy.value) return null;
  storeBusy.value = true;
  storeError.value = null;
  try {
    const result = await apiFetch<{ app: AppDetail }>(`/api/${lang()}/app/remix`, {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
    if (!result.success) {
      storeError.value = result.error.message ?? result.error.code;
      return null;
    }
    void loadApps();
    return result.data.app;
  } finally {
    storeBusy.value = false;
  }
}

export function clearStoreApp(): void {
  storeApp.value = null;
  storeError.value = null;
  storeLoading.value = false;
  storeBusy.value = false;
}
