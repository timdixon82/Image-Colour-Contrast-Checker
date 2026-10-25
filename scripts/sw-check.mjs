// Guards the generated service worker. public/sw.js is produced by
// scripts/copy-models.mjs (install, predev, prebuild). If it is missing or
// still holds template placeholders, cross-origin isolation is silently lost
// and OCR fails with only a console error, so the build must fail loudly.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIX = 'Run "npm run build" (not "npx vite build") or "node scripts/copy-models.mjs" first.';

/**
 * @param {string} dir Folder that should contain sw.js (dist/ or public/).
 * @returns {string | null} A description of the problem, or null when sw.js is fine.
 */
export function swProblem(dir) {
  const file = join(dir, 'sw.js');
  if (!existsSync(file)) return `${file} is missing. ${FIX}`;
  const text = readFileSync(file, 'utf8');
  if (text.trim() === '') return `${file} is empty. ${FIX}`;
  const left = text.match(/__[A-Z_]+__/);
  if (left) return `${file} still contains the unreplaced placeholder ${left[0]}. ${FIX}`;
  return null;
}
