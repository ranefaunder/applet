import { db } from "/server/database/db";
import type { AppEditMessage, AppEditRole } from "/types/app-config-types";

type MessageRow = {
  id: string;
  app_id: string;
  role: AppEditRole;
  content: string;
  created_at: string;
  model_key: string | null;
  cost_usd: number | null;
  duration_ms: number | null;
  icon_model_key: string | null;
  icon_cost_usd: number | null;
  icon_duration_ms: number | null;
};

function toMessage(row: MessageRow): AppEditMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    modelKey: row.model_key ?? null,
    costUsd: typeof row.cost_usd === "number" ? row.cost_usd : null,
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : null,
    iconModelKey: row.icon_model_key ?? null,
    iconCostUsd: typeof row.icon_cost_usd === "number" ? row.icon_cost_usd : null,
    iconDurationMs: typeof row.icon_duration_ms === "number" ? row.icon_duration_ms : null,
  };
}

export const dbListAppMessages = (appId: string): AppEditMessage[] =>
  db
    .query<MessageRow, [string]>(
      "SELECT * FROM app_edit_messages WHERE app_id = ? ORDER BY created_at ASC, rowid ASC",
    )
    .all(appId)
    .map(toMessage);

export const dbAddAppMessage = (data: {
  id: string;
  appId: string;
  role: AppEditRole;
  content: string;
  modelKey?: string | null;
  costUsd?: number | null;
  durationMs?: number | null;
  iconModelKey?: string | null;
  iconCostUsd?: number | null;
  iconDurationMs?: number | null;
}): void => {
  const now = new Date().toISOString();
  db.query(
    `INSERT INTO app_edit_messages
      (id, app_id, role, content, created_at, model_key, cost_usd, duration_ms,
       icon_model_key, icon_cost_usd, icon_duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.id,
    data.appId,
    data.role,
    data.content,
    now,
    data.modelKey ?? null,
    data.costUsd ?? null,
    data.durationMs ?? null,
    data.iconModelKey ?? null,
    data.iconCostUsd ?? null,
    data.iconDurationMs ?? null,
  );
};
