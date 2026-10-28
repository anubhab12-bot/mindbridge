# ADR-0004: Vitest with SWC for API tests

- Status: Accepted
- Date: 2026-10-27

## Context

The API is ESM-only (NestJS 12). Jest's ESM support is still experimental, and Nest's decorators
need `emitDecoratorMetadata`, which esbuild does not emit.

## Decision

Use Vitest with `unplugin-swc` for unit tests (`*.spec.ts`) and end-to-end tests (`test/*.e2e-spec.ts`, Supertest against real MongoDB and Redis).

## Consequences

- Fast tests with native ESM, and a Jest-compatible API.
- SWC writes the runtime *value* of a type alias into decorator metadata. For a shared `as const` enum type that value is the enum object, so every Mongoose `@Prop` with `enum:` must also declare `type: String`. `src/common/schemas.spec.ts` checks this.
