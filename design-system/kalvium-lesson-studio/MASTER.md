# Kalvium Lesson Studio — Design System

**Audience:** instructors creating and reviewing learning material.

**Design read:** an instructor-facing research workspace with a calm, editorial feel and clear source and review status.

**Design dials:** variance 4/10, motion 2/10, density 5/10.

## Product principles

- Keep the lesson brief and the next action immediately clear.
- Make research references easy to inspect.
- Treat factual and instructional QC as separate review stages.
- Keep the instructor in control of edits and recommendations.
- Use realistic lesson content and source descriptions, never filler copy.

## Tokens

| Role | Value | CSS variable |
| --- | --- | --- |
| Ink | `#193B37` | `--color-ink` |
| Secondary ink | `#42615B` | `--color-ink-soft` |
| Muted text | `#65746F` | `--color-muted` |
| Primary action | `#235E52` | `--color-primary` |
| Primary hover | `#18483F` | `--color-primary-hover` |
| Primary tint | `#E8F1EC` | `--color-primary-soft` |
| Page background | `#F5F6F3` | `--color-paper` |
| Surface | `#FFFFFF` | `--color-surface` |
| Surface tint | `#F1F5F1` | `--color-surface-tint` |
| Border | `#DCE4DE` | `--color-border` |
| Strong border | `#C5D2CA` | `--color-border-strong` |
| Error | `#A63A34` | `--color-error` |

## Typography and spacing

- Use Geist through `next/font` for a consistent, self-hosted sans-serif UI.
- Body text starts at 16px with a 1.5–1.65 line height.
- Establish hierarchy with size, weight, and spacing; keep paragraph line lengths readable.
- Use a 4px spacing base: 4, 8, 12, 16, 24, 32, and 48px.
- Use restrained borders and soft surfaces. Reserve elevation for overlays that need it.

## Components and interaction

- Use one prominent primary action per screen; keep sample and utility actions secondary.
- Inputs always have visible labels, helper text when useful, and nearby validation messages.
- Keep focus indicators visible and keyboard order aligned with the screen.
- Do not use color alone to show state; pair it with a label or explanation.
- Keep motion subtle, brief, and disabled or reduced for `prefers-reduced-motion`.
- Avoid marketing-page patterns, decorative gradients, emoji icons, and hover movement that shifts layout.

## Responsive behavior

- Prioritize the brief and its primary action on narrow screens.
- Collapse side panels below the main form instead of forcing horizontal scrolling.
- Keep interactive controls comfortable to use with touch and keyboard.
- Check layouts at 375px, 768px, 1024px, and 1440px.
