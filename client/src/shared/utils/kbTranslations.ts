// A category has one canonical (English) `title` plus optional per-language
// overrides in `translations` (e.g. { pt: "Configurações", es: "Configuración" }).
// Falls back to the canonical title whenever the requested language has no
// override set, so a partially-translated category never shows a blank name.
export function resolveCategoryTitle(
  category: { title: string; translations?: Record<string, string> | null },
  language: string,
): string {
  return category.translations?.[language] || category.title;
}

// Same fallback convention as resolveCategoryTitle, for subcategories.
export function resolveSubcategoryTitle(
  subcategory: { title: string; translations?: Record<string, string> | null },
  language: string,
): string {
  return subcategory.translations?.[language] || subcategory.title;
}
