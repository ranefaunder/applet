export type CodeReplacement = {
  old: string;
  new: string;
  replaceAll?: boolean;
};

export type ApplyReplacementsResult =
  | { ok: true; code: string }
  | { ok: false; reason: string };

/** Count non-overlapping occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    count++;
    from = idx + needle.length;
  }
  return count;
}

/**
 * Apply exact search/replace patches in order.
 * Without replaceAll, `old` must occur exactly once.
 */
export function applyReplacements(
  source: string,
  replacements: CodeReplacement[],
): ApplyReplacementsResult {
  let code = source;
  for (let i = 0; i < replacements.length; i++) {
    const { old: oldStr, new: newStr, replaceAll } = replacements[i]!;
    if (!oldStr) {
      return { ok: false, reason: `Replacement ${i + 1}: empty old string` };
    }
    const hits = countOccurrences(code, oldStr);
    if (hits === 0) {
      return { ok: false, reason: `Replacement ${i + 1}: old string not found` };
    }
    if (!replaceAll && hits !== 1) {
      return {
        ok: false,
        reason: `Replacement ${i + 1}: old string found ${hits} times (need unique match or replaceAll)`,
      };
    }
    if (replaceAll) {
      code = code.split(oldStr).join(newStr);
    } else {
      code = code.replace(oldStr, newStr);
    }
  }
  return { ok: true, code };
}
