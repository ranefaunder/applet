import { html, css } from "/utils/markup";
import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import type { AppSummary } from "/types/app-types";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import { apps, loadApps, clearApps } from "/app/stores/appStore";
import { isLoggedIn, user } from "/app/stores/userStore";
import AppIcon from "/app/components/home/AppIcon";

const compassSvg = html`
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
    <path
      d="M14.7 9.3 13.1 13.1 9.3 14.7l1.6-3.8z"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="1"
      stroke-linejoin="round"
    />
  </svg>`;

const plusSvg = html`
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 6.5v11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <path d="M6.5 12h11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  </svg>`;

const chevronSvg = html`
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;

function remToPx(value: string): number {
  const rem = parseFloat(value);
  if (!Number.isFinite(rem)) return 0;
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * root;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function AppLauncher() {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const loggedInUser = user.value;
  const readyApps = apps.value;
  const count = readyApps.length;

  const perPage = useSignal(0);
  const pageIndex = useSignal(0);
  const pageHeightPx = useSignal(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loggedInUser) {
      void loadApps();
    } else {
      clearApps();
    }
  }, [loggedInUser?.id]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    function recompute() {
      const rootEl = rootRef.current;
      const vp = viewportRef.current;
      if (!rootEl) return;

      const cs = getComputedStyle(rootEl);
      const cols = Math.max(1, parseInt(cs.getPropertyValue("--home-cols")) || 4);
      const rowGap = remToPx(cs.getPropertyValue("--home-gap-y") || "1.55rem");
      const cell = rootEl.querySelector<HTMLElement>(".app-icon-root");
      const cellH = cell?.offsetHeight ?? remToPx("5.75rem");

      const shortcuts = rootEl.querySelector<HTMLElement>(".shortcuts");
      const dots = rootEl.querySelector<HTMLElement>(".page-dots");
      const panel = rootEl.querySelector<HTMLElement>(".home-panel");
      const panelPadY = panel
        ? (parseFloat(getComputedStyle(panel).paddingTop) || 0) +
          (parseFloat(getComputedStyle(panel).paddingBottom) || 0)
        : 40;

      const reserved =
        (shortcuts?.offsetHeight ?? 0) +
        (dots?.offsetHeight ?? 0) +
        panelPadY +
        24;

      const chromeGaps = dots ? remToPx("0.55rem") : 0;

      const maxGridH = Math.max(cellH, rootEl.clientHeight - reserved - chromeGaps);
      const maxRows = Math.max(1, Math.floor((maxGridH + rowGap) / (cellH + rowGap)));
      const next = cols * maxRows;
      if (next !== perPage.value) perPage.value = next;

      const neededRows = Math.max(1, Math.ceil(Math.max(count, 1) / cols));
      const displayRows = Math.min(neededRows, maxRows);
      const h = displayRows * cellH + Math.max(0, displayRows - 1) * rowGap;
      if (h !== pageHeightPx.value) pageHeightPx.value = h;
      if (vp) vp.style.height = `${h}px`;
    }

    recompute();
    const ro = new ResizeObserver(() => recompute());
    ro.observe(root);
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [count]);

  const pages: AppSummary[][] = perPage.value > 0 ? chunk(readyApps, perPage.value) : [readyApps];
  const pageCount = Math.max(1, pages.length);

  useEffect(() => {
    if (pageIndex.value > pageCount - 1) {
      const next = pageCount - 1;
      pageIndex.value = next;
      const vp = viewportRef.current;
      if (vp) vp.scrollTo({ left: next * vp.clientWidth });
    }
  }, [pageCount]);

  function onScroll() {
    const vp = viewportRef.current;
    if (!vp) return;
    const width = vp.clientWidth || 1;
    const idx = Math.round(vp.scrollLeft / width);
    if (idx !== pageIndex.value) pageIndex.value = idx;
  }

  function goToPage(i: number) {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ left: i * vp.clientWidth, behavior: "smooth" });
  }

  const shortcuts = html`
    <div class="shortcuts">
      <a class="shortcut explore" href=${`/${lang}/`}>
        <span class="shortcut-badge">${compassSvg}</span>
        <span class="shortcut-text">
          <span class="shortcut-title">${t("Explorer Apps")}</span>
          <span class="shortcut-desc">${t("Discover apps made by others")}</span>
        </span>
        <span class="shortcut-chevron">${chevronSvg}</span>
      </a>
      <a class="shortcut create" href=${`/${lang}/edit`}>
        <span class="shortcut-badge">${plusSvg}</span>
        <span class="shortcut-text">
          <span class="shortcut-title">${t("Create New App")}</span>
          <span class="shortcut-desc">${t("Build it with AI")}</span>
        </span>
        <span class="shortcut-chevron">${chevronSvg}</span>
      </a>
    </div>
  `;

  const view = html`
    <div data-scope="AppLauncher" ref=${rootRef}>
      ${!isLoggedIn()
        ? html`
          <div class="glass-card" ui-column="gap-md x-center">
            <p class="glass-title">${t("Sign in to open your apps")}</p>
            <button
              type="button"
              ui-button="primary"
              onClick=${() => (document.getElementById("login-dialog") as HTMLDialogElement | null)?.showModal()}
            >
              ${t("Login")}
            </button>
          </div>`
        : html`
          <section class="home-panel">
            ${count === 0
              ? html`<div class="panel-empty-wrap"><p class="panel-empty">${t("Use Create to build your first app.")}</p></div>`
              : html`
                <div class="pages-viewport" ref=${viewportRef} onScroll=${onScroll}>
                  ${pages.map(
                    (pageApps) => html`
                      <div class="page">
                        <div class="grid">
                          ${pageApps.map((app) => html`<${AppIcon} app=${app} />`)}
                        </div>
                      </div>`,
                  )}
                </div>
                ${pageCount > 1
                  ? html`
                    <div class="page-dots" role="tablist">
                      ${pages.map(
                        (_, i) => html`
                          <button
                            type="button"
                            class=${`page-dot${i === pageIndex.value ? " active" : ""}`}
                            aria-label=${`${i + 1}`}
                            aria-selected=${i === pageIndex.value}
                            onClick=${() => goToPage(i)}
                          ></button>`,
                      )}
                    </div>`
                  : ""}`}
          </section>

          ${shortcuts}`}
    </div>
  `;

  const style = css`
    @scope ([data-scope="AppLauncher"]) to ([data-scope]) {
      & {
        height: 100%;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
      }

      .home-panel {
        flex: 0 1 auto;
        width: calc(100% - 2 * var(--home-inline, 1.25rem));
        max-width: 100%;
        max-height: 100%;
        margin-inline: auto;
        display: flex;
        flex-direction: column;
        padding: 1.85rem 0 1.35rem;
        border-radius: 2rem;
        background: rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.26);
        box-shadow:
          0 16px 48px rgba(0, 0, 0, 0.22),
          inset 0 0.5px 0 rgba(255, 255, 255, 0.4);
      }

      .pages-viewport {
        flex: none;
        width: 100%;
        display: flex;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        touch-action: pan-x;
      }

      .pages-viewport::-webkit-scrollbar {
        display: none;
      }

      .page {
        flex: 0 0 100%;
        box-sizing: border-box;
        width: 100%;
        padding-inline: var(--home-inline, 0.85rem);
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(var(--home-cols, 4), minmax(0, 1fr));
        column-gap: var(--home-gap-x, 1.05rem);
        row-gap: var(--home-gap-y, 1.55rem);
        justify-items: center;
        align-content: start;
      }

      .panel-empty-wrap {
        display: grid;
        place-items: center;
        padding: 0.5rem var(--home-inline, 0.85rem) 0.25rem;
      }

      .panel-empty {
        margin: 0;
        padding: 1rem 0.5rem;
        text-align: center;
        font-size: 0.9375rem;
        font-weight: 600;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.85);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
      }

      .page-dots {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        margin-top: 0.55rem;
        min-height: 0.42rem;
        padding-inline: var(--home-inline, 0.85rem);
      }

      .page-dot {
        flex: none;
        box-sizing: border-box;
        width: 0.42rem;
        height: 0.42rem;
        min-width: 0.42rem;
        min-height: 0.42rem;
        max-width: 0.42rem;
        max-height: 0.42rem;
        aspect-ratio: 1;
        padding: 0;
        margin: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.38);
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.15s ease, transform 0.15s ease;
      }

      .page-dot.active {
        background: #fff;
        transform: scale(1.15);
      }

      .shortcuts {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        width: 100%;
        max-width: calc(20rem + 2 * var(--home-inline, 0.85rem));
        padding-inline: var(--home-inline, 0.85rem);
        box-sizing: border-box;
      }

      .shortcut {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
        border-radius: 1.45rem;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.22);
        backdrop-filter: blur(28px) saturate(160%);
        -webkit-backdrop-filter: blur(28px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.38);
        box-shadow:
          0 10px 28px rgba(0, 0, 0, 0.18),
          inset 0 0.5px 0 rgba(255, 255, 255, 0.5);
        -webkit-tap-highlight-color: transparent;
        transition: transform 0.16s cubic-bezier(0.2, 0.9, 0.2, 1);
      }

      .shortcut:active {
        transform: scale(0.985);
      }

      .shortcut.explore {
        background:
          linear-gradient(
            120deg,
            rgba(140, 120, 255, 0.28),
            rgba(180, 140, 255, 0.22)
          ),
          rgba(255, 255, 255, 0.18);
      }

      .shortcut.create {
        background:
          linear-gradient(
            120deg,
            rgba(255, 130, 170, 0.32),
            rgba(255, 150, 140, 0.26)
          ),
          rgba(255, 255, 255, 0.18);
      }

      .shortcut-badge {
        flex: none;
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 50%;
        color: #fff;
        background: rgba(255, 255, 255, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow:
          0 3px 10px rgba(0, 0, 0, 0.14),
          inset 0 1px 0 rgba(255, 255, 255, 0.45);
      }

      .shortcut.create .shortcut-badge {
        background: linear-gradient(145deg, rgba(255, 120, 170, 0.85), rgba(230, 90, 150, 0.8));
        border-color: rgba(255, 255, 255, 0.45);
      }

      .shortcut.explore .shortcut-badge {
        background: linear-gradient(145deg, rgba(150, 140, 255, 0.8), rgba(120, 110, 230, 0.75));
        border-color: rgba(255, 255, 255, 0.45);
      }

      .shortcut-badge svg {
        width: 1.35rem;
        height: 1.35rem;
        display: block;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
      }

      .shortcut-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
      }

      .shortcut-title {
        font-size: 1rem;
        font-weight: 750;
        letter-spacing: -0.015em;
        line-height: 1.15;
        color: #fff;
        text-shadow:
          0 0 1px rgba(0, 0, 0, 0.35),
          0 1px 3px rgba(0, 0, 0, 0.45);
      }

      .shortcut-desc {
        font-size: 0.78rem;
        font-weight: 550;
        line-height: 1.25;
        color: rgba(255, 255, 255, 0.9);
        text-shadow:
          0 0 1px rgba(0, 0, 0, 0.3),
          0 1px 2px rgba(0, 0, 0, 0.4);
      }

      .shortcut-chevron {
        flex: none;
        display: grid;
        place-items: center;
        color: rgba(255, 255, 255, 0.92);
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
      }

      .shortcut-chevron svg {
        width: 1.2rem;
        height: 1.2rem;
        display: block;
      }

      .glass-card {
        max-width: 17.5rem;
        padding: 1.6rem 1.35rem;
        text-align: center;
        border-radius: 1.65rem;
        background: rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(36px) saturate(170%);
        -webkit-backdrop-filter: blur(36px) saturate(170%);
        border: 1px solid rgba(255, 255, 255, 0.28);
        box-shadow:
          0 16px 48px rgba(0, 0, 0, 0.22),
          inset 0 0.5px 0 rgba(255, 255, 255, 0.4);
      }

      .glass-title {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.01em;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }
    }
  `;

  return [view, style];
}
