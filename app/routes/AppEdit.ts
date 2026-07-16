import { html, css } from "/utils/markup";
import { h } from "preact";
import type { RoutePropsForPath } from "preact-iso";
import { useLocation, useRoute } from "preact-iso";
import { useEffect, useRef, useState } from "preact/hooks";
import type { AppEditMessage } from "/types/app-config-types";
import { isDraftConfig } from "/types/app-config-types";
import { t } from "/utils/i18n";
import { highlightJavaScript } from "/utils/highlight-js";
import { appPageUrl } from "/utils/app-url";
import { appIconSrc } from "/utils/app-icon";
import { draftLetter, previewGradient } from "/utils/app-preview";
import { deleteApp } from "/app/stores/appStore";
import {
  editApp,
  editMessages,
  editLoading,
  editSending,
  editSavingCode,
  editPublishing,
  editError,
  editMode,
  editAiModel,
  codeDraft,
  loadEdit,
  sendChatMessage,
  saveCode,
  publishToMyApps,
} from "/app/stores/appEditStore";
import {
  EDIT_AI_MODEL_FLASH,
  EDIT_AI_MODEL_PRO,
  type EditAiModelKey,
} from "/utils/ai-models";

export const AppEditPath = "/:lang/app/:slug/edit" as const;

export default function AppEdit(_props: RoutePropsForPath<typeof AppEditPath>) {
  const { params } = useRoute();
  const { route } = useLocation();
  const lang = params.lang ?? "en";
  const slug = params.slug ?? "";
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (slug) void loadEdit(slug);
  }, [slug]);

  const app = editApp.value;
  const loading = editLoading.value;
  const creating = app != null && isDraftConfig(app.config);
  const canAddToHome = app != null && app.canEdit && !creating && app.isDraft;
  const publishing = editPublishing.value;
  const iconSrc = appIconSrc(app?.iconId);

  async function handleDelete() {
    if (!app || deleting) return;
    const ok = window.confirm(t("Delete \"$title\"? This cannot be undone.", { title: app.title }));
    if (!ok) return;
    setDeleting(true);
    const success = await deleteApp(slug);
    setDeleting(false);
    if (success) route(`/${lang}/`, true);
  }

  const view = html`
    <div data-scope="AppEdit" ui-column>
      <header class="topbar">
        <div class="topbar-title">
          ${app
            ? html`
              <div class="app-chip" title=${app.title}>
                ${iconSrc
                  ? html`<img class="app-chip-icon" src=${iconSrc} alt="" width="28" height="28" />`
                  : html`
                    <span
                      class="app-chip-fallback"
                      style=${`background: ${previewGradient(slug)}`}
                      aria-hidden="true"
                    >${draftLetter(app.title)}</span>`}
                <span class="app-chip-title">${app.title}</span>
                ${creating || app.isDraft
                  ? html`<span class="badge">${creating ? t("Building") : t("Draft")}</span>`
                  : ""}
              </div>`
            : html`<div class="app-chip"><span class="app-chip-title muted">${t("Editor")}</span></div>`}
        </div>

        <div class="topbar-actions">
          ${app?.canEdit
            ? html`
              <button
                type="button"
                class="icon-btn danger"
                aria-label=${t("Delete")}
                disabled=${deleting}
                onClick=${() => void handleDelete()}
              >
                <i ui-icon="trash sm" aria-hidden="true"></i>
              </button>`
            : ""}
          ${app && !creating
            ? html`
              <a class="open-btn" href=${appPageUrl(lang, slug)} target="_blank" rel="noopener">
                ${t("Open app")}
              </a>`
            : app
              ? html`<span class="open-btn disabled">${t("Open app")}</span>`
              : ""}
        </div>
      </header>

      ${canAddToHome
        ? html`
          <div class="draft-banner">
            <p>${t("This app is still a draft. Add it to My Apps when you're ready.")}</p>
            <button
              type="button"
              class="draft-cta"
              disabled=${publishing}
              onClick=${() => void publishToMyApps(slug)}
            >
              ${publishing ? t("Adding…") : t("Add to My Apps")}
            </button>
          </div>`
        : ""}

      ${loading && !app
        ? html`
          <div class="state" ui-column="gap-md x-center y-center">
            <i ui-icon="spinner lg"></i>
            <p>${t("Loading…")}</p>
          </div>`
        : !app
          ? html`
            <div class="state" ui-column="gap-md x-center y-center">
              <p>${editError.value ?? t("App not found")}</p>
            </div>`
          : !app.canEdit
            ? html`
              <div class="state" ui-column="gap-md x-center y-center">
                <p ui-heading="sm">${t("You can only edit your own apps.")}</p>
                <a href=${appPageUrl(lang, slug)} ui-button="primary">${t("Open app")}</a>
              </div>`
            : html`<${EditWorkspace} slug=${slug} creating=${creating} />`}
    </div>
  `;

  return [view, style()];
}

