# CourseForge — Design System

**Audience:** instructors creating and reviewing learning material.

**Design read:** an instructor-facing, Minecraft-inspired lesson workspace with a dark green canvas, contrasting warm work surfaces, and clear source and review status.

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
| Dark green canvas and text | `#09251C` | `--color-paper`, `--color-ink`, `--color-primary` |
| Brown primary action | `#A55704` | `--color-action`, `--color-accent` |
| Peach work surface, focus fill, and borders | `#F3D2AF` | `--color-surface`, `--color-surface-tint`, `--color-border`, `--color-action-hover` |
| Cream text and inset surfaces | `#F8EADC` | body text and input surfaces |
| Strong border | `#A55704` | `--color-border-strong` |

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
