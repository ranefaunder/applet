import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import AppLauncher from "/app/components/home/AppLauncher";

export const HomePath = "/:lang" as const;

export default function Home(_props: RoutePropsForPath<typeof HomePath>) {
  const view = html`
    <div data-scope="Home" ui-container="md" ui-padding="block-lg">
      <${AppLauncher} />
    </div>
  `;

  const style = css`
    @scope ([data-scope="Home"]) to ([data-scope]) {
      & {
        container-type: inline-size;
      }
    }
  `;

  return [view, style];
}