function EditWorkspace({ slug, creating }: { slug: string; creating: boolean }) {
  return html`
    <div class="workspace" ui-column>
      ${creating ? "" : html`<${ModeTabs} />`}
      ${editError.value
        ? html`<div class="error-banner" role="alert">${editError.value}</div>`
        : ""}
      ${creating || editMode.value === "chat"
        ? html`<${ChatPanel} slug=${slug} creating=${creating} />`
        : html`<${CodePanel} slug=${slug} />`}
    </div>
  `;
}

function ModeTabs() {
  const mode = editMode.value;
  return html`
    <div class="tabs-wrap">
      <div class="tabs" role="tablist" aria-label=${t("Editor")}>
        <button
          type="button"
          role="tab"
          aria-selected=${mode === "chat"}
          class=${mode === "chat" ? "tab active" : "tab"}
          onClick=${() => (editMode.value = "chat")}
        >
          ${t("Chat")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected=${mode === "code"}
          class=${mode === "code" ? "tab active" : "tab"}
          onClick=${() => (editMode.value = "code")}
        >
          ${t("Code")}
        </button>
      </div>
    </div>
  `;
}

function ChatPanel({ slug, creating }: { slug: string; creating: boolean }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const app = editApp.value;
  const originalPrompt = app?.config.prompt?.trim() ?? "";
  const messages = editMessages.value;
  const sending = editSending.value;
  const canSend = Boolean(draft.trim()) && !sending;

  const displayMessages: AppEditMessage[] =
    messages.length > 0
      ? messages
      : originalPrompt
        ? [
            {
              id: "original-prompt",
              role: "user",
              content: originalPrompt,
              createdAt: "",
            },
          ]
        : [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayMessages.length, sending]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit(e: Event) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    });
    void sendChatMessage(slug, text);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  return html`
    <div class="chat" ui-column>
      <div class="messages" ref=${listRef}>
        <div class="messages-inner">
          ${displayMessages.length === 0 && !sending
            ? html`
              <div class="chat-empty">
                <div class="chat-empty-mark" aria-hidden="true"></div>
                <p class="chat-empty-title">${creating ? t("Describe your app") : t("Describe a change")}</p>
                <p class="chat-empty-copy">
                  ${creating
                    ? t("Tell Applet what you need — it builds a working app in minutes.")
                    : t("Ask the AI to tweak your app — colors, features, wording, anything.")}
                </p>
              </div>`
            : displayMessages.map(
                (m, i) => html`
                  <div
                    class=${`msg ${m.role === "user" ? "user" : "assistant"}`}
                    style=${`--i: ${i}`}
                  >
                    ${m.id === "original-prompt"
                      ? html`<p class="msg-label">${t("Original prompt")}</p>`
                      : ""}
                    <div class="bubble">${m.content}</div>
                  </div>`,
              )}
          ${sending
            ? html`
              <div class="msg assistant">
                <div class="bubble typing" aria-live="polite">
                  <span class="typing-label">
                    ${creating ? t("AI is building your app.") : t("AI is updating your app…")}
                  </span>
                  <span class="typing-dots" aria-hidden="true">
                    <i></i><i></i><i></i>
                  </span>
                </div>
              </div>`
            : ""}
        </div>
      </div>

      <form class="composer" onSubmit=${submit}>
        <div class=${canSend || draft ? "composer-shell focused" : "composer-shell"}>
          <textarea
            ref=${inputRef}
            class="composer-input"
            rows="1"
            placeholder=${creating ? t("Create an app for…") : t("e.g. add a dark mode toggle")}
            value=${draft}
            disabled=${sending}
            onInput=${(e: Event) => {
              setDraft((e.target as HTMLTextAreaElement).value);
              resizeInput();
            }}
            onKeyDown=${onKeyDown}
          ></textarea>
          <div class="composer-toolbar">
            <label class="model-picker">
              <span class="sr-only">${t("AI model")}</span>
              <select
                class="model-select"
                aria-label=${t("AI model")}
                disabled=${sending}
                value=${editAiModel.value}
                onChange=${(e: Event) => {
                  editAiModel.value = (e.target as HTMLSelectElement).value as EditAiModelKey;
                }}
              >
                <option value=${EDIT_AI_MODEL_FLASH}>${t("Flash")}</option>
                <option value=${EDIT_AI_MODEL_PRO}>${t("Pro")}</option>
              </select>
            </label>
            <button
              type="submit"
              class=${canSend ? "send-btn ready" : "send-btn"}
              disabled=${!canSend}
              aria-label=${creating ? t("Apply It") : t("Send")}
            >
              <i ui-icon="arrow-up sm" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <p class="composer-hint">${t("Enter to send · Shift+Enter for a new line")}</p>
      </form>
    </div>
  `;
}

