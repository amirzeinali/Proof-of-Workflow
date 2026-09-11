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

All twelve deployment files match the original package checksums. No application
code, design, copy, links, fonts, or animation behavior was modified. This uses
the prebuilt deployment alternative described in the supplied README-DEPLOY.md.

The existing React source in the repository is preserved, but it represents the
previous site and is not the source of this deployed revision. Obtain a complete
copy of the handoff's `source/` directory before resuming source-based builds.
Do not rebuild the old source to redeploy this revision.

The only Pages workflow is `.github/workflows/pages.yml`. It publishes `deploy/`
on pushes to `main` or manual dispatch. Pages remains configured for GitHub
Actions. The independent `Proof-of-Workflow-old` repository is unaffected.
