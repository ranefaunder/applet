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
        --home-width: 100%;
        --home-inline: 1.25rem;
        --home-icon: clamp(3.65rem, 15.4vw, 4.25rem);
        --home-gap-x: 1.05rem;
        --home-gap-y: 1.55rem;
        --home-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
          system-ui, sans-serif;

        position: relative;
        isolation: isolate;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #1a1848;
        font-family: var(--home-font);
        color: #fff;
      }

      /* CSS-tausta (ei kuvaa): sininen → violetti → pinkki/oranssi + pehmeä valo. */
      &.home-screen::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-color: #1a1848;
        background-image:
          radial-gradient(
            ellipse 95% 70% at 78% 92%,
            rgba(255, 150, 120, 0.72) 0%,
            rgba(220, 90, 140, 0.35) 35%,
            transparent 62%
          ),
          radial-gradient(
            ellipse 70% 55% at 12% 18%,
            rgba(70, 110, 255, 0.65) 0%,
            transparent 58%
          ),
          radial-gradient(
            ellipse 65% 50% at 88% 22%,
            rgba(160, 70, 230, 0.5) 0%,
            transparent 55%
          ),
          radial-gradient(
            ellipse 85% 45% at 45% 58%,
            rgba(255, 200, 210, 0.28) 0%,
            transparent 55%
          ),
          linear-gradient(
            155deg,
            #15205c 0%,
            #2a1f6e 32%,
            #5a2a7a 58%,
            #c45a78 82%,
            #e8896a 100%
          );
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
          calc(2.1rem + env(safe-area-inset-top, 0px))
          0
          calc(2.4rem + env(safe-area-inset-bottom, 0px));
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
      }

      /* iPad portrait — 5 saraketta, tilavampi layout */
      @media (min-width: 700px) {
        &.home-screen {
          --home-cols: 5;
          --home-width: min(100%, 46rem);
          --home-inline: 1.75rem;
          --home-icon: 4.15rem;
          --home-gap-x: 1.65rem;
          --home-gap-y: 1.85rem;
        }

        .home-content {
          padding-top: calc(2.5rem + env(safe-area-inset-top, 0px));
          padding-bottom: calc(2.75rem + env(safe-area-inset-bottom, 0px));
        }
      }

      /* iPad landscape / desktop — 6 saraketta */
      @media (min-width: 1024px) {
        &.home-screen {
          --home-cols: 6;
          --home-width: min(100%, 58rem);
          --home-inline: 2.25rem;
          --home-icon: 4.35rem;
          --home-gap-x: 2rem;
          --home-gap-y: 2.1rem;
        }

        .home-content {
          padding-top: calc(3rem + env(safe-area-inset-top, 0px));
          padding-bottom: calc(3rem + env(safe-area-inset-bottom, 0px));
        }
      }

      @media (min-width: 1280px) {
        &.home-screen {
          --home-width: min(100%, 66rem);
          --home-inline: 2.75rem;
          --home-icon: 4.5rem;
          --home-gap-x: 2.25rem;
          --home-gap-y: 2.25rem;
        }
      }
    }
  `;

  return [view, style];
}
