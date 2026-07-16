import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import { useLocation } from "preact-iso";
import AppLauncher from "/app/components/home/AppLauncher";

export const HomePath = "/:lang" as const;

export default function Home(_props: RoutePropsForPath<typeof HomePath>) {
  const { path } = useLocation();
  const lang = getLang(path ?? "") ?? "en";

  const view = html`
    <div data-scope="Home" ui-container="md" ui-padding="block-lg">
      <header class="hero" ui-column="gap-lg">
        <div class="hero-copy" ui-column="gap-sm">
          <h1 ui-heading="xl">${t("Let AI make personal apps for your needs.")}</h1>
          <p class="subtitle">${t("Your ideas. Your apps. Your data. Your way.")}</p>
        </div>
        <a href=${`/${lang}/create`} ui-button="primary" ui-icon="plus" class="create-btn">
          ${t("Create Applet")}
        </a>
      </header>

      <${AppLauncher} />
    </div>
  `;

  const style = css`
    @scope ([data-scope="Home"]) to ([data-scope]) {
      & {
        container-type: inline-size;
      }

      .hero-copy {
        max-width: 28rem;
      }

      .subtitle {
        color: var(--neutral-600);
      }

      .create-btn {
        width: 100%;
        max-width: 22rem;
        text-decoration: none;
      }

      @media (min-width: 640px) {
        .hero {
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
        }

        .create-btn {
          width: auto;
          flex-shrink: 0;
        }
      }
    }
  `;

  return [view, style];
}
