# Brief: 022-iccc-header-favicon

## Summary

Show the favicon image (`public/favicon.svg`) at the top left of the app header, beside the title. Triage type: small feature (UI, branding). Tim asked for it to be bundled into the next release.

Preamble fields:

- Status: `active`
- Branch: `feat/header-favicon`
- Mockup mode: not asked (small change; Tim named the exact result)
- Priority: 2
- Blockers: None

## Requirements

- Add the favicon image to the left of the h1 in `<header class="app-header">` in `index.html` (and `privacy.html` header if it shares the same header markup, to keep them consistent).
- The image is decorative next to the visible title: `alt=""` so a screen reader does not read it twice. Set width and height attributes to avoid layout shift.
- Use the existing `favicon.svg` file; do not hardcode colours. It must be legible against the header surface in all four themes (light, dark, muted-light, muted-dark). If the SVG colours fail non-text contrast of 3:1 on any header surface, report it to Sonja rather than changing the brand mark.
- Styling in `src/styles.css` with semantic tokens only; a 44px minimum is not needed (not interactive). Header must still wrap well at 320px width and at 200% zoom.
- Update any tests, `CLAUDE.md` header description if needed.

## Out of scope

- Redesigning the logo or the header layout.
- Making the image a link.

## Risk and rollback

Risk: layout shift, or poor contrast of the mark on a theme. Rollback: revert the merge commit.

## Definition of done

- [ ] Image shows top left in all four themes, `alt=""`, no layout shift
- [ ] Carol: function, axe AAA, 320px and 200% zoom, all four themes
- [ ] Lint, tests, build and CI green
- [ ] Tim approves the merge

## Approved GitHub actions

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch other than the main branch
- [x] Open a pull request
- [x] Comment on a pull request or an issue
- [x] Create an issue

## Not pre-approved

- Merging to the main branch. This always needs Tim's express approval at the time.
