# Design System

<!-- impeccable:design-schema 1 -->

## Visual Direction

Atlassian/Jira-inspired professional design system. Clean, functional, readable. Light theme only (no dark mode) to ensure consistent rendering across all devices regardless of OS settings.

## Color Tokens

### Brand
- `--brand-700` / `brand-700`: #0052CC (primary actions, links, active states)
- `--brand-800` / `brand-800`: #0747A6 (hover states)
- `--brand-900` / `brand-900`: #003884 (active/pressed states)
- `--brand-50` / `brand-50`: #E9F2FF (selected backgrounds, subtle highlights)
- `--brand-100` / `brand-100`: #CCE0FF (hover backgrounds)

### Neutral (Text & Surfaces)
- `neutral-1000`: #172B4D (primary text, headings)
- `neutral-900`: #253858 (strong text)
- `neutral-800`: #42526E (secondary text)
- `neutral-700`: #505F79 (labels)
- `neutral-600`: #6B778C (muted text, placeholders - WCAG AA on white)
- `neutral-500`: #A5ADBA (disabled text)
- `neutral-400`: #C1C7D0 (borders, dividers on colored surfaces)
- `neutral-300`: #DFE1E6 (borders, dividers)
- `neutral-200`: #EBECF0 (subtle borders)
- `neutral-100`: #F4F5F7 (background)
- `neutral-50`: #FAFBFC (elevated background)

### Status/Semantic
- `atlassian-green` / `atlassian-green-light`: #36B37E / #E3FCEF (success, verified, done)
- `atlassian-yellow` / `atlassian-yellow-light`: #FFAB00 / #FFFAE6 (warning, late, in-progress)
- `atlassian-red` / `atlassian-red-light`: #FF5630 / #FFEBE6 (error, danger, rejected)
- `atlassian-purple` / `atlassian-purple-light`: #6554C0 / #EAE6FF (info, project badges)
- `atlassian-blue` / `atlassian-blue-light`: #0052CC / #E9F2FF (brand, in-progress)

## Typography

### Font Stack
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`

### Scale
- Display: 1.5rem (24px), font-semibold
- Heading 1: 1.25rem (20px), font-semibold
- Heading 2: 1rem (16px), font-semibold
- Body: 0.875rem (14px), font-normal
- Small: 0.75rem (12px), font-normal
- Caption: 0.6875rem (11px), font-semibold uppercase tracking-wide

### Text Colors
- Primary: `text-neutral-1000` (#172B4D)
- Secondary: `text-neutral-600` (#6B778C) - contrast ratio 4.7:1 on white
- Muted/Placeholder: `text-neutral-600` or `placeholder-neutral-500`
- Inverse: `text-white` on colored backgrounds
- Links: `text-brand-700` hover `text-brand-800`
- Error: `text-atlassian-red` (#FF5630)

## Components

### Cards
- Background: `bg-white`
- Border: `border border-neutral-200`
- Shadow: `shadow-atlassian-sm`
- Radius: `rounded-atlassian` (3px)

### Inputs
- Base: `bg-neutral-50 border-neutral-300 text-neutral-1000 placeholder-neutral-500`
- Focus: `focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100`
- Class: `.atlassian-input`

### Buttons
- Primary: `bg-brand-700 text-white hover:bg-brand-800`
- Secondary: `bg-neutral-200 text-neutral-800 hover:bg-neutral-300`
- Danger: `bg-atlassian-red text-white hover:bg-red-600`
- Ghost: `bg-transparent text-neutral-700 hover:bg-neutral-200`
- Link: `text-brand-700 hover:underline`

### Badges/Lozenges
- Status badges use semantic colors with light backgrounds
- Text: 11px uppercase, font-semibold, tracking-wide
- Padding: `px-2 py-0.5`
- Radius: `rounded-atlassian`

### Links
- Inline: `text-brand-700 hover:text-brand-800 hover:underline`
- Danger: `text-atlassian-red hover:underline`

## Layout

### Spacing Scale
4, 8, 12, 16, 20, 24, 32, 48, 64px (Tailwind: 1, 2, 3, 4, 5, 6, 8, 12, 16)

### Breakpoints
- Mobile: < 640px (default styles)
- Tablet: 640px - 1023px (sm/md)
- Desktop: ≥ 1024px (lg+)

### Safe Areas
- PWA standalone mode: respect `env(safe-area-inset-*)` for notch/home indicator
- Mobile nav: must not overlap page content

### Sidebar
- Width: 240px (desktop), full-width drawer (mobile)
- Background: white
- Border: `border-r border-neutral-200`

## Dark Mode Policy

**Light theme only.** The app enforces `color-scheme: light` on the html element to ensure native form controls (select, input, textarea) render consistently regardless of OS dark mode setting. All `dark:` Tailwind variants have been removed. This eliminates the mixing issue where OS dark mode would apply partial dark styling.

## Contrast Requirements

All combinations must meet WCAG AA (4.5:1 body, 3:1 large text/UI):

| Text Type | Color | Background | Ratio |
|-----------|-------|------------|-------|
| Body | neutral-1000 (#172B4D) | white | 12.6:1 |
| Secondary | neutral-600 (#6B778C) | white | 4.7:1 |
| Placeholder | neutral-500 (#A5ADBA) | neutral-50 | 3.4:1 |
| Link | brand-700 (#0052CC) | white | 7.5:1 |
| Error | atlassian-red (#FF5630) | white | 4.5:1 |
