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

## Game audio and guidance

- Serialize narration centrally in the audio engine and guard child input at Stage capture phase using synchronous narration state; this prevents every activity from restarting speech while preserving parent controls.
- Render one shared rocket guide in Stage and locate answers via `data-answer-hint`; measuring the real element keeps landings aligned across layouts.
- All manual and automatic guidance acquires the shared synchronous hint lock until landing feedback ends; this prevents child input and overlapping demonstrations while preserving parent controls.
- The Android download entry must state unavailability until a real signed APK is supplied and served from a same-origin app asset; never substitute a manifest, ZIP or browser installation for an APK.
- Expose manual hints through Stage's light bulb and semantic source/target/slot attributes in each activity; matching slot keys demonstrate a correct drag without completing it for the child.
- Extend the shared drag and tap engines for bonus levels and reuse recorded English words; this keeps new activities consistent with existing input protection and narration.
- Generate only missing voice keys and preserve existing manifest entries; this avoids replacing approved recordings or losing variations.
