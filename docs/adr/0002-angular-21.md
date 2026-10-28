# ADR-0002: Angular 21

- Status: Accepted
- Date: 2026-10-27

## Context

Angular 22's CLI requires Node 22.22.3 or later. The build environment had Node 22.22.0, and CI uses
the Node 22 line.

## Decision

Use Angular 21 with standalone components, zoneless change detection, signals and strict templates.

## Consequences

- The code uses only APIs that carry forward to Angular 22. Upgrading is expected to be `ng update` plus a Node bump.
- Revisit this once every build environment is on Node 22.22.3 or later.
