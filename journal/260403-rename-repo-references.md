# Rename repo references from documentation-ui to unified-documentation-webapp

The remote repository was renamed from `documentation-ui` to `unified-documentation-webapp`. After updating the git remote, all internal references to the old name needed updating to keep CI/CD, Docker, and documentation consistent.

## Changes

- **GitHub Actions workflow** (`.github/workflows/build-and-push.yml`): Updated `IMAGE_NAME` to push to `ghcr.io/johnmathews/unified-documentation-webapp`
- **docker-compose.yml**: Updated service name, image reference, and container name from `documentation-ui` to `documentation-webapp` / `unified-documentation-webapp`
- **package.json / package-lock.json**: Updated package name to `unified-documentation-webapp`
- **README.md**: Updated service table and GHCR image reference
- **docs/development.md**: Updated Docker build/run examples
- **docs/architecture.md**: Updated deployment section service name

## Notes

- Journal entries were left unchanged since they are historical records
- The `displaySource("documentation-ui")` test case in `titles.test.ts` was kept as-is — it tests the acronym "UI" handling, not the repo name
- The first CI push after this change will create a new GHCR package under the new name; the old `documentation-ui` package on GHCR can be deleted manually
