import { html, css } from "/utils/markup";
import { useRef, useEffect } from "preact/hooks";
import { isDraftConfig } from "/types/app-config-types";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import { useLocation } from "preact-iso";
import { currentApp, appLoading, appError, ensureAppReady } from "/app/stores/appViewStore";
import AppCodePreviewDialog from "/app/components/app/AppCodePreviewDialog";
import { appRunUrl } from "/utils/app-url";

type Props = {
  slug: string;
};

/**
 * Rakentaa iframe-dokumentin, joka rekisteröi ja mounttaa AI:n generoiman
 * web componentin. Komponentin JS ladataan blob-URL:sta (välttää inline-scriptin
 * escape-ongelmat). Iframe eristää DOM:n ja CSS:n muusta alustasta.
 */
function buildFrameDoc(tagName: string, moduleUrl: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #171717; }
</style></head><body>
<${tagName}></${tagName}>
<script type="module" src="${moduleUrl}"></script>
<script>
  (function () {
    function post() {
      try {
        var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
        parent.postMessage({ type: "appstudo:height", height: h }, "*");
      } catch (e) {}
    }
    try { new ResizeObserver(post).observe(document.documentElement); } catch (e) {}
    window.addEventListener("load", post);
    setTimeout(post, 150); setTimeout(post, 600); setTimeout(post, 1500);
  })();
</script>
</body></html>`;
}

export default function AppRuntime({ slug }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";

  const app = currentApp.value;
  const error = appError.value;

  useEffect(() => {
    void ensureAppReady(slug);
  }, [slug]);

  useEffect(() => mountComponent(), [slug, app?.id, app?.config.code, app?.config.tagName]);

  function mountComponent() {
    const frame = frameRef.current;
    if (!frame || !app || app.slug !== slug || isDraftConfig(app.config)) return;

    const blob = new Blob([app.config.code], { type: "text/javascript" });
    const moduleUrl = URL.createObjectURL(blob);
    frame.srcdoc = buildFrameDoc(app.config.tagName, moduleUrl);

    function onMessage(e: MessageEvent) {
      if (e.source !== frame!.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type === "appstudo:height" && typeof data.height === "number") {
        frame!.style.height = `${Math.max(160, data.height)}px`;
      }
    }
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
      URL.revokeObjectURL(moduleUrl);
    };
  }

  const appMatchesSlug = app?.slug === slug;
  const waitingForApp = appLoading.value && (!app || !appMatchesSlug || isDraftConfig(app.config));

  if (waitingForApp) {
    return html`
      <div class="state" data-scope="AppRuntime">
        <p class="spinner-label">${t("Creating your app…")}</p>
        <p class="hint">${t("AI is building your web component.")}</p>
      </div>
    `;
  }

  if (error || !app || !appMatchesSlug) {
    return html`
      <div class="state error" data-scope="AppRuntime">
        <p>${error ?? t("App not found")}</p>
      </div>
    `;
  }

  const view = html`
    <div data-scope="AppRuntime">
      <header class="app-header" ui-margin="bottom-xl">
        ${app.config.emoji ? html`<span class="emoji">${app.config.emoji}</span>` : ""}
        <div class="app-header-text">
          <h1 ui-heading="lg">${app.title}</h1>
          <p class="description">${app.description}</p>
        </div>
        <div class="app-header-actions">
          <a
            href=${appRunUrl(lang, slug)}
            target="_blank"
            rel="noopener noreferrer"
            ui-button="secondary sm"
            class="open-app-btn"
          >
            ${t("Open app")}
          </a>
          <button
            type="button"
            ui-button="secondary sm"
            class="preview-code-btn"
            commandfor="app-code-preview-dialog"
            command="show-modal"
          >
            ${t("Preview code")}
          </button>
        </div>
      </header>

      <${AppCodePreviewDialog} code=${app.config.code} tagName=${app.config.tagName} />

      <iframe
        ref=${frameRef}
        class="app-frame"
        title=${app.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
        loading="lazy"
      ></iframe>
    </div>
  `;

  const style = css`
    @scope ([data-scope="AppRuntime"]) to ([data-scope]) {
      .state {
        padding: 3rem 1rem;
        text-align: center;
        color: var(--neutral-600);
      }

      .state.error {
        color: var(--danger-600, #b42318);
      }

      .hint {
        margin-top: 0.5rem;
        font-size: 0.875rem;
      }

      .app-header {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
      }

      .app-header-text {
        flex: 1;
        min-width: 0;
      }

      .app-header-actions {
        display: flex;
        flex-shrink: 0;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.125rem;
      }

      .open-app-btn,
      .preview-code-btn {
        flex-shrink: 0;
      }

      .emoji {
        font-size: 2.5rem;
        line-height: 1;
      }

      .description {
        margin-top: 0.35rem;
        color: var(--neutral-600);
        line-height: 1.5;
      }

      .app-frame {
        width: 100%;
        min-height: 320px;
        border: 1px solid var(--neutral-200);
        border-radius: 1rem;
        background: white;
        display: block;
      }
    }
  `;

  return [view, style];
}
