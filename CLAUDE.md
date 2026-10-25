# bigquery-client
- Commands: npm ci, npm run build, npm test, npm run lint
- Tests must never call real BigQuery/GCP (queries cost money). Mock at the
  @google-cloud/bigquery boundary or use the BigQuery emulator.
- Exports in src/index.ts and method return shapes are a semver contract: additive
  changes only in 1.x. Breaking ideas go in a "Deferred to 2.0" list.
- Never run npm publish, npm version, or push tags locally. Releases are automated: every push to
  main runs .github/workflows/release.yml (semantic-release), which picks the version from
  conventional commit messages (fix: patch, feat: minor, BREAKING CHANGE major; docs/chore/test
  publish nothing), publishes to npm and tags. Commit and PR-title prefixes therefore decide the
  version: use them deliberately. Do not hand-edit the version in package.json.
- Local branches and commits are allowed when asked. Never push.
- README/JSDoc/CHANGELOG claims must match tested behavior. If you can't verify a claim, remove it.
- Before finishing a phase: npm pack --dry-run to check package contents.
