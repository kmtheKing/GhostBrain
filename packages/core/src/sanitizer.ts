/**
 * Sanitizes raw user input into safe SQLite FTS5 query format.
 * Each alphanumeric token is double-quoted to eliminate syntax errors.
 */
export function sanitizeFtsQuery(raw: string): string {
  if (!raw || typeof raw !== 'string') return '""';

  const tokens = raw
    .replace(/[^\p{L}\p{N}_-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(token => token.length > 0);

  if (tokens.length === 0) return '""';

  return tokens.map(t => `"${t}"`).join(' ');
}
