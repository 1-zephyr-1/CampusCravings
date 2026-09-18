"use client";

import { translations, type TranslationKey } from "./strings";

/**
 * Tiny client-side translation hook.
 *
 * Returns:
 *   - `t(key, vars?)`: resolves a string from the central table.
 *     Missing keys fall back to the dot-path itself so they're easy to spot
 *     in the UI ("feed.title" instead of an empty label) during the rollout.
 *   - `locale`: the active locale code. Always "en" for now.
 *
 * Supports `{name}` interpolation: pass `{ name: "Amma's Kitchen" }` and the
 * `{name}` placeholder in the translation is replaced. Unknown placeholders
 * are left in place so the QA pass can see what's missing.
 *
 * When a real i18n backend lands, swap this file's body for a context-backed
 * provider; the `t` / `locale` shape stays the same so call sites don't need
 * to change.
 */
export function useTranslation() {
  const locale = "en" as const;

  function t(
    key: TranslationKey | string,
    vars?: Record<string, string | number>
  ): string {
    const template = (translations as Record<string, string>)[key];
    if (template === undefined) return key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match
    );
  }

  return { t, locale };
}

export type TranslationFn = ReturnType<typeof useTranslation>["t"];
export type Locale = ReturnType<typeof useTranslation>["locale"];
