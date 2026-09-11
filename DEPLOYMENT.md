# Current GitHub Pages deployment

The production site at https://amirzeinali.github.io/Proof-of-Workflow/ is the
prebuilt editorial revision supplied in `proof-of-workflow-deploy.zip` on
September 11, 2026. GitHub Actions publishes the contents of `deploy/` and
verifies their SHA-256 hashes before uploading them.

The supplied ZIP was truncated during `deploy/proof-of-workflow-main.webp`,
before its editable `source/` section. The missing image was recovered from a
local copy of the self-contained preview whose SHA-256 matches the original
package manifest:

`1bd5c50e96881c5d1d8aed5a84065af5bfd20c24c3b389f23628d57f48c462d7`

At the initial import, all twelve deployment files matched the original package
checksums, with no application code, design, copy, links, fonts, or animation
behavior modified. This uses the prebuilt deployment alternative described in
the supplied README-DEPLOY.md.

## Subsequent adjustments

On September 11, 2026, the verifier speech bubble was given three explicit
positions: top-left for Outside, top-center for Alongside, and top-right for
Inside. Its horizontal offsets are 0, 168.5, and 337 in the 760-unit canvas,
using the existing smooth transition and keeping the pointer anchored to the
verifier. This replaces the initial small Inside-only nudge. On narrow screens,
the canvas and caption now fit the available width instead of overflowing at
a fixed 500 pixels, so the top-right bubble stays visible.

These targeted changes are applied directly to the supplied bundles because
their editable source is missing. Asset filenames and deployment checksums
were refreshed.

The same day, the scroll-led figures were retimed so each initial state is
visible before its animation begins. Desktop figures begin only after reaching
their settled reading position, mobile figures wait until fully visible, and
each animation receives a longer scroll range. Consecutive figures have a rest
between their active ranges, with additional separation between the market pie
and the compounding figure. The magnifier-to-coding transition now follows most
of the intervening text: the magnifier fades first, then the coding target
builds gradually with the three coding examples. Paragraph and case spacing was
also increased for readability.

A later September 11 adjustment replaces the figure timing heuristic with
explicit native sticky scroll intervals. A figure is fully visible before its
progress begins; its panel stays in place through the animation and a short
completed-state hold, then normal page movement resumes. On narrow screens,
the main figures pin after their introductory copy. The additional styles are
kept in the `scroll-scenes-*.css` deployment asset. Reduced-motion preferences
continue to show completed figures without the extra pinning intervals.

The evaluator story keeps its original paragraphs in normal flow and shares a
single sticky figure. Only the Alongside, Inside, and coding transitions add
scroll intervals; their current text stays fixed until each transition ends.
On mobile, that text pins below the figure and the contents bar. The Outside
case and the explanatory transition paragraph keep ordinary scrolling.

The last feedback-loop figure again uses the earlier source's four causal
cycles: arrow arrivals grow intelligence, organizations, and utility in turn,
instead of filling all three continuously. Its current geometry and palette
are preserved. The eight header counters now use distinct starting values,
and the visible Play/Pause animation control was removed.

The existing React source in the repository is preserved, but it represents the
previous site and is not the source of this deployed revision. Obtain a complete
copy of the handoff's `source/` directory before resuming source-based builds.
Do not rebuild the old source to redeploy this revision.

The only Pages workflow is `.github/workflows/pages.yml`. It publishes `deploy/`
on pushes to `main` or manual dispatch. Pages remains configured for GitHub
Actions. The independent `Proof-of-Workflow-old` repository is unaffected.
