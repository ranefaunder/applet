import { html, css } from "/utils/markup";
import { h } from "preact";
import type { RoutePropsForPath } from "preact-iso";
import { useRoute } from "preact-iso";
import { useEffect, useRef, useState } from "preact/hooks";
import type { AppEditMessage } from "/types/app-config-types";
import { t } from "/utils/i18n";
import { highlightJavaScript } from "/utils/highlight-js";
import { appPageUrl } from "/utils/app-url";
import {
  editApp,
  editMessages,
  editLoading,
  editSending,
  editSavingCode,
  editError,
  editMode,
  codeDraft,
  loadEdit,
  sendChatMessage,
  saveCode,
} from "/app/stores/appEditStore";

export const AppEditPath = "/:lang/app/:slug/edit" as const;

export default function AppEdit(_props: RoutePropsForPath<typeof AppEditPath>) {
  const { params } = useRoute();
  const lang = params.lang ?? "en";
  const slug = params.slug ?? "";

  useEffect(() => {
    if (slug) void loadEdit(slug);
  }, [slug]);

  const app = editApp.value;
  const loading = editLoading.value;

  const view = html`
    <div data-scope="AppEdit">
      <header class="topbar">
        <a class="back" href=${`/${lang}/apps`} aria-label=${t("My apps")}>
          <span aria-hidden="true">‹</span> ${t("My apps")}
        </a>
        <div class="title" title=${app?.title ?? ""}>${app?.title ?? t("Editor")}</div>
        <a class="open" href=${appPageUrl(lang, slug)} target="_blank" rel="noopener">
          ${t("Open app")}
        </a>
      </header>

      ${loading && !app
        ? html`<div class="state"><span class="spinner" aria-hidden="true"></span><p>${t("Loading…")}</p></div>`
        : !app
          ? html`<div class="state"><p>${editError.value ?? t("App not found")}</p></div>`
          : !app.canEdit
            ? html`
              <div class="state">
                <p ui-heading="sm">${t("You can only edit your own apps.")}</p>
                <a href=${appPageUrl(lang, slug)} ui-button="primary">${t("Open app")}</a>
              </div>`
            : html`<${EditWorkspace} slug=${slug} />`}
    </div>
  `;

  return [view, style()];
}

function EditWorkspace({ slug }: { slug: string }) {
  return html`
    <div class="workspace">
      <${ModeTabs} />
      ${editError.value ? html`<div class="error-banner">${editError.value}</div>` : ""}
      ${editMode.value === "chat"
        ? html`<${ChatPanel} slug=${slug} />`
        : html`<${CodePanel} slug=${slug} />`}
    </div>
  `;
}

function ModeTabs() {
  const mode = editMode.value;
  return html`
    <div class="tabs" role="tablist">
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
  `;
}

function ChatPanel({ slug }: { slug: string }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const app = editApp.value;
  const originalPrompt = app?.config.prompt?.trim() ?? "";
  const messages = editMessages.value;
  const sending = editSending.value;

  const displayMessages: AppEditMessage[] = originalPrompt
    ? [
        {
          id: "original-prompt",
          role: "user",
          content: originalPrompt,
          createdAt: "",
        },
        ...messages,
      ]
    : messages;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayMessages.length, sending]);

  function submit(e: Event) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    void sendChatMessage(slug, text);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      submit(e);
    }
  }

  return html`
    <div class="chat">
      <div class="messages" ref=${listRef}>
        ${displayMessages.length === 0 && !sending
          ? html`
            <div class="chat-empty">
              <span class="chat-empty-icon" aria-hidden="true">💬</span>
              <p ui-heading="sm">${t("Describe a change")}</p>
              <p>${t("Ask the AI to tweak your app — colors, features, wording, anything.")}</p>
            </div>`
          : displayMessages.map(
              (m) => html`
                <div class=${m.role === "user" ? "msg user" : "msg assistant"} key=${m.id}>
                  ${m.id === "original-prompt"
                    ? html`<p class="msg-label">${t("Original prompt")}</p>`
                    : ""}
                  <div class="bubble">${m.content}</div>
                </div>`,
            )}
        ${sending
          ? html`<div class="msg assistant"><div class="bubble typing">${t("AI is updating your app…")}</div></div>`
          : ""}
      </div>

      <form class="composer" onSubmit=${submit}>
        <textarea
          class="composer-input"
          rows="2"
          placeholder=${t("e.g. add a dark mode toggle")}
          value=${draft}
          disabled=${sending}
          onInput=${(e: Event) => setDraft((e.target as HTMLTextAreaElement).value)}
          onKeyDown=${onKeyDown}
        ></textarea>
        <button type="submit" ui-button="primary" disabled=${sending || !draft.trim()}>
          ${sending ? t("Sending…") : t("Send")}
        </button>
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
    <div class="code">
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
      <div class="code-actions">
        <button
          type="button"
          ui-button="secondary sm"
          disabled=${!dirty || saving}
          onClick=${() => app && (codeDraft.value = app.config.code)}
        >
          ${t("Revert")}
        </button>
        <button
          type="button"
          ui-button="primary sm"
          disabled=${!dirty || saving}
          onClick=${() => void saveCode(slug)}
        >
          ${saving ? t("Saving…") : t("Save")}
        </button>
      </div>
    </div>
  `;
}

