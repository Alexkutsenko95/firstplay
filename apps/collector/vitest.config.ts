import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Wrangler refuses to start a Hyperdrive binding without a local connection string. The tests give the app
// an in-memory store, so the binding only has to exist and is never dialled.
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??= 'postgres://test:test@127.0.0.1:5432/unused';

// Tests run inside workerd, the same runtime as production.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
});
