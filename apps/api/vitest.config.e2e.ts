import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// End-to-end tests boot the full Nest application against a real MongoDB (MONGO_URI_TEST)
// and Redis. They run in CI with service containers and locally via Docker Compose.
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