function style() {
  return css`
    @scope ([data-scope="AppEdit"]) to ([data-scope]) {
      & {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--neutral-100);
      }

      .topbar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 1rem;
        height: 3.25rem;
        padding-inline: 1rem;
        background: var(--white);
        border-bottom: 1px solid var(--neutral-200);
      }

      .topbar .back,
      .topbar .open {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--neutral-700);
        text-decoration: none;
        padding: 0.375rem 0.625rem;
        border-radius: 0.5rem;
      }

      .topbar .back:hover,
      .topbar .open:hover {
        background: var(--neutral-100);
      }

      .topbar .title {
        flex: 1;
        min-width: 0;
        text-align: center;
        font-family: "Noto Serif", serif;
        font-weight: 700;
        font-size: 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar .open {
        color: var(--primary-700);
      }

      .state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--neutral-600);
        text-align: center;
        padding: 2rem;
      }

      .spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid var(--neutral-300);
        border-top-color: var(--primary-600);
        border-radius: 50%;
        animation: appedit-spin 0.7s linear infinite;
      }

      @keyframes appedit-spin {
        to { transform: rotate(360deg); }
      }

      .workspace {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--white);
      }

      .tabs {
        flex: none;
        display: flex;
        gap: 0.25rem;
        padding: 0.5rem;
        background: var(--neutral-100);
        border-bottom: 1px solid var(--neutral-200);
      }

      .tab {
        flex: 1;
        border: none;
        background: none;
        cursor: pointer;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-600);
      }

      .tab.active {
        background: var(--white);
        color: var(--neutral-900);
        box-shadow: 0 1px 2px oklch(from var(--neutral-900) l c h / 8%);
      }

      .error-banner {
        flex: none;
        margin: 0.5rem 0.75rem 0;
        padding: 0.625rem 0.875rem;
        border-radius: 0.5rem;
        background: oklch(from var(--danger, #ff3b30) l c h / 12%);
        color: var(--danger, #c00);
        font-size: 0.8125rem;
      }

      .chat {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }

      .chat-empty {
        margin: auto;
        text-align: center;
        color: var(--neutral-500);
        max-width: 20rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .chat-empty-icon {
        font-size: 1.75rem;
      }

      .msg {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .msg.user {
        align-items: flex-end;
      }

      .msg-label {
        margin: 0;
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--neutral-500);
      }

      .bubble {
        max-width: 42rem;
        padding: 0.625rem 0.875rem;
        border-radius: 1rem;
        font-size: 0.9375rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .msg.user .bubble {
        background: var(--primary-600);
        color: var(--white);
        border-bottom-right-radius: 0.25rem;
      }

      .msg.assistant .bubble {
        background: var(--neutral-100);
        color: var(--neutral-800);
        border-bottom-left-radius: 0.25rem;
      }

      .bubble.typing {
        color: var(--neutral-500);
        font-style: italic;
      }

      .composer {
        flex: none;
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        padding: 0.75rem;
        border-top: 1px solid var(--neutral-200);
        background: var(--white);
      }

      .composer-input {
        flex: 1;
        resize: none;
        border: 1px solid var(--neutral-300);
        border-radius: 0.75rem;
        padding: 0.625rem 0.75rem;
        font: inherit;
        font-size: 0.9375rem;
        line-height: 1.4;
      }

      .composer-input:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px oklch(from var(--primary-500) l c h / 20%);
      }

      .code {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: #1e1e1e;
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
        padding: 1rem;
        font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
        font-size: 0.8125rem;
        line-height: 1.6;
        tab-size: 2;
        white-space: pre;
        overflow: auto;
        border: none;
      }

      .code-highlight {
        pointer-events: none;
        color: #d4d4d4;
        background: #1e1e1e;
      }

      .code-highlight > code {
        display: block;
        font: inherit;
        white-space: pre;
      }

      .code-area {
        resize: none;
        color: transparent;
        caret-color: #d4d4d4;
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

      .code-actions {
        flex: none;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 0.75rem;
        border-top: 1px solid var(--neutral-800);
        background: #1e1e1e;
      }
    }
  `;
}
