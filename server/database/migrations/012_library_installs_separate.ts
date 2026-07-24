import type { Database } from "bun:sqlite";

/**
 * Ownership and library install are separate:
 * - apps.owner_id = who owns/edits the app
 * - app_installs = what's on a user's home screen
 *
 * Backfill: every existing owned app gets an install row for its owner so
 * current home screens don't empty when library switches to installs-only.
 */
export default function (db: Database) {
  db.run(`
    INSERT OR IGNORE INTO app_installs (user_id, app_id, created_at)
    SELECT owner_id, id, COALESCE(created_at, datetime('now'))
    FROM apps
    WHERE owner_id IS NOT NULL
  `);
}
