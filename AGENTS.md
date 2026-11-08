# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Release rule

After every mobile app release (version bump in `apps/mobile/app.json`), always rebuild and
redeploy the web app too. `apps/web` injects the app version from `apps/mobile/app.json` at
build time, so the dashboard only shows the new version after a fresh web deploy. The full
workflow is in `deployment/README.md` ("App-Release mit Web-Abgleich").
