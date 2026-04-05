Artifact drop folder

Put the newest launcher and client artifacts in this folder before you deploy.

Recommended names:
- `AuraLauncher.exe`
- `Aura.jar`

Build/deploy behavior:
- `npm run build` and `npm run vercel-build` auto-refresh `artifacts/release-metadata.env`
- the newest launcher is copied to `public/downloads/AuraLauncher.exe`
- API download endpoints read artifact metadata from `artifacts/release-metadata.env`

If you drop files with different names, the build will still pick the newest `.exe` and newest `.jar` from this folder.
