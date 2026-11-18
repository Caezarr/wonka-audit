// @ts-check
// Display helpers shared by every report renderer.

/**
 * Format a 0..1 rate as a whole percentage; missing values render as "n/a".
 * @param {number | null | undefined} v
 * @returns {string}
 */
export function pct(v) {
  return v === null || v === undefined ? "n/a" : `${Math.round(v * 100)}%`;
}

/**
 * Turn a snake_case key into a Title Case label.
 * @param {unknown} value
 * @returns {string}
 */
export function label(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Escape a value for HTML text and attribute contexts.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
