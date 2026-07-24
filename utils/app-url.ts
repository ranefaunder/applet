export function appPageUrl(_lang: string, slug: string): string {
  return `/${slug}`;
}

export function appModuleUrl(_lang: string, slug: string): string {
  return `/${slug}/module.js`;
}

export function appEditUrl(lang: string, slug?: string): string {
  return slug ? `/${lang}/edit/${slug}` : `/${lang}/edit`;
}

/**
 * SPA router scope. Site pages under /{lang}/ are handled client-side, plus the
 * app edit views (/{lang}/edit and /{lang}/edit/{slug}). The bare app run page
 * (/{lang}/app/{slug} or /{slug}) is excluded so it does a full page load to the
 * standalone server-rendered runtime.
 */
export function spaRouterScope(lang: string): RegExp {
  return new RegExp(`^/${lang}/(?!app/[^/]+$)`);
}
