/**
 * Which categories the storefront should surface.
 *
 * Categories come from the API and are managed in the admin panel, so nothing
 * here names a specific category. A category is shown in navigation, the
 * homepage rail and the footer once it is active, allowed in navigation and
 * actually holds products — an empty category would only lead a shopper to an
 * empty listing. Creating "Kurta Sets" or "Dupattas" in admin and adding
 * products is all it takes for them to appear everywhere.
 */
export function shoppableCategories(categories = []) {
  return categories.filter(
    (c) => c && c.isActive !== false && c.showInNav !== false && Number(c.productCount) > 0
  );
}

/** First shoppable category whose slug is in `slugs`, in the order given. */
export function findShoppableCategory(categories = [], slugs = []) {
  const available = shoppableCategories(categories);
  for (const slug of slugs) {
    const match = available.find((c) => c.slug === slug);
    if (match) return match;
  }
  return null;
}
