import { html, css } from "/utils/markup";
import type { RoutePropsForPath } from "preact-iso";
import CreateForm from "/app/components/home/CreateForm";

export const CreatePath = "/:lang/create" as const;

export default function Create(_props: RoutePropsForPath<typeof CreatePath>) {
  const view = html`
    <div data-scope="Create">
      <${CreateForm} />
    </div>
  `;

  const style = css`
    @scope ([data-scope="Create"]) to ([data-scope]) {
      & {
        container-type: inline-size;
        padding-bottom: 4rem;
      }
    }
  `;

  return [view, style];
}
