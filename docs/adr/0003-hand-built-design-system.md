# ADR-0003: Hand-built design system

- Status: Accepted
- Date: 2026-10-27

## Context

A mental wellness app needs a calm, accessible, consistent UI with few dependencies. Component
libraries add bundle size and theming work, and they have their own upgrade cycle.

## Decision

Build a small SCSS design system (`apps/web/src/styles`) with CSS custom properties for colour,
spacing and type. Add a few shared components (toasts, confirm dialog, crisis panel) in
`shared/ui`.

## Consequences

- Smaller bundle, full control over contrast and focus styles, and no third-party UI upgrades.
- Accessibility of custom controls (dialogs, menus) is our responsibility and needs testing with a screen reader.
