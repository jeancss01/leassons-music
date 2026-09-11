/**
 * Rewrites apiBaseUrl in environment.production.ts from API_BASE_URL.
 * Used by Cloudflare Pages: set API_BASE_URL to the Render service URL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBaseUrl = (process.env.API_BASE_URL ?? '').trim().replace(/\/$/, '');
const envFile = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/environments/environment.production.ts',
);

if (!apiBaseUrl) {
  console.warn(
    '[inject-api-base-url] API_BASE_URL not set; keeping placeholder in environment.production.ts',
  );
  process.exit(0);
}

if (!/^https:\/\//i.test(apiBaseUrl)) {
  console.error(
    `[inject-api-base-url] API_BASE_URL must be an https URL (got: ${apiBaseUrl})`,
  );
  process.exit(1);
}

const before = readFileSync(envFile, 'utf8');
const after = before.replace(
  /apiBaseUrl:\s*['"][^'"]*['"]/,
  `apiBaseUrl: '${apiBaseUrl}'`,
);

if (before === after) {
  console.error('[inject-api-base-url] Could not find apiBaseUrl to replace');
  process.exit(1);
}

writeFileSync(envFile, after);
console.log(`[inject-api-base-url] apiBaseUrl → ${apiBaseUrl}`);
