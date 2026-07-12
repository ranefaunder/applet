import type { AppVisibility } from "/types/app-types";
import { isDraftConfig, parseAppConfig } from "/types/app-config-types";

type AppAccessRow = {
  owner_id: string;
  visibility: AppVisibility;
  config_json: string;
};

/**
 * Kuka saa avata sovelluksen (ajo-sivu, module.js).
 * Omistaja aina; julkaistut aina; valmiit (ready) appit myös ilman kirjautumista.
 */
export function canViewApp(row: AppAccessRow, userId: string | null): boolean {
  if (userId != null && userId === row.owner_id) return true;
  if (row.visibility === "public") return true;
  const config = parseAppConfig(row.config_json);
  return config != null && !isDraftConfig(config);
}