function CodePanel({ slug }: { slug: string }) {
  const saving = editSavingCode.value;
  const app = editApp.value;
  const dirty = app != null && codeDraft.value !== app.config.code;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  function syncScroll() {
    const editor = editorRef.current;
    const highlight = highlightRef.current;
    if (!editor || !highlight) return;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  }

  const highlighted = highlightJavaScript(codeDraft.value);

  return html`
    <div class="code" ui-column>
      <div class="code-bar">
        <div class="code-meta">
          <span class="code-label">${t("Code")}</span>
          ${dirty
            ? html`<span class="code-dirty">${t("Unsaved changes")}</span>`
            : html`<span class="code-clean">${t("Saved")}</span>`}
        </div>
        <div class="code-actions">
          <button
            type="button"
            class="code-btn ghost"
            disabled=${!dirty || saving}
            onClick=${() => app && (codeDraft.value = app.config.code)}
          >
            ${t("Revert")}
          </button>
          <button
            type="button"
            class=${dirty ? "code-btn primary" : "code-btn primary muted"}
            disabled=${!dirty || saving}
            onClick=${() => void saveCode(slug)}
          >
            ${saving ? t("Saving…") : t("Save")}
          </button>
        </div>
      </div>
      <div class="code-editor">
        <pre class="code-highlight" ref=${highlightRef} aria-hidden="true">
          ${h("code", { dangerouslySetInnerHTML: { __html: `${highlighted}\n` } })}
        </pre>
        <textarea
          ref=${editorRef}
          class="code-area"
          spellcheck="false"
          autocapitalize="off"
          autocorrect="off"
          value=${codeDraft.value}
          onInput=${(e: Event) => (codeDraft.value = (e.target as HTMLTextAreaElement).value)}
          onScroll=${syncScroll}
        ></textarea>
      </div>
    </div>
  `;
}

