<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4ed7f4b0-de10-4fc8-bc51-9ad2449fa3bb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Vercel Production (Aura)

Required for launcher download flow:

- `APP_URL=https://aura-client-sites.vercel.app`
- `DOWNLOAD_LINK_SECRET=<long random secret>`
- `LAUNCHER_ARTIFACT_PATH=artifacts/AuraLauncher.exe`
- `LAUNCHER_ARTIFACT_NAME=AuraLauncher.exe`
- `LAUNCHER_ARTIFACT_CONTENT_TYPE=application/vnd.microsoft.portable-executable`
- `LAUNCHER_VERSION=mega-webview-x64-20260329`
- `LAUNCHER_SHA256=79acf4084f7665c87ee91389c1d9773b2e80d67f963dd3441d9836c9e8226ccb`
- `LAUNCHER_SIZE=534528`

Firebase backend env must also be set in Vercel:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_WEB_API_KEY`
