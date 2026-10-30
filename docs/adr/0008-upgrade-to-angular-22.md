# ADR-0008: Upgrade the web app to Angular 22

- Status: Accepted
- Date: 2026-10-28
- Supersedes: [ADR-0002](0002-angular-21.md)

## Context

With Angular 21 (`@angular/build` 21.2.24 to 21.2.28), `ng build` wrote a complete bundle but the
process never exited. The esbuild service child process stayed alive, so GitHub Actions CI and the
Render Docker build hung until they were cancelled. Angular fixed this upstream in
`@angular/build` 22.1.0-next.3 ("prevent esbuild service hang on internal component stylesheet
builds"). No fix exists in the 21.x line. CI and the Docker images can use Node 22.22.3 or later, which removes the
reason for ADR-0002.

## Decision

Upgrade to Angular 22 with `ng update`. Keep the pre-22 behaviour where the migrations offer it:
components get `ChangeDetectionStrategy.Eager`, `HttpClient` keeps the XHR backend, and two new
extended diagnostics are suppressed. The web build image moves to `node:22.23-alpine`.

## Consequences

- `ng build` exits normally (about 5 seconds locally). All 13 web unit tests pass.
- Local development needs Node 22.22.3 or later.
- The migrations also reformatted the component files they touched.
