<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## App identity

- The app's installed/branding assets live in `public/` (`favicon.ico`, `apple-touch-icon.png`, `icons/*.png`, `manifest.webmanifest`) and are declared in the root route's `head()`; keep them there rather than bundling them through the build, because the browser and the launcher fetch them by literal path before any app code runs.
- Icons are generated from the cover photo cropped tightly on the child's face, not from the full scene: the wide scene loses the face at 48 px. Regenerate every size from one square crop so the icon stays consistent, and keep a `maskable` variant with the subject inside the 80% safe zone.
