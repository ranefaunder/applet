import { html, css } from "/utils/markup";
import { useEffect, useRef } from "preact/hooks";
import type { AppSummary } from "/types/app-types";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { appEditUrl, appPageUrl } from "/utils/app-url";
import { appIconSrc } from "/utils/app-icon";
import { previewGradient, draftLetter } from "/utils/app-preview";
import { deleteApp } from "/app/stores/appStore";

type Props = {
  app: AppSummary;
};

const LONG_PRESS_MS = 480;

/** Apple-tyylinen squircle-maski (continuous corner). */
const SQUIRCLE_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path fill="black" d="M50 0C77.6 0 88.5 0 94.3 5.7C100 11.5 100 22.4 100 50C100 77.6 100 88.5 94.3 94.3C88.5 100 77.6 100 50 100C22.4 100 11.5 100 5.7 94.3C0 88.5 0 77.6 0 50C0 22.4 0 11.5 5.7 5.7C11.5 0 22.4 0 50 0Z"/>
  </svg>`,
)}")`;

export default function AppIcon({ app }: Props) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const iconSrc = appIconSrc(app.iconId);
  const gradient = previewGradient(app.slug);
  const letter = draftLetter(app.title);
  const menuId = `app-menu-${app.id}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  function isMenuOpen() {
    return menuRef.current?.matches(":popover-open") ?? false;
  }

  function openMenu() {
    const menu = menuRef.current;
    if (!menu || isMenuOpen()) return;
    try {
      menu.showPopover();
    } catch {
      // Popover API unavailable — ignore.
    }
  }

  function closeMenu() {
    const menu = menuRef.current;
    if (!menu || !isMenuOpen()) return;
    try {
      menu.hidePopover();
    } catch {
      // ignore
    }
  }

  function clearLongPress() {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!isMenuOpen()) return;
      const target = e.target as Node | null;
      if (!target) return;
      // Klikkaus valikon sisällä: älä sulje.
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }

    document.addEventListener("pointerdown", onDocPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      clearLongPress();
    };
  }, []);

  /** Oikea hiiren nappi → valikko (jäää auki napin vapautuksen jälkeen). */
  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    clearLongPress();
    didLongPress.current = false;
    openMenu();
  }

  /** Vasemman napin / kosketuksen pitkä painallus → valikko. */
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    didLongPress.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      openMenu();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }, LONG_PRESS_MS);
  }

  function onPointerUp() {
    clearLongPress();
  }

  function onPointerCancel() {
    clearLongPress();
    didLongPress.current = false;
  }

  function onPointerLeave() {
    clearLongPress();
  }

  function onClick(e: MouseEvent) {
    if (didLongPress.current || isMenuOpen()) {
      e.preventDefault();
      e.stopPropagation();
      didLongPress.current = false;
    }
  }

  async function handleDelete(e: Event) {
    e.preventDefault();
    closeMenu();
    const ok = window.confirm(t("Delete \"$title\"? This cannot be undone.", { title: app.title }));
    if (!ok) return;
    await deleteApp(app.slug);
  }

  const view = html`
    <div
      class="app-icon-root"
      data-scope="AppIcon"
      ui-menu="bottom"
      ref=${rootRef}
      style=${{ "--icon-gradient": gradient }}
    >
      <a
        class="app-icon"
        href=${appPageUrl(lang, app.slug)}
        aria-label=${t("Open $title", { title: app.title })}
        aria-haspopup="menu"
        aria-controls=${menuId}
        onContextMenu=${onContextMenu}
        onPointerDown=${onPointerDown}
        onPointerUp=${onPointerUp}
        onPointerCancel=${onPointerCancel}
        onPointerLeave=${onPointerLeave}
        onClick=${onClick}
      >
        <span class="glyph-wrap">
          ${iconSrc
            ? html`<img class="glyph-img" src=${iconSrc} alt="" width="180" height="180" decoding="async" />`
            : html`<span class="glyph" aria-hidden="true">${letter}</span>`}
          <span class="glyph-shine" aria-hidden="true"></span>
        </span>
        <span class="label">${app.title}</span>
      </a>

      <div id=${menuId} ref=${menuRef} popover="manual" role="menu">
        <a role="menuitem" href=${appEditUrl(lang, app.slug)} onClick=${() => closeMenu()}>
          <i ui-icon="pencil" aria-hidden="true"></i>
          ${t("Edit")}
        </a>
        <hr />
        <button type="button" role="menuitem" class="danger" onClick=${(e: Event) => void handleDelete(e)}>
          <i ui-icon="trash" aria-hidden="true"></i>
          ${t("Delete")}
        </button>
      </div>
    </div>
  `;

  const style = css`
    @scope ([data-scope="AppIcon"]) to ([data-scope]) {
      &.app-icon-root {
        width: 100%;
        min-width: 0;
        max-width: var(--home-icon, 4.25rem);
        display: flex;
        justify-content: center;
      }

      .app-icon {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        width: 100%;
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }

      .glyph-wrap {
        position: relative;
        width: var(--home-icon, 4.25rem);
        height: var(--home-icon, 4.25rem);
        flex: none;
        filter: drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.18))
          drop-shadow(0 8px 14px rgba(0, 0, 0, 0.22));
        transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.2, 1);
      }

      .glyph,
      .glyph-img {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        border-radius: 0;
        -webkit-mask-image: ${SQUIRCLE_MASK};
        mask-image: ${SQUIRCLE_MASK};
        -webkit-mask-size: 100% 100%;
        mask-size: 100% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }

      .glyph {
        background: var(--icon-gradient);
        font-size: calc(var(--home-icon, 4.25rem) * 0.42);
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        color: #fff;
      }

      .glyph-img {
        object-fit: cover;
        background: #d1d1d6;
      }

      .glyph-shine {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.28) 0%,
          rgba(255, 255, 255, 0.08) 38%,
          transparent 52%
        );
        -webkit-mask-image: ${SQUIRCLE_MASK};
        mask-image: ${SQUIRCLE_MASK};
        -webkit-mask-size: 100% 100%;
        mask-size: 100% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }

      .app-icon:hover .glyph-wrap,
      .app-icon:focus-visible .glyph-wrap {
        transform: scale(1.04);
      }

      .app-icon:active .glyph-wrap {
        transform: scale(0.88);
        transition-duration: 0.07s;
      }

      .label {
        width: 100%;
        max-width: 5.5rem;
        font-size: 0.6875rem;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.01em;
        text-align: center;
        color: #fff;
        text-shadow:
          0 0 1.5px rgba(0, 0, 0, 0.58),
          0 1px 2.5px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      [role="menu"] {
        z-index: 200;
        min-width: 10.5rem;
      }

      [role="menuitem"].danger {
        color: var(--danger, #c00);
      }
    }
  `;

  return [view, style];
}
