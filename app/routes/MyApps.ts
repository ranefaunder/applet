import type { RoutePropsForPath } from "preact-iso";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { getLang } from "/utils/lang";

export const MyAppsPath = "/:lang/apps" as const;

/** Legacy /apps URL — redirects to the home launcher. */
export default function MyApps(_props: RoutePropsForPath<typeof MyAppsPath>) {
  const { path, route } = useLocation();
  const lang = getLang(path ?? "") ?? "en";

  useEffect(() => {
    route(`/${lang}/`, true);
  }, [lang]);

  return null;
}
