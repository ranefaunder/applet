import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import AppLauncher from "/app/components/home/AppLauncher";

export const HomePath = "/:lang" as const;

export default function Home(_props: RoutePropsForPath<typeof HomePath>) {
  const view = html`
    <div data-scope="Home" class="home-screen">
      <div class="home-content">
        <${AppLauncher} />
      </div>
    </div>
  `;

  const style = css`
    @scope ([data-scope="Home"]) to ([data-scope]) {
      &.home-screen {
        --home-cols: 4;
        --home-width: min(100%, 24.75rem);
        --home-inline: 1.7rem;
        --home-icon: clamp(3.65rem, 15.4vw, 4.25rem);
        --home-gap-x: 1.05rem;
        --home-gap-y: 1.55rem;
        --home-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
          system-ui, sans-serif;

        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: transparent;
        font-family: var(--home-font);
        color: #fff;
      }

      .home-content {
        position: relative;
        z-index: 1;
        flex: 1;
        min-height: 0;
        width: 100%;
        max-width: var(--home-width);
        margin: 0 auto;
        padding:
          calc(1.15rem + env(safe-area-inset-top, 0px))
          var(--home-inline)
          calc(7.5rem + env(safe-area-inset-bottom, 0px));
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .home-content::-webkit-scrollbar {
        display: none;
      }

      /* iPad portrait — 5 saraketta, tilavampi layout */
      @media (min-width: 700px) {
        &.home-screen {
          --home-cols: 5;
          --home-width: min(100%, 46rem);
          --home-inline: 2.75rem;
          --home-icon: 4.15rem;
          --home-gap-x: 1.65rem;
          --home-gap-y: 1.85rem;
        }

        .home-content {
          padding-top: calc(1.75rem + env(safe-area-inset-top, 0px));
          padding-bottom: calc(8rem + env(safe-area-inset-bottom, 0px));
        }
      }

      /* iPad landscape / desktop — 6 saraketta */
      @media (min-width: 1024px) {
        &.home-screen {
          --home-cols: 6;
          --home-width: min(100%, 58rem);
          --home-inline: 3.5rem;
          --home-icon: 4.35rem;
          --home-gap-x: 2rem;
          --home-gap-y: 2.1rem;
        }

        .home-content {
          padding-top: calc(2.25rem + env(safe-area-inset-top, 0px));
        }
      }

      @media (min-width: 1280px) {
        &.home-screen {
          --home-width: min(100%, 66rem);
          --home-inline: 4rem;
          --home-icon: 4.5rem;
          --home-gap-x: 2.25rem;
          --home-gap-y: 2.25rem;
        }
      }
    }
  `;

  return [view, style];
}
