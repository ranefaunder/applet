import type { Database } from "bun:sqlite";

/**
 * Migrates title-based app slugs to numeric public IDs (5+ digits),
 * matching Cuukbuuk recipe IDs. Internal UUID `id` is unchanged.
 */
export default function (db: Database) {
  const isNumeric = (slug: string) => /^\d{5,}$/.test(slug);

  const generateSlug = (): string => {
    const maxAttempts = 20;
    let length = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const min = Math.pow(10, length - 1);
      const max = Math.pow(10, length) - 1;
      const slug = String(Math.floor(Math.random() * (max - min + 1)) + min);
      const exists = db.query<{ slug: string }, [string]>("SELECT slug FROM apps WHERE slug = ?").get(slug);
      if (!exists) return slug;
      length++;
    }

    throw new Error(`Failed to generate unique app slug after ${maxAttempts} attempts`);
  };

  const rows = db.query<{ id: string; slug: string }, []>("SELECT id, slug FROM apps").all();
  let updated = 0;

  for (const row of rows) {
    if (isNumeric(row.slug)) continue;
    const slug = generateSlug();
    db.query("UPDATE apps SET slug = ? WHERE id = ?").run(slug, row.id);
    updated += 1;
  }

  console.info(`  → Assigned numeric slugs to ${updated} app(s)`);
}
