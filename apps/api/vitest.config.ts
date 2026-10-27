import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// SWC is used instead of esbuild because NestJS dependency injection and Mongoose
// schemas rely on `emitDecoratorMetadata`, which esbuild does not support.
export default defineConfig({
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
  },
});
