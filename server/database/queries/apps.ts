import { db } from "/server/database/db";
import type { AppSummary, AppVisibility } from "/types/app-types";

type AppRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  slug: string;
  visibility: AppVisibility;
  source_app_id: string | null;
  config_json: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  owner_nickname?: string | null;
  remix_count?: number;
};

function toSummary(row: AppRow): AppSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    visibility: row.visibility,
    ownerId: row.owner_id,
    ownerNickname: row.owner_nickname ?? null,
    remixCount: row.remix_count ?? 0,
    updatedAt: row.updated_at,
  };
}

export const dbGetAppById = (id: string): AppRow | null =>
  db.query<AppRow, [string]>("SELECT * FROM apps WHERE id = ?").get(id) ?? null;

export const dbGetAppBySlug = (slug: string): AppRow | null =>
  db.query<AppRow, [string]>("SELECT * FROM apps WHERE slug = ?").get(slug) ?? null;

export const dbListUserApps = (ownerId: string): AppSummary[] =>
  db
    .query<AppRow, [string]>(`
      SELECT a.*, u.nickname as owner_nickname,
        (SELECT COUNT(*) FROM apps r WHERE r.source_app_id = a.id) as remix_count
      FROM apps a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.owner_id = ?
      ORDER BY a.updated_at DESC
    `)
    .all(ownerId)
    .map(toSummary);

export const dbListPublicApps = (limit = 24): AppSummary[] =>
  db
    .query<AppRow, [number]>(`
      SELECT a.*, u.nickname as owner_nickname,
        (SELECT COUNT(*) FROM apps r WHERE r.source_app_id = a.id) as remix_count
      FROM apps a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.visibility = 'public'
      ORDER BY a.published_at DESC, a.updated_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(toSummary);

export const dbCreateApp = (data: {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  slug: string;
  configJson: string;
  sourceAppId?: string | null;
}) => {
  const now = new Date().toISOString();
  return db
    .query(`
      INSERT INTO apps (id, owner_id, title, description, slug, config_json, source_app_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      data.id,
      data.ownerId,
      data.title,
      data.description,
      data.slug,
      data.configJson,
      data.sourceAppId ?? null,
      now,
      now,
    );
};

export const dbExistsAppSlug = (slug: string): boolean =>
  db.query<{ n: number }, [string]>("SELECT 1 as n FROM apps WHERE slug = ? LIMIT 1").get(slug) !== null;

/** Satunnainen 5+ numeroinen julkinen ID (slug), sama malli kuin Cuukbuuk-resepteillä. */
export function dbGenerateAppSlug(): string {
  const maxAttempts = 20;
  let length = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const slug = String(Math.floor(Math.random() * (max - min + 1)) + min);

    if (!dbExistsAppSlug(slug)) {
      return slug;
    }

    length++;
  }

  throw new Error(`Failed to generate unique app slug after ${maxAttempts} attempts`);
}

export const isNumericAppSlug = (slug: string): boolean => /^\d{5,}$/.test(slug);

export const dbUpdateApp = (id: string, data: { title?: string; description?: string; configJson?: string }) => {
  const now = new Date().toISOString();
  const title = data.title;
  const description = data.description;
  const configJson = data.configJson;
  return db
    .query(`
      UPDATE apps
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          config_json = COALESCE(?, config_json),
          updated_at = ?
      WHERE id = ?
    `)
    .run(title ?? null, description ?? null, configJson ?? null, now, id);
};
