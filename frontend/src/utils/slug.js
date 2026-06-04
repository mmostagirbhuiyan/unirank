/**
 * Generate a URL-safe slug from a university name.
 * e.g. "Massachusetts Institute of Technology" -> "massachusetts-institute-of-technology"
 */
export function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Find a university by its slug. Linear scan is fine for ~1750 items.
 */
export function findBySlug(universities, slug) {
  if (!slug || !universities.length) return null;
  return universities.find(u => toSlug(u.name) === slug) || null;
}
