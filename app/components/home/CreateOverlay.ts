import { html, css } from "/utils/markup";
import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import { user } from "/app/stores/userStore";
import { apiFetch } from "/utils/api.client";
import { appEditUrl } from "/utils/app-url";
import type { AppDetail, AppEditMessage } from "/types/app-config-types";
import {
  EDIT_AI_MODELS,
  DEFAULT_EDIT_AI_MODEL,
  isEditAiModelKey,
  type EditAiModelKey,
} from "/utils/ai-models";
import {
  codeDraft,
  editAiModel,
  editApp,
  editMessages,
  setEditAiModel,
} from "/app/stores/appEditStore";
import {
  createOverlayOpen,
  closeCreateOverlay,
} from "/app/stores/createOverlayStore";

const WELCOME_KEY =
  "Hey — I'm Abblet.\n\nTell me what kind of little app would help you. Just write it like you'd say it out loud — a couple of words is enough.\n\nFor example: shopping list, habit tracker, workout log, recipe book, budget, or mood journal.\n\nI do best with small, personal tools. What do you need?";

/** Full-screen create chat that slides in from the right over the home launcher. */
export default function CreateOverlay() {
  const open = createOverlayOpen.value;
  const entered = useSignal(false);
  const { path, route } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const loggedIn = !!user.value;
  const draft = useSignal("");
  const sending = useSignal(false);
  const error = useSignal<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const welcome: AppEditMessage = {
    id: "welcome",
    role: "assistant",
    content: t(WELCOME_KEY),
    createdAt: "",
  };

  // Drive enter/exit via a deferred class so the off-screen transform paints first.
  useEffect(() => {
    if (!open) {
      entered.value = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      entered.value = true;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!entered.value || !loggedIn || sending.value) return;
    inputRef.current?.focus();
  }, [entered.value, sending.value, loggedIn]);

  useEffect(() => {
    const el = listRef.current;
    if (el && entered.value) el.scrollTop = el.scrollHeight;
  }, [sending.value, entered.value]);

  useEffect(() => {
    if (!entered.value) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending.value) close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [entered.value, sending.value]);

  function close() {
    if (sending.value) return;
    entered.value = false;
    window.setTimeout(() => {
      closeCreateOverlay();
      draft.value = "";
      error.value = null;
    }, 340);
  }

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (!loggedIn || sending.value) return;
    const text = (inputRef.current?.value ?? draft.value).trim();
    if (!text) return;

    const model = isEditAiModelKey(editAiModel.value) ? editAiModel.value : DEFAULT_EDIT_AI_MODEL;
    error.value = null;
    sending.value = true;
    draft.value = "";
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
    }

    try {
      const result = await apiFetch<{ app: AppDetail; messages: AppEditMessage[] }>(
        `/api/${lang}/app/generate`,
        {
          method: "POST",
          body: JSON.stringify({ message: text, model }),
        },
      );
      if (!result.success) {
        error.value = result.error.message ?? result.error.code;
        draft.value = text;
        if (inputRef.current) inputRef.current.value = text;
        return;
      }
      editApp.value = result.data.app;
      editMessages.value = result.data.messages;
      codeDraft.value = result.data.app.config.code;
      entered.value = false;
      closeCreateOverlay();
      route(appEditUrl(lang, result.data.app.slug), true);
    } finally {
      sending.value = false;
    }
  }

  const isOpen = entered.value;

  const view = html`
    <div
      data-scope="CreateOverlay"
      class=${`overlay${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal=${isOpen ? "true" : undefined}
      aria-hidden=${isOpen ? undefined : "true"}
      aria-label=${t("New App")}
      inert=${isOpen ? undefined : true}
    >
      <div class="scrim" onClick=${() => close()}></div>
      <div class=${`panel${isOpen ? " in" : ""}`} ui-column>
        ${!loggedIn
          ? html`
            <header class="topbar" ui-row="x-between y-center gap-md" ui-padding="inline-md block-sm">
              <button
                type="button"
                ui-button="tertiary square sm"
                ui-icon="arrow-left"
                aria-label=${t("Back")}
                onClick=${() => close()}
              ></button>
              <span class="app-chip-title">${t("New App")}</span>
              <span class="topbar-spacer" aria-hidden="true"></span>
            </header>
            <div class="state" ui-column="gap-md x-center y-center">
              <p ui-heading="sm">${t("Sign in to apply your ideas")}</p>
              <button
                type="button"
                ui-button="primary"
                onClick=${() => (document.getElementById("login-dialog") as HTMLDialogElement | null)?.showModal()}
              >
                ${t("Login")}
              </button>
            </div>`
          : html`
            <header class="topbar" ui-row="x-between y-center gap-md" ui-padding="inline-md block-sm">
              <div class="topbar-title" ui-row="y-center gap-sm">
                <button
                  type="button"
                  ui-button="tertiary square sm"
                  ui-icon="arrow-left"
                  aria-label=${t("Back")}
                  disabled=${sending.value}
                  onClick=${() => close()}
                ></button>
                <span class="app-chip-title">${t("New App")}</span>
                <span class="badge">${t("Building")}</span>
              </div>
            </header>

            ${error.value
              ? html`<div class="error-banner" role="alert" ui-margin="inline-md top-sm">${error.value}</div>`
              : ""}

            <div class="chat" ui-column>
              <div class="messages" ref=${listRef}>
                <div class="messages-inner" ui-column="gap-md">
                  <div class="msg assistant">
                    <div class="bubble">${welcome.content}</div>
                  </div>
                  ${sending.value
                    ? html`
                      <div class="msg assistant">
                        <div class="bubble typing" aria-live="polite" ui-row="y-center gap-sm">
                          <span>${t("AI is building your app.")}</span>
                          <i ui-icon="spinner sm" aria-hidden="true"></i>
                        </div>
                      </div>`
                    : ""}
                </div>
              </div>

              <form
                class="composer"
                ui-column="gap-xs"
                ui-padding="inline-md bottom-md top-sm"
                onSubmit=${(e: Event) => void submit(e)}
              >
                <div class="composer-shell" ui-column="gap-sm" ui-padding="sm">
                  <textarea
                    ref=${inputRef}
                    class="composer-input"
                    rows="1"
                    placeholder=${t("Create an app for…")}
                    value=${draft.value}
                    disabled=${sending.value}
                    onInput=${(e: Event) => {
                      draft.value = (e.target as HTMLTextAreaElement).value;
                      resizeInput();
                    }}
                  ></textarea>
                  <div ui-row="x-between y-center gap-sm">
                    <label class="model-picker">
                      <span class="sr-only">${t("AI model")}</span>
                      <select
                        ui-input="sm"
                        aria-label=${t("AI model")}
                        disabled=${sending.value}
                        value=${editAiModel.value}
                        onChange=${(e: Event) => {
                          const next = (e.target as HTMLSelectElement).value;
                          if (isEditAiModelKey(next)) setEditAiModel(next as EditAiModelKey);
                        }}
                      >
                        ${EDIT_AI_MODELS.map(
                          (m) => html`
                            <option value=${m.key} selected=${m.key === editAiModel.value}>
                              ${m.label}
                            </option>`,
                        )}
                      </select>
                    </label>
                    <button
                      type="submit"
                      ui-button="primary square sm"
                      ui-icon="arrow-up"
                      disabled=${!draft.value.trim() || sending.value}
                      aria-label=${t("Apply It")}
                      aria-busy=${sending.value}
                    ></button>
                  </div>
                </div>
              </form>
            </div>`}
      </div>
    </div>
  `;

  const style = css`
    @scope ([data-scope="CreateOverlay"]) to ([data-scope]) {
      &.overlay {
        position: fixed;
        inset: 0;
        z-index: 220;
        pointer-events: none;
      }

      &.overlay.open {
        pointer-events: auto;
      }

      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.28);
        opacity: 0;
        transition: opacity 0.34s ease;
      }

      &.open .scrim {
        opacity: 1;
      }

      .panel {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--neutral-50);
        color: var(--neutral-900);
        transform: translate3d(100%, 0, 0);
        transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform;
        backface-visibility: hidden;
      }

      .panel.in {
        transform: translate3d(0, 0, 0);
      }

      .state {
        flex: 1;
        padding: 2rem;
        text-align: center;
        color: var(--neutral-600);
      }

      .topbar {
        flex: none;
        min-height: 3.25rem;
        background: color-mix(in oklab, var(--white) 88%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--neutral-200);
      }

      .topbar-title { min-width: 0; flex: 1; }

      .topbar-spacer {
        width: 2rem;
        height: 2rem;
      }

      .app-chip-title {
        min-width: 0;
        font-weight: 650;
        font-size: 0.9375rem;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge {
        flex: none;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        background: var(--neutral-100);
        border: 1px solid var(--neutral-200);
        color: var(--neutral-600);
        font-size: 0.625rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .error-banner {
        flex: none;
        padding: 0.625rem 0.875rem;
        border-radius: 0.625rem;
        background: oklch(from var(--danger, #ff3b30) l c h / 10%);
        color: var(--danger, #c00);
        font-size: 0.8125rem;
        line-height: 1.4;
      }

      .chat {
        flex: 1;
        min-height: 0;
        background: var(--neutral-50);
      }

      .messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .messages-inner {
        width: min(100%, 42rem);
        margin: 0 auto;
        padding: 1.25rem 1rem 1rem;
        min-height: 100%;
      }

      .msg {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        max-width: min(100%, 34rem);
      }

      .msg.assistant { align-self: flex-start; align-items: flex-start; }

      .bubble {
        padding: 0.7rem 0.95rem;
        border-radius: 1.1rem;
        font-size: 0.9375rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--white);
        color: var(--neutral-800);
        border: 1px solid var(--neutral-200);
        border-bottom-left-radius: 0.3rem;
      }

      .composer {
        flex: none;
        width: min(100%, 42rem);
        margin: 0 auto;
      }

      .composer-shell {
        border-radius: 1rem;
        background: var(--white);
        border: 1px solid var(--neutral-200);
      }

      .composer-shell:focus-within {
        border-color: color-mix(in oklab, var(--primary-400) 55%, var(--neutral-300));
      }

      .composer-input {
        width: 100%;
        resize: none;
        border: none;
        background: transparent;
        padding: 0.2rem 0.15rem;
        font: inherit;
        font-size: 16px;
        line-height: 1.45;
        max-height: 10rem;
        field-sizing: content;
        min-height: 1.45em;
      }

      .composer-input:focus { outline: none; }
      .composer-input:disabled { opacity: 0.65; }

      .model-picker {
        flex: 1 1 auto;
        min-width: 0;
        max-width: calc(100% - 2.75rem);
      }

      .model-picker select {
        width: 100%;
        max-width: 100%;
        font-size: 0.75rem;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    }
  `;

  return [view, style];
}
