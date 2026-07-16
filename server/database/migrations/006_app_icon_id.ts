import type { Database } from "bun:sqlite";

/** App launcher icon file id → ./static/app-icons/{icon_id}.webp */
export default function (db: Database) {
  db.run(`ALTER TABLE apps ADD COLUMN icon_id TEXT`);
}
