import type { Database } from "bun:sqlite";

/** Per-reply icon image generation usage. */
export default function (db: Database) {
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN icon_model_key TEXT`);
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN icon_cost_usd REAL`);
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN icon_duration_ms INTEGER`);
}
