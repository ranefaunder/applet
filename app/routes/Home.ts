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
    <div data-scope="Home" ui-container="md">
      <header class="hero">
        <div class="hero-copy">
          <h1 class="title">${t("Applet — Let AI make personal apps for your needs.")}</h1>
          <p class="subtitle">${t("Your ideas. Your apps. Your data. Your way.")}</p>
        </div>
        <a class="create-btn" href=${`/${lang}/create`} ui-button="primary">
          <span class="plus" aria-hidden="true">+</span>
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
        padding-top: 1.5rem;
        padding-bottom: 2rem;
      }

      .hero {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 0.5rem 0 0.25rem;
      }

      .hero-copy {
        max-width: 28rem;
      }

      .title {
        font-size: clamp(1.625rem, 3vw + 0.75rem, 2.125rem);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.03em;
        color: var(--neutral-900);
        text-wrap: balance;
        margin-bottom: 0.5rem;
      }

      .subtitle {
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--neutral-600);
      }

      .create-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        max-width: 22rem;
        text-decoration: none;
      }

      .plus {
        font-size: 1.25rem;
        font-weight: 500;
        line-height: 1;
      }

      @media (min-width: 640px) {
        .hero {
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
          gap: 2rem;
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
