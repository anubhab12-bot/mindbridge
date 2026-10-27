import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every Mongoose schema must compile (guards against enum/const reflection pitfalls). */
function schemaFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return schemaFiles(p);
    return name.endsWith('.schema.ts') ? [p] : [];
  });
}

describe('mongoose schemas', () => {
  const files = schemaFiles(join(import.meta.dirname, '..', 'modules'));
  it('finds schema files', () => expect(files.length).toBeGreaterThan(15));
  it.each(files)('%s compiles', async (file) => {
    await expect(import(file)).resolves.toBeDefined();
  });
});
