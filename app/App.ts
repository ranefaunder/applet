import { hydrate, LocationProvider, ErrorBoundary, Router, Route } from "preact-iso";
import "@preact/signals";
import { h } from "preact";
import { html, css } from "/utils/markup";
import { isClient } from "/utils/env";
import { getLang } from "/utils/lang";
import { ssrContext, ssrFinish } from "/utils/ssr.client";
import { registerServiceWorker } from "/utils/pwa.client";
import { withLayout } from "./Layout";
import MetaUpdater from "./components/headless/MetaUpdater";
import VisualViewportHeight from "./components/headless/VisualViewportHeight";
import { initAuthStore } from "./stores/userStore";
import { initConfigStore } from "./stores/configStore";
import { initI18nStore } from "./stores/i18nStore";
import { initAppStore } from "./stores/appStore";
import { initAppEditStore } from "./stores/appEditStore";
import DevStores from "./components/headless/DevStores";
import Home, { HomePath } from "./routes/Home";
import Create, { CreatePath } from "./routes/Create";
import MyApps, { MyAppsPath } from "./routes/MyApps";
import Settings, { SettingsPath } from "./routes/Settings";
import Login, { LoginPath } from "./routes/Login";
import AppEdit, { AppEditPath } from "./routes/AppEdit";
import NotFound from "./routes/NotFound";
import { spaRouterScope } from "/utils/app-url";

function initStores() {
  initConfigStore();
  initAuthStore();
  initI18nStore();
  initAppStore();
  initAppEditStore();
}

if (isClient) {
  void import("preact/debug").then(() => {
    initStores();
    hydrate(h(App, {}), document.getElementById("app")!);
    registerServiceWorker();
    ssrFinish();
  });
}

export default function App() {
  if (!isClient) {
    initStores();
  }

  const currentLang = isClient
    ? (getLang(window.location.pathname) ?? "en")
    : ssrContext().language;
  const locationScope = spaRouterScope(currentLang ?? "en");

  const view = html`
    <${LocationProvider} scope=${locationScope}>
      <${ErrorBoundary}
        onError=${(error: unknown) => console.error("App error:", error)}
      >
        <div data-scope="App">
          <${Router}>
            <${Route} path=${CreatePath} component=${withLayout(Create)} />
            <${Route} path=${MyAppsPath} component=${withLayout(MyApps)} />
            <${Route} path=${HomePath} component=${withLayout(Home)} />
            <${Route} path=${SettingsPath} component=${withLayout(Settings)} />
            <${Route} path=${LoginPath} component=${withLayout(Login)} />
            <${Route} path=${AppEditPath} component=${AppEdit} />
            <${Route} default component=${withLayout(NotFound)} />
          <//>
        </div>
        <${VisualViewportHeight} />
        <${MetaUpdater} />
        <${DevStores} />
      <//>
    <//>
  `;

  const style = css`
    @scope ([data-scope="App"]) to ([data-scope]) {
      & {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
      }
    }

    [data-scope="App"] [data-scope="Layout"] {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  `;

  return [style, view];
}
