/** Edit-chat model choices (client + server). Default is always Flash. */
export const EDIT_AI_MODEL_FLASH = "flash" as const;
export const EDIT_AI_MODEL_PRO = "pro" as const;

export type EditAiModelKey = typeof EDIT_AI_MODEL_FLASH | typeof EDIT_AI_MODEL_PRO;

export const DEFAULT_EDIT_AI_MODEL: EditAiModelKey = EDIT_AI_MODEL_FLASH;

/** OpenRouter id for the optional Pro one-shot. */
export const EDIT_AI_MODEL_PRO_ID = "google/gemini-3.1-pro-preview";

export function isEditAiModelKey(value: unknown): value is EditAiModelKey {
  return value === EDIT_AI_MODEL_FLASH || value === EDIT_AI_MODEL_PRO;
}
