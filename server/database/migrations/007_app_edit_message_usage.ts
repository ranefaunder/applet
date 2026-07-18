import type { Database } from "bun:sqlite";

/** Per-reply AI usage: model key, cost (USD), duration (ms). */
export default function (db: Database) {
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN model_key TEXT`);
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN cost_usd REAL`);
  db.run(`ALTER TABLE app_edit_messages ADD COLUMN duration_ms INTEGER`);
}
