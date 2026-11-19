# UI Components

## Style links as buttons with `ButtonLink`, never through `Button`

Applies to: `src/**/*.tsx`

Base UI's `Button` enforces button semantics (`role="button"`, Space and Enter
activation, disabled handling), so a navigation link must not be rendered
through its `render` prop. Use `<ButtonLink to="/recipes">` for in-app routes
and `<ButtonLink href="/recipes">` for full reloads and in-page hashes; both
live in `src/components/primitives.tsx` and share `buttonVariants` with
`Button`. Keep `Button` for elements that fire handlers or submit forms.

`buttonVariants` lives in `src/components/ui/button-variants.ts` so
`button.tsx` exports only a component, which keeps the React Fast Refresh lint
rule satisfied.

## Keep local-storage language in three places only

Applies to: `src/**/*.tsx`

Reassurance that data lives in the browser appears only on the About page, in
the site footer, and in delete confirmations. Other copy describes the user's
kitchen and outcomes without naming browsers, devices, storage keys or
persistence mechanics. Backup copy names a single file to keep and restore, not
its format. Storage usage rows use friendly section names, never raw keys.
