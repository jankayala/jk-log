# Versioning

This guide describes the steps to publish a new version of `jk-log` to npm.

## Version numbering

`jk-log` follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking changes (e.g., API removal, changed behavior).
- **MINOR** — new features, backwards compatible.
- **PATCH** — bug fixes and backwards-compatible tweaks.

Every release is recorded in [CHANGELOG.md](./CHANGELOG.md) following the
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

## Prerequisites

- Node.js `>=18` (see `engines` in `package.json`).
- You are on `main` with a clean working tree.
- All changes are committed and the tests pass.

## Steps

### 1. Update the version in `package.json`

```sh
npm version <newversion> --no-git-tag-version
```

For example:

```sh
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

or set the exact version directly:

```sh
npm version 2.1.4 --no-git-tag-version
```

This bumps the `version` field in `package.json` and `package-lock.json`.

> `--no-git-tag-version` prevents `npm` from creating a commit and tag
> automatically, so you can group the version bump with the changelog update
> and dependency changes in a single commit.

### 2. Update `CHANGELOG.md`

Add a new entry at the top of the file, below the header:

```md
## [v2.1.4] - 2026-08-08

### Added

- ...

### Changed

- ...

### Fixed

- ...
```

- Use the `v`-prefixed version and today's ISO date (`YYYY-MM-DD`).
- Group changes under `Added`, `Changed`, and `Fixed` headings. Omit sections
  that have no entries.

### 3. Install dependencies (if any changed)

If `package.json` dependencies changed, run:

```sh
npm install
```

to sync `package-lock.json`.

### 4. Verify the build, formatting, and tests

```sh
npm run build
npm run format
npm test
```

Make sure the build succeeds, files are Biome-formatted, and all tests pass.

### 5. Commit the changes

```sh
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 2.1.4"
```

Use a `chore: bump version to <version>` message matching the repo's commit style.

### 6. Push to GitHub

```sh
git push origin main
```

### 7. Publish to npm

```sh
npm publish
```

Because the package ships both ESM and CJS builds, ensure the `dist/` folder is
up to date before publishing (the build step in step 4 does this). The package
is published from `main`; the `files` field in `package.json` controls what is
included in the npm tarball (`dist`, `README.md`, `LICENSE`).

> To publish a preview first, use `npm publish --dry-run` to inspect the
> tarball contents before actually publishing.

### 8. Create a git tag

After publishing, tag the release commit:

```sh
git tag v2.1.4
git push origin v2.1.4
```

## Quick checklist

- [ ] `package.json` version bumped
- [ ] `CHANGELOG.md` updated with the new version and date
- [ ] `package-lock.json` in sync
- [ ] `npm run build` passes
- [ ] `npm run format` applied
- [ ] `npm test` passes
- [ ] Changes committed and pushed
- [ ] `npm publish` completed
- [ ] Git tag `v<version>` created and pushed
