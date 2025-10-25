# Theme variables and usage

This project uses CSS variables to drive all theme-aware styles. Avoid `isDark` branching in components; prefer variables from `globals.css`.

Key variables:

- Colors
  - `--background`, `--foreground`
  - `--muted-text` (secondary text)
  - `--panel-bg`, `--panel-border`
  - `--axis-tick`, `--grid-stroke`, `--ref-line` (charts)
  - `--tooltip-bg`, `--tooltip-border`, `--tooltip-fg`
  - `--chip-border`, `--btn-active-bg`, `--btn-active-fg`, `--btn-inactive-fg`, `--btn-hover-bg`
  - `--line-too-dark-fallback`, `--line-too-light-fallback`, `--brand-grok-4-stroke` (chart line fallbacks)
  - `--table-row-alt`, `--link-hover`
  - `--brand-accent`, `--header-bg`, `--header-border`

Components should:

- Use inline `style` with variables for color/border/background, e.g. `style={{ color: 'var(--muted-text)' }}`.
- Reuse `.chip-btn` for small toggle buttons, relying on `--btn-*` variables.
- Avoid hardcoded Tailwind color utilities for theme-dependent colors.
- For borders in tables, use a softer mix: `borderColor: 'color-mix(in oklab, var(--panel-border) 50%, transparent)'`.

Charts:

- All static chroming (ticks, grid, tooltip, panel) should use variables.
- For line stroke color visibility, use `getStrokeColor` which returns CSS variable fallbacks when colors are too dark/light.

Do not:

- Read `useTheme().resolved` in components solely for styling decisions.
- Remount components on theme switch; variables will update in place.

