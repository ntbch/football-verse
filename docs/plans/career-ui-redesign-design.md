# Career UI Redesign

**Status:** Implemented  
**Date:** 2026-07-11

## Goal

Redesign only Career Mode into a desktop-first football management interface inspired by FM26's efficiency, familiarity, predictability, Portal, and tile-to-card ideas. Keep Football Verse branding and existing Career behavior/APIs.

## Decisions

- Use a Career-only shell; public news and forum pages remain unchanged.
- Use a fixed left sidebar instead of FM26's top navigation.
- Sidebar is 240px expanded and about 72px collapsed; remember the choice locally.
- On mobile, replace the sidebar with a dismissible drawer.
- Keep the current query/tab navigation model for the first release.
- Make Portal the default Career screen.
- Prioritize fewer clicks over maximum information density or decorative visuals.
- Reuse existing data, components, styles, and dependencies.

## Information Architecture

Sidebar order:

1. Portal
2. Fixtures
3. Squad
4. Tactics
5. Transfers
6. Table
7. Manager
8. History

The sidebar header shows Football Verse, the managed club, and current season. Its footer contains return-to-site, account access, and collapse control. The active item uses `aria-current`, a brand-colored background, and a visible accent. Collapsed items retain accessible labels and tooltips.

The content area has a compact contextual header: screen title, current matchday, next fixture, and at most one primary action. URLs preserve the selected section with `?tab=` so refresh and sharing retain context.

## Portal

Portal replaces the current Overview and uses a 12-column desktop grid. Its priority order is:

1. Blocking decisions and required actions.
2. Next fixture.
3. Squad, finance, transfer, or manager warnings.
4. Reference information.

Core tiles are Action Required, Next Fixture, Two-Week Calendar, and Club Situation. A tile contains only enough information to decide whether to inspect it. Selection opens a right-side detail panel on desktop and a bottom sheet on mobile. When a full screen already exists, the card offers a preview and a link instead of duplicating behavior.

## Specialist Screens

Existing screens keep their business logic but share a consistent frame: contextual header, optional toolbar, primary content, and contextual detail panel.

- Squad: denser table, sticky header, clear selection.
- Tactics: pitch first; formation and instructions adjacent to it.
- Transfers: market and club activity remain within the current state model.
- Fixtures: grouped by matchday with the managed club emphasized.
- Table: simple sticky-header table with the managed club highlighted.
- Manager: pressure, achievements, and AI manager profiles use the shared tile/card language.

## Visual System

Keep Football Verse's light palette and clay-red brand accent, but make Career feel like a management workspace: sans-serif data text, tighter spacing, smaller radii, restrained shadows, and stable surfaces. Green, amber, and red communicate status but never without text or icons.

Animations last 150–200ms and respect `prefers-reduced-motion`. Loading skeletons reserve tile dimensions. A tile-level failure remains local and exposes retry without blanking the page.

## Responsive and Accessibility

- Desktop-first; mobile uses a single content column.
- Wide tables scroll horizontally when they cannot be safely reduced.
- `Escape` closes drawers and panels; focus returns to the opener.
- Use native links and buttons, visible focus, readable contrast, and meaningful labels.
- Mobile drawer closes after navigation and traps focus while open.

## Implementation Plan

1. Add the Career sidebar/drawer to the existing shell and connect it to the current query/tab state.
2. Convert Overview into Portal using data already loaded by the Career page.
3. Add shared Career workspace styles and normalize specialist screen headers/toolbars.
4. Verify sidebar state, refresh-safe tabs, keyboard focus, mobile drawer, Portal links, and existing Career actions.

## Explicitly Deferred

- Global game search.
- Custom bookmarks.
- FMPedia-style glossary.
- New inbox/domain model.
- Splitting every Career section into its own route.
- New UI dependencies or backend endpoints.

## Success Criteria

- Every Career section is reachable from the sidebar in one click.
- Refresh preserves the selected section.
- Portal exposes the next required action and next fixture without scrolling on a typical desktop viewport.
- Existing Career flows and APIs remain functional.
- Sidebar and mobile drawer are keyboard accessible.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`
- `git diff --check`

## Reference

FM26 UI principles and Portal concepts: https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface
