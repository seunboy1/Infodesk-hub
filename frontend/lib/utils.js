/**
 * Ensure URL has a protocol prefix.
 * If the URL doesn't start with http:// or https://, prepends https://
 */
export function ensureProtocol(url) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}
