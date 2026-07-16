import type { Database } from "bun:sqlite";
import { isDraftConfig, parseAppConfig } from "/types/app-config-types";

/**
 * Adds apps.is_draft for home-screen placement.
 * New apps stay in Drafts until promoted; existing ready apps stay in My Apps.
 */
export default function (db: Database) {
  db.run(`ALTER TABLE apps ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 1`);

  const rows = db.query<{ id: string; config_json: string }, []>(
    "SELECT id, config_json FROM apps",
  ).all();

  for (const row of rows) {
    const config = parseAppConfig(row.config_json);
    const draft = isDraftConfig(config) ? 1 : 0;
    db.query("UPDATE apps SET is_draft = ? WHERE id = ?").run(draft, row.id);
  }
}