function style() {
  return css`
    @scope ([data-scope="AppEdit"]) to ([data-scope]) {
      & {
        flex: 1;
        min-height: 0;
        background: var(--neutral-50);
        color: var(--neutral-900);
      }

      /* —— Top bar —— */
      .topbar {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-height: 3.25rem;
        padding: 0.5rem 0.875rem;
        background: color-mix(in oklab, var(--white) 88%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--neutral-200);
        z-index: 2;
      }

      .topbar-title {
        min-width: 0;
        flex: 1;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        flex: none;
      }

      .app-chip {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
      }

      .app-chip-icon,
      .app-chip-fallback {
        flex: none;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 0.45rem;
        object-fit: cover;
      }

      .app-chip-fallback {
        display: grid;
        place-items: center;
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .app-chip-title {
        min-width: 0;
        font-family: "Noto Serif", serif;
        font-weight: 700;
        font-size: 0.9375rem;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-chip-title.muted {
        color: var(--neutral-500);
        font-weight: 600;
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

      .icon-btn {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border: none;
        border-radius: 0.625rem;
        background: transparent;
        color: var(--neutral-500);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .icon-btn:hover:not(:disabled) {
        background: var(--neutral-100);
        color: var(--neutral-800);
      }

      .icon-btn.danger:hover:not(:disabled) {
        background: oklch(from var(--danger, #ff3b30) l c h / 10%);
        color: var(--danger, #c00);
      }

      .icon-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .open-btn {
        display: inline-flex;
        align-items: center;
        min-height: 2.25rem;
        padding: 0.35rem 0.75rem;
        border-radius: 0.625rem;
        background: var(--neutral-900);
        color: var(--white);
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .open-btn:hover {
        background: var(--neutral-800);
      }

      .open-btn:active {
        transform: scale(0.98);
      }

      .open-btn.disabled {
        background: var(--neutral-200);
        color: var(--neutral-500);
        pointer-events: none;
      }

      /* —— Draft banner —— */
      .draft-banner {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: linear-gradient(
          90deg,
          color-mix(in oklab, var(--primary-50) 90%, white),
          var(--white)
        );
        border-bottom: 1px solid var(--primary-100);
      }

      .draft-banner p {
        margin: 0;
        flex: 1;
        min-width: 12rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
        line-height: 1.4;
      }

      .draft-cta {
        flex: none;
        border: none;
        border-radius: 0.625rem;
        padding: 0.45rem 0.85rem;
        background: var(--primary-600);
        color: white;
        font: inherit;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
      }

      .draft-cta:hover:not(:disabled) {
        background: var(--primary-700);
      }

      .draft-cta:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .state {
        flex: 1;
        color: var(--neutral-600);
        text-align: center;
        padding: 2rem;
      }

      .workspace {
        flex: 1;
        min-height: 0;
        background: var(--white);
      }

      /* —— Mode tabs —— */
      .tabs-wrap {
        flex: none;
        display: flex;
        justify-content: center;
        padding: 0.625rem 1rem 0;
        background: var(--white);
      }

      .tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.2rem;
        width: min(100%, 16rem);
        padding: 0.2rem;
        border-radius: 0.75rem;
        background: var(--neutral-100);
        border: 1px solid var(--neutral-200);
      }

      .tab {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0.45rem 0.75rem;
        border-radius: 0.575rem;
        font: inherit;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--neutral-500);
        transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      }

      .tab:hover:not(.active) {
        color: var(--neutral-700);
      }

      .tab.active {
        background: var(--white);
        color: var(--neutral-950);
        box-shadow: 0 1px 2px oklch(from var(--neutral-900) l c h / 8%);
      }

      .error-banner {
        flex: none;
        margin: 0.625rem 1rem 0;
        padding: 0.625rem 0.875rem;
        border-radius: 0.625rem;
        background: oklch(from var(--danger, #ff3b30) l c h / 10%);
        color: var(--danger, #c00);
        font-size: 0.8125rem;
        line-height: 1.4;
      }

      /* —— Chat —— */
      .chat {
        flex: 1;
        min-height: 0;
        background:
          radial-gradient(120% 80% at 50% -20%, color-mix(in oklab, var(--primary-100) 55%, transparent), transparent 55%),
          var(--neutral-50);
      }

      .messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .messages-inner {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: min(100%, 42rem);
        margin: 0 auto;
        padding: 1.25rem 1rem 1rem;
        min-height: 100%;
      }

      .chat-empty {
        margin: auto;
        text-align: center;
        max-width: 22rem;
        padding: 2rem 1rem;
        animation: fade-up 0.35s ease both;
      }

      .chat-empty-mark {
        width: 2.75rem;
        height: 2.75rem;
        margin: 0 auto 1rem;
        border-radius: 0.85rem;
        background:
          linear-gradient(145deg, var(--primary-400), var(--primary-700));
        box-shadow: 0 8px 20px oklch(from var(--primary-700) l c h / 22%);
        position: relative;
      }

      .chat-empty-mark::after {
        content: "";
        position: absolute;
        inset: 0.55rem;
        border-radius: 0.4rem;
        background: color-mix(in oklab, white 22%, transparent);
        border: 1px solid color-mix(in oklab, white 35%, transparent);
      }

      .chat-empty-title {
        margin: 0 0 0.35rem;
        font-family: "Noto Serif", serif;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-900);
        letter-spacing: -0.02em;
      }

      .chat-empty-copy {
        margin: 0;
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--neutral-500);
      }

      .msg {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        max-width: min(100%, 34rem);
        animation: fade-up 0.28s ease both;
        animation-delay: calc(min(var(--i, 0), 8) * 20ms);
      }

      .msg.user { align-self: flex-end; align-items: flex-end; }
      .msg.assistant { align-self: flex-start; align-items: flex-start; }

      .msg-label {
        margin: 0;
        font-size: 0.6875rem;
        font-weight: 650;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--neutral-500);
      }

      .bubble {
        padding: 0.7rem 0.95rem;
        border-radius: 1.1rem;
        font-size: 0.9375rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .msg.user .bubble {
        background: var(--neutral-900);
        color: var(--white);
        border-bottom-right-radius: 0.3rem;
      }

      .msg.assistant .bubble {
        background: var(--white);
        color: var(--neutral-800);
        border: 1px solid var(--neutral-200);
        border-bottom-left-radius: 0.3rem;
        box-shadow: 0 1px 2px oklch(from var(--neutral-900) l c h / 4%);
      }

      .bubble.typing {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        color: var(--neutral-500);
        font-style: normal;
      }

      .typing-label {
        font-size: 0.875rem;
      }

      .typing-dots {
        display: inline-flex;
        gap: 0.22rem;
        align-items: center;
      }

      .typing-dots i {
        width: 0.35rem;
        height: 0.35rem;
        border-radius: 999px;
        background: var(--neutral-400);
        animation: typing-bounce 1s ease-in-out infinite;
      }

      .typing-dots i:nth-child(2) { animation-delay: 0.12s; }
      .typing-dots i:nth-child(3) { animation-delay: 0.24s; }

      /* —— Composer —— */
      .composer {
        flex: none;
        width: min(100%, 42rem);
        margin: 0 auto;
        padding: 0.5rem 1rem 0.75rem;
        background: linear-gradient(180deg, transparent, var(--neutral-50) 28%);
      }

      .composer-shell {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.65rem 0.7rem 0.55rem;
        border-radius: 1.1rem;
        background: var(--white);
        border: 1px solid var(--neutral-250, var(--neutral-200));
        box-shadow:
          0 1px 2px oklch(from var(--neutral-900) l c h / 4%),
          0 8px 24px oklch(from var(--neutral-900) l c h / 4%);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .composer-shell:focus-within,
      .composer-shell.focused {
        border-color: color-mix(in oklab, var(--primary-400) 55%, var(--neutral-300));
        box-shadow:
          0 0 0 3px oklch(from var(--primary-500) l c h / 12%),
          0 8px 24px oklch(from var(--neutral-900) l c h / 5%);
      }

      .composer-input {
        width: 100%;
        resize: none;
        border: none;
        background: transparent;
        padding: 0.2rem 0.35rem;
        font: inherit;
        font-size: 16px;
        line-height: 1.45;
        max-height: 10rem;
        field-sizing: content;
        min-height: 1.45em;
      }

      .composer-input:focus {
        outline: none;
      }

      .composer-input:disabled {
        opacity: 0.65;
      }

      .composer-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding-top: 0.15rem;
      }

      .model-picker {
        display: block;
      }

      .model-select {
        appearance: none;
        border: 1px solid var(--neutral-200);
        border-radius: 999px;
        padding: 0.3rem 1.6rem 0.3rem 0.65rem;
        font: inherit;
        font-size: 0.75rem;
        font-weight: 650;
        color: var(--neutral-600);
        background:
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M3 4.5L6 8l3-3.5'/%3E%3C/svg%3E")
            no-repeat right 0.45rem center / 0.7rem,
          var(--neutral-50);
        cursor: pointer;
        transition: border-color 0.15s ease, color 0.15s ease;
      }

      .model-select:hover:not(:disabled) {
        border-color: var(--neutral-300);
        color: var(--neutral-800);
      }

      .model-select:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .model-select:focus {
        outline: none;
        border-color: var(--primary-400);
      }

      .send-btn {
        display: grid;
        place-items: center;
        width: 2.15rem;
        height: 2.15rem;
        border: none;
        border-radius: 999px;
        background: var(--neutral-200);
        color: var(--neutral-500);
        cursor: not-allowed;
        transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
      }

      .send-btn.ready {
        background: var(--neutral-900);
        color: white;
        cursor: pointer;
      }

      .send-btn.ready:hover {
        background: var(--neutral-800);
      }

      .send-btn.ready:active {
        transform: scale(0.96);
      }

      .composer-hint {
        margin: 0.4rem 0 0;
        text-align: center;
        font-size: 0.6875rem;
        color: var(--neutral-400);
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

      /* —— Code —— */
      .code {
        flex: 1;
        min-height: 0;
        background: #141414;
      }

      .code-bar {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.55rem 0.85rem;
        background: #1a1a1a;
        border-bottom: 1px solid #2a2a2a;
      }

      .code-meta {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
      }

      .code-label {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #a3a3a3;
      }

      .code-dirty,
      .code-clean {
        font-size: 0.75rem;
        font-weight: 500;
      }

      .code-dirty { color: #f0c674; }
      .code-clean { color: #6a6a6a; }

      .code-actions {
        display: flex;
        gap: 0.4rem;
      }

      .code-btn {
        border: none;
        border-radius: 0.5rem;
        padding: 0.35rem 0.7rem;
        font: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s ease, background 0.15s ease;
      }

      .code-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .code-btn.ghost {
        background: transparent;
        color: #b0b0b0;
      }

      .code-btn.ghost:hover:not(:disabled) {
        background: #262626;
        color: #eee;
      }

      .code-btn.primary {
        background: #f5f5f5;
        color: #111;
      }

      .code-btn.primary.muted {
        background: #333;
        color: #888;
      }

      .code-btn.primary:hover:not(:disabled) {
        background: white;
      }

      .code-editor {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .code-highlight,
      .code-area {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 1rem 1.1rem;
        font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
        font-size: 14px;
        line-height: 1.65;
        tab-size: 2;
        white-space: pre;
        overflow: auto;
        border: none;
      }

      .code-highlight {
        pointer-events: none;
        color: #d4d4d4;
        background: #141414;
      }

      .code-highlight > code {
        display: block;
        font: inherit;
        white-space: pre;
      }

      .code-area {
        resize: none;
        color: transparent;
        caret-color: #e8e8e8;
        background: transparent;
      }

      .code-area::selection {
        background: oklch(from var(--primary-400) l c h / 35%);
        color: transparent;
      }

      .code-area:focus {
        outline: none;
      }

      .code-highlight .hl-keyword { color: #c586c0; }
      .code-highlight .hl-string { color: #ce9178; }
      .code-highlight .hl-comment { color: #6a9955; font-style: italic; }
      .code-highlight .hl-number { color: #b5cea8; }
      .code-highlight .hl-function { color: #dcdcaa; }
      .code-highlight .hl-class { color: #4ec9b0; }
      .code-highlight .hl-builtin { color: #569cd6; }

      @keyframes fade-up {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      @keyframes typing-bounce {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.45;
        }
        30% {
          transform: translateY(-3px);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .msg,
        .chat-empty,
        .typing-dots i {
          animation: none;
        }
      }
    }
  `;
}
