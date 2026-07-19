import { html, css } from "/utils/markup";
import { h } from "preact";
import type { RoutePropsForPath } from "preact-iso";
import { useLocation, useRoute } from "preact-iso";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
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
  editError,
  editMode,
  editAiModel,
  setEditAiModel,
  editRegeneratingIcon,
  codeDraft,
  loadEdit,
  sendChatMessage,
  saveCode,
  regenerateIcon,
} from "/app/stores/appEditStore";
import {
  EDIT_AI_MODELS,
  formatAiCostUsd,
  formatAiRequestStats,
  type EditAiModelKey,
} from "/utils/ai-models";

export const AppEditPath = "/:lang/app/:slug/edit" as const;

export default function AppEdit(_props: RoutePropsForPath<typeof AppEditPath>) {
  const { params } = useRoute();
  const { route } = useLocation();
  const lang = params.lang ?? "en";
  const slug = params.slug ?? "";
  const deleting = useSignal(false);

  useEffect(() => {
    if (slug) void loadEdit(slug);
  }, [slug]);

  const app = editApp.value;
  const loading = editLoading.value;
  const creating = app != null && isDraftConfig(app.config);
  const regeneratingIcon = editRegeneratingIcon.value;
  const iconSrc = appIconSrc(app?.iconId);

  async function handleDelete() {
    if (!app || deleting.value) return;
    const ok = window.confirm(t("Delete \"$title\"? This cannot be undone.", { title: app.title }));
    if (!ok) return;
    deleting.value = true;
    const success = await deleteApp(slug);
    deleting.value = false;
    if (success) route(`/${lang}/`, true);
  }

  const view = html`
    <div data-scope="AppEdit" ui-column>
      <header class="topbar" ui-row="x-between y-center gap-md" ui-padding="inline-md block-sm">
        <div class="topbar-title" ui-row="y-center gap-sm">
          <a
            href=${`/${lang}/`}
            ui-button="tertiary square sm"
            ui-icon="arrow-left"
            aria-label=${t("Back")}
          ></a>
          ${app
            ? html`
              ${iconSrc
                ? html`<img class="app-chip-icon" src=${iconSrc} alt="" width="28" height="28" />`
                : html`
                  <span
                    class="app-chip-fallback"
                    style=${`background: ${previewGradient(slug)}`}
                    aria-hidden="true"
                  >${draftLetter(app.title)}</span>`}
              <span class="app-chip-title">${app.title}</span>
              ${creating ? html`<span class="badge">${t("Building")}</span>` : ""}`
            : html`<span class="app-chip-title muted">${t("Editor")}</span>`}
        </div>

        <div ui-row="y-center gap-xs">
          ${app?.canEdit && !creating
            ? html`
              <button
                type="button"
                ui-button="tertiary square sm"
                ui-icon="image"
                title=${t("Generate new icon")}
                aria-label=${t("Generate new icon")}
                disabled=${regeneratingIcon}
                aria-busy=${regeneratingIcon}
                onClick=${() => void regenerateIcon(slug)}
              ></button>`
            : ""}
          ${app?.canEdit
            ? html`
              <button
                type="button"
                ui-button="tertiary square sm"
                ui-icon="trash"
                aria-label=${t("Delete")}
                disabled=${deleting.value}
                aria-busy=${deleting.value}
                onClick=${() => void handleDelete()}
              ></button>`
            : ""}
          ${app && !creating
            ? html`
              <a ui-button="sm" href=${appPageUrl(lang, slug)} target="_blank" rel="noopener">
                ${t("Open app")}
              </a>`
            : app
              ? html`<button type="button" ui-button="sm" disabled>${t("Open app")}</button>`
              : ""}
        </div>
      </header>

      ${loading && !app
        ? html`
          <div class="state" ui-column="gap-md x-center y-center" ui-padding="xl">
            <i ui-icon="spinner lg"></i>
            <p>${t("Loading…")}</p>
          </div>`
        : !app
          ? html`
            <div class="state" ui-column="gap-md x-center y-center" ui-padding="xl">
              <p>${editError.value ?? t("App not found")}</p>
            </div>`
          : !app.canEdit
            ? html`
              <div class="state" ui-column="gap-md x-center y-center" ui-padding="xl">
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
        ? html`<div class="error-banner" role="alert" ui-margin="inline-md top-sm">${editError.value}</div>`
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
    <div class="tabs-wrap" ui-row="x-center" ui-padding="top-sm inline-md">
      <div ui-group role="tablist" aria-label=${t("Editor")}>
        <button
          type="button"
          role="tab"
          aria-selected=${mode === "chat"}
          ui-button=${mode === "chat" ? "primary sm" : "sm"}
          onClick=${() => (editMode.value = "chat")}
        >
          ${t("Chat")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected=${mode === "code"}
          ui-button=${mode === "code" ? "primary sm" : "sm"}
          onClick=${() => (editMode.value = "code")}
        >
          ${t("Code")}
        </button>
      </div>
    </div>
  `;
}

function ChatPanel({ slug, creating }: { slug: string; creating: boolean }) {
  // useSignal (not useState) so store signal updates still re-render this panel.
  const draft = useSignal("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const app = editApp.value;
  const originalPrompt = app?.config.prompt?.trim() ?? "";
  const messages = editMessages.value;
  const sending = editSending.value;
  const canSend = Boolean(draft.value.trim()) && !sending;
  const totalCostUsd = messages.reduce(
    (sum, m) =>
      sum +
      (typeof m.costUsd === "number" ? m.costUsd : 0) +
      (typeof m.iconCostUsd === "number" ? m.iconCostUsd : 0),
    0,
  );

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
    // Read from the DOM so a stale controlled value can't block the request.
    const text = (inputRef.current?.value ?? draft.value).trim();
    if (!text || editSending.value) return;
    draft.value = "";
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
    }
    void sendChatMessage(slug, text).then((started) => {
      if (!started && text) {
        draft.value = text;
        if (inputRef.current) inputRef.current.value = text;
      }
    });
  }

  return html`
    <div class="chat" ui-column>
      <div class="messages" ref=${listRef}>
        <div class="messages-inner" ui-column="gap-md">
          ${displayMessages.length === 0 && !sending
            ? html`
              <div class="chat-empty" ui-column="gap-sm x-center">
                <p ui-heading="sm">${creating ? t("Describe your app") : t("Describe a change")}</p>
                <p class="chat-empty-copy">
                  ${creating
                    ? t("Tell Abblet what you need — it builds a working app in minutes.")
                    : t("Ask the AI to tweak your app — colors, features, wording, anything.")}
                </p>
              </div>`
            : displayMessages.map(
                (m, i) => {
                  const textStats =
                    m.role === "assistant"
                      ? formatAiRequestStats({
                          modelKey: m.modelKey,
                          durationMs: m.durationMs,
                          costUsd: m.costUsd,
                        })
                      : null;
                  const iconStats =
                    m.role === "assistant"
                      ? formatAiRequestStats({
                          modelKey: m.iconModelKey,
                          durationMs: m.iconDurationMs,
                          costUsd: m.iconCostUsd,
                        })
                      : null;
                  return html`
                  <div
                    class=${`msg ${m.role === "user" ? "user" : "assistant"}`}
                    style=${`--i: ${i}`}
                  >
                    ${m.id === "original-prompt"
                      ? html`<p class="msg-label">${t("Original prompt")}</p>`
                      : ""}
                    <div class="bubble">${m.content}</div>
                    ${textStats
                      ? html`<p class="msg-stats">${textStats}</p>`
                      : ""}
                    ${iconStats
                      ? html`<p class="msg-stats">${t("Icon")} · ${iconStats}</p>`
                      : ""}
                  </div>`;
                },
              )}
          ${sending
            ? html`
              <div class="msg assistant">
                <div class="bubble typing" aria-live="polite" ui-row="y-center gap-sm">
                  <span>
                    ${creating ? t("AI is building your app.") : t("AI is updating your app…")}
                  </span>
                  <i ui-icon="spinner sm" aria-hidden="true"></i>
                </div>
              </div>`
            : ""}
        </div>
      </div>

      <form class="composer" ui-column="gap-xs" ui-padding="inline-md bottom-md top-sm" onSubmit=${submit}>
        <div class="composer-shell" ui-column="gap-sm" ui-padding="sm">
          <textarea
            ref=${inputRef}
            class="composer-input"
            rows="1"
            placeholder=${creating ? t("Create an app for…") : t("e.g. add a dark mode toggle")}
            value=${draft.value}
            disabled=${sending}
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
                disabled=${sending}
                value=${editAiModel.value}
                onChange=${(e: Event) => {
                  const next = (e.target as HTMLSelectElement).value;
                  if (next) setEditAiModel(next as EditAiModelKey);
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
              disabled=${!canSend}
              aria-label=${creating ? t("Apply It") : t("Send")}
            ></button>
          </div>
        </div>
        ${totalCostUsd > 0
          ? html`
            <p class="composer-hint">
              <span class="composer-cost" title=${t("Total AI cost")}>${t("Total")} ${formatAiCostUsd(totalCostUsd)}</span>
            </p>`
          : ""}
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
      <div class="code-bar" ui-row="x-between y-center gap-md" ui-padding="inline-md block-sm">
        <div ui-row="y-center gap-sm">
          <span class="code-label">${t("Code")}</span>
          ${dirty
            ? html`<span class="code-dirty">${t("Unsaved changes")}</span>`
            : html`<span class="code-clean">${t("Saved")}</span>`}
        </div>
        <div ui-row="gap-xs">
          <button
            type="button"
            ui-button="tertiary sm"
            disabled=${!dirty || saving}
            onClick=${() => app && (codeDraft.value = app.config.code)}
          >
            ${t("Revert")}
          </button>
          <button
            type="button"
            ui-button="primary sm"
            disabled=${!dirty || saving}
            aria-busy=${saving}
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

      .topbar {
        flex: none;
        min-height: 3.25rem;
        background: color-mix(in oklab, var(--white) 88%, transparent);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--neutral-200);
        z-index: 2;
      }

      .topbar-title {
        min-width: 0;
        flex: 1;
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
        font-weight: 650;
        font-size: 0.9375rem;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-chip-title.muted {
        color: var(--neutral-500);
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

      .state {
        flex: 1;
        color: var(--neutral-600);
        text-align: center;
      }

      .workspace {
        flex: 1;
        min-height: 0;
        background: var(--white);
      }

      .tabs-wrap {
        flex: none;
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

      .chat-empty {
        margin: auto;
        text-align: center;
        max-width: 22rem;
        padding: 2rem 1rem;
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

      .msg-stats {
        margin: 0.35rem 0 0;
        padding: 0 0.15rem;
        font-size: 0.6875rem;
        line-height: 1.3;
        color: var(--neutral-400);
        font-variant-numeric: tabular-nums;
      }

      .msg.assistant .msg-stats {
        text-align: left;
      }

      .msg.assistant .bubble {
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

      .composer-input:focus {
        outline: none;
      }

      .composer-input:disabled {
        opacity: 0.65;
      }

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

      .composer-hint {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        font-size: 0.6875rem;
        color: var(--neutral-400);
      }

      .composer-cost {
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.01em;
        opacity: 0.85;
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

      .code {
        flex: 1;
        min-height: 0;
        background: #141414;
      }

      .code-bar {
        flex: none;
        background: var(--white);
        border-bottom: 1px solid var(--neutral-200);
      }

      .code-label {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--neutral-500);
      }

      .code-dirty,
      .code-clean {
        font-size: 0.75rem;
        font-weight: 500;
      }

      .code-dirty { color: var(--warning, #b45309); }
      .code-clean { color: var(--neutral-400); }

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
    }
  `;
}
