# AGENTS.md (pdf project)

This file gives coding agents project-specific guidance for the `pdf/` subproject.

## Scope

- Applies to files under `pdf/`.
- Primary responsibility: convert Markdown chapters to Typst and compile PDF output through the mdBook typst backend.

## What this project does

- `md2typ.ts` converts Markdown into Typst content.
- `mdbook-typst.ts` integrates conversion into mdBook rendering.
- `template.typ` defines global Typst styling and document layout.
- `helpers.typ` defines callable Typst functions/symbols shared between the template and generated chapter modules.

## Key commands

Run from repository root unless noted otherwise.

- Full regenerate and compile:
  - `rm -rf book/typst/*.typ && mdbook build && typst compile book/typst/main.typ`
- Quick converter check from `pdf/`:
  - `printf '| A | B |\n|---|---|\n| 1 | 2 |\n' | deno run -A md2typ.ts`

## Typst scoping model (important)

- `#show` / `#set` rules in `template.typ` **do** propagate into files brought in via `#include`.
- `#let` bindings and `#import`ed names in `template.typ` **do NOT** propagate into included files — each included file is its own module.
- Symptom when violated: errors like `unknown variable: toprule` in a chapter that calls a helper defined only in `template.typ`.

### Design pattern used here

- `helpers.typ` is the single source of truth for every callable function/symbol that generated chapter content references (e.g. booktabs `toprule`, `midrule`, `bottomrule`, plus custom helpers like `fit_to_available`).
- `template.typ` does `#import "helpers.typ": *` for its own use, and keeps only show/set rules, page layout, and `#include` statements.
- `md2typ.ts` unconditionally prepends `#import "helpers.typ": *` to every generated chapter, so chapters compile as self-contained modules.
- `mdbook-typst.ts` copies both `template.typ` (as `main.typ`) and `helpers.typ` into the output directory.

### Practical rule of thumb

- **Style defaults** (show/set rules, page setup): put in `template.typ`.
- **Callable macros / functions / constants** that generated chapters reference directly: put in `helpers.typ` (and re-export package symbols from there once, instead of detecting usage in `md2typ.ts`).
- Adding a new helper should require editing only `helpers.typ` — no per-symbol detection in the TS converter.


## Editing guidelines

- Prefer minimal, targeted edits in `md2typ.ts` and `template.typ` and `helpers.typ`.
- Keep style decisions centralized in `template.typ` when possible.
- Keep structure/semantic emission in `md2typ.ts`.

## Validation checklist after changes

1. Run `mdbook build` and confirm typst backend completes.
2. Run `typst compile book/typst/main.typ` and confirm no Typst errors.
3. Spot-check one generated chapter in `book/typst/` for expected output.

## Notes

- The workspace may contain generated files under `book/typst/`; do not edit those generated files, just regenerate after an edit.
