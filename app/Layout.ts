import type { ComponentChildren, ComponentType } from "preact";
import { h } from "preact";
import { html, css } from "/utils/markup";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import Dialogs from "/app/components/Dialogs";

type LayoutProps = {
  children: ComponentChildren;
};

function isLauncherPath(path: string, lang: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized === `/${lang}`;
}

function isAppEditPath(path: string): boolean {
  return /\/edit(?:\/[^/]+)?\/?$/.test(path);
}

export default function Layout({ children }: LayoutProps) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";
  const home = isLauncherPath(path ?? "", lang);
  const editor = isAppEditPath(path ?? "");
  const hideFooter = home || editor;
  const layoutClass = editor ? "editor" : home ? "home" : undefined;
  const mainClass = editor ? "layout-main editor" : home ? "layout-main home" : "layout-main";

  const view = html`
    <div data-scope="Layout" class=${layoutClass} ui-column>
      <${Header} />
      <main class=${mainClass}>
        ${children}
      </main>
      ${hideFooter ? "" : html`<${Footer} />`}
      <${Dialogs} />
    </div>
  `;

  const style = css`
    @scope ([data-scope="Layout"]) to ([data-scope]) {
      & {
        min-height: 100%;
      }

      &.home,
      &.editor {
        height: 100svh;
        height: 100dvh;
        max-height: 100svh;
        max-height: 100dvh;
        overflow: hidden;
      }

      /* Etusivu on läpinäkyvä — tausta tulee Home-reitin CSS:stä. */
      &.home {
        background-color: transparent;
      }

      &.editor {
        background-color: #1a1848;
      }

      .layout-main {
        flex-grow: 1;
        min-height: 0;
        padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0));
      }

      .layout-main.home,
      .layout-main.editor {
        display: flex;
        flex-direction: column;
        padding-bottom: 0;
        min-height: 0;
      }

      @media (min-width: 800px) {
        .layout-main:not(.home):not(.editor) {
          padding-bottom: 0;
        }
      }
    }
  `;

  return [style, view];
}

export function withLayout<P extends object>(Page: ComponentType<P>) {
  return function LayoutRoute(props: P) {
    return h(Layout, { children: h(Page, props) });
  };
}
