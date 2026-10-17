# Phase4 repository isolation

The initial workspace was `/Users/mriduldabral/Downloads/Codex/Qloo`. Neither it nor its parent was a Git repository: no remote, branch, commit history or tracked changes existed. Its files were inspected before copying. A sibling project under the parent directory was not accessed or modified.

The isolated root is `/Users/mriduldabral/Downloads/Codex/Qloo/DermaLoop`. It has its own Git repository, branch main, no remote and no pushed commits. The parent project's source, credentials, original portrait, all private Phase3C/3F records and both durable markers remain in their original locations. A hash manifest outside this repository verifies their preservation. No private record or portrait was copied into the isolated root.

Source/config/tests and curated redacted evidence were copied by an explicit directory/file allowlist. Local dependencies were copied independently for offline validation; node_modules is ignored. The isolated `.env.local` contains only the public live=false toggle and is ignored. No provider credentials are needed or present for this public release.

Git ignores credential files, private directories, raster photos, captures/exports, caches, generated test artifacts and screenshots. A staged-file hook additionally rejects sensitive paths even if force-added; a dummy private file was force-staged, rejected by the guard and removed. The hook is local and explicitly bypassable by an operator; no Gitignore can prevent a deliberate override. Run `git config core.hooksPath .githooks` after cloning. Actual credential strings and the private successful task identifier were checked against isolated text files and were absent.

The only intentional public baseline derivative is `src/lib/verified-baseline.json`: four genuine raw/UI numbers plus provider/source/date labels. It was created by an explicit field allowlist from the saved genuine result. It excludes the complete private baseline, all provider identifiers, signed URLs, photo/capture data and consent records. The original private file remains outside this root. Git and hosting tools must target this isolated root, never its parent.

GitHub push remains subject to explicit user approval. No unrelated files were moved, deleted, committed or pushed.
