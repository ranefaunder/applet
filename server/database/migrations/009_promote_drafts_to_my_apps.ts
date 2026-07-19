import type { Database } from "bun:sqlite";

/**
 * Draft placement removed.
 * - Delete empty Create shells that never got a real app (status draft / placeholder code).
 * - Promote remaining rows into My Apps.
 */
export const up = (database: Database) => {
  database.run(`
    DELETE FROM apps
    WHERE config_json LIKE '%"status":"draft"%'
       OR config_json LIKE '%"tagName":"applet-draft"%'
  `);
  database.run("UPDATE apps SET is_draft = 0 WHERE is_draft = 1");
};
