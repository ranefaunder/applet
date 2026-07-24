import type { RoutePropsForPath } from "preact-iso";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";
import { openCreateOverlay } from "/app/stores/createOverlayStore";

export const CreatePath = "/:lang/create" as const;

/** Legacy /create URL — opens the create overlay on the home launcher. */
export default function Create(_props: RoutePropsForPath<typeof CreatePath>) {
  const { path, route } = useLocation();
  const lang = getLang(path ?? "") ?? "en";

  useEffect(() => {
    openCreateOverlay();
    route(`/${lang}/`, true);
  }, [lang]);

  return null;
}
