import { signal } from "@preact/signals";
import type { AppDetail, AppEditMessage } from "/types/app-config-types";
import { ssrContext } from "/utils/ssr.client";
import { apiFetch } from "/utils/api.client";
import { getLang } from "/utils/lang";
import {
  DEFAULT_EDIT_AI_MODEL,
  EDIT_AI_MODEL_FLASH,
  type EditAiModelKey,
} from "/utils/ai-models";

export type EditMode = "chat" | "code";

export const editApp = signal<AppDetail | null>(null);
export const editMessages = signal<AppEditMessage[]>([]);
export const editLoading = signal(false);
export const editSending = signal(false);
export const editSavingCode = signal(false);
export const editError = signal<string | null>(null);
export const editMode = signal<EditMode>("chat");
export const codeDraft = signal<string>("");
/** UI selection only — Pro is one-shot and resets to Flash after send. */
export const editAiModel = signal<EditAiModelKey>(DEFAULT_EDIT_AI_MODEL);

function lang(): string {
  return getLang(window.location.pathname) ?? "en";
}

/** Seed from the SSR snapshot so a direct page load renders without a flash. */
export function initAppEditStore(): void {
  const { initialApp } = ssrContext();
  if (initialApp && initialApp.canEdit) {
    editApp.value = initialApp;
    codeDraft.value = initialApp.config.code;
  } else {
    editApp.value = null;
    codeDraft.value = "";
    editMessages.value = [];
  }
}

export async function loadEdit(slug: string): Promise<void> {
  editError.value = null;

  const alreadyLoaded = editApp.value?.slug === slug;
  if (!alreadyLoaded) {
    editApp.value = null;
    codeDraft.value = "";
    editMessages.value = [];
  }
  editLoading.value = !alreadyLoaded;

  const l = lang();
  try {
    const appResult = await apiFetch<{ app: AppDetail }>(
      `/api/${l}/app/get?slug=${encodeURIComponent(slug)}`,
    );
    if (!appResult.success) {
      editError.value = appResult.error.message ?? appResult.error.code;
      return;
    }
    editApp.value = appResult.data.app;
    codeDraft.value = appResult.data.app.config.code;

    if (appResult.data.app.canEdit) {
      const historyResult = await apiFetch<{ messages: AppEditMessage[] }>(
        `/api/${l}/app/edit-history?slug=${encodeURIComponent(slug)}`,
      );
      if (historyResult.success) {
        editMessages.value = historyResult.data.messages;
      }
    }
  } finally {
    editLoading.value = false;
  }
}

export async function sendChatMessage(slug: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || editSending.value) return;

  const model = editAiModel.value;
  editError.value = null;
  editSending.value = true;
  // Pro is a one-shot: always return the picker to Flash after submitting.
  editAiModel.value = EDIT_AI_MODEL_FLASH;

  // Optimistic: show the user's message immediately.
  const optimistic: AppEditMessage = {
    id: `local-${Date.now()}`,
    role: "user",
    content: trimmed,
    createdAt: new Date().toISOString(),
  };
  editMessages.value = [...editMessages.value, optimistic];

  try {
    const result = await apiFetch<{ app: AppDetail; messages: AppEditMessage[] }>(
      `/api/${lang()}/app/edit`,
      { method: "POST", body: JSON.stringify({ slug, message: trimmed, model }) },
    );
    if (!result.success) {
      editError.value = result.error.message ?? result.error.code;
      // Drop the optimistic message on failure.
      editMessages.value = editMessages.value.filter((m) => m.id !== optimistic.id);
      return;
    }
    editApp.value = result.data.app;
    codeDraft.value = result.data.app.config.code;
    editMessages.value = result.data.messages;
  } finally {
    editSending.value = false;
  }
}

export async function saveCode(slug: string): Promise<void> {
  if (editSavingCode.value) return;
  editError.value = null;
  editSavingCode.value = true;
  try {
    const result = await apiFetch<{ app: AppDetail }>(`/api/${lang()}/app/update-code`, {
      method: "POST",
      body: JSON.stringify({ slug, code: codeDraft.value }),
    });
    if (!result.success) {
      editError.value = result.error.message ?? result.error.code;
      return;
    }
    editApp.value = result.data.app;
    codeDraft.value = result.data.app.config.code;
  } finally {
    editSavingCode.value = false;
  }
}

export const editPublishing = signal(false);

/** Promote a ready draft into My Apps on the home screen. */
export async function publishToMyApps(slug: string): Promise<boolean> {
  if (editPublishing.value) return false;
  editError.value = null;
  editPublishing.value = true;
  try {
    const result = await apiFetch<{ app: AppDetail }>(`/api/${lang()}/app/publish`, {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
    if (!result.success) {
      editError.value = result.error.message ?? result.error.code;
      return false;
    }
    editApp.value = result.data.app;
    return true;
  } finally {
    editPublishing.value = false;
  }
}
