# Releasing an update

Every installed Splat Pad checks **GitHub Releases** for a newer version:
10 seconds after it starts, every 6 hours while it runs, and when someone
clicks **☰ menu → Check for updates** (or the tray menu item). A newer
version downloads in the background; the app then asks **Restart now /
Later**. "Later" installs it the next time Splat Pad quits. Settings are kept.

Code: `src/main/updater.ts` (uses `electron-updater`), the `publish` section
of `electron-builder.yml`, and `.github/workflows/release.yml`.

## One-time setup

1. Create a free GitHub account and an empty repository named `splat-pad`
   (public, so installed apps can download updates without a password).
2. Connect this folder to it and upload the code:
   ```
   git remote add origin https://github.com/<your-username>/splat-pad.git
   git push -u origin main
   ```
   electron-builder reads the owner and repo name from this remote, and
   builds every installer to check that repository for updates. Until the
   remote exists, `npm run dist:win` stops with "Cannot detect repository".

## Every release

1. Raise the version number (patch = small fix, minor = new features):
   ```
   npm version patch
   ```
   This changes `package.json`, commits, and tags the commit (e.g. `v0.1.2`).
2. Upload the commit and tag:
   ```
   git push --follow-tags
   ```
3. GitHub builds the Windows installer and the Linux AppImage on its own
   computers (about 10 minutes; watch the **Actions** tab) and publishes them
   as a release. Installed copies pick it up on their next check.

Installers stay unsigned until the code signing certificate is set up
(Windows shows "Windows protected your PC" for the first install; updates
installed from inside the app don't show it).

## Testing an update without GitHub

Build an "old" copy and a newer installer that point at a local folder
(`publish: { provider: generic, url: http://127.0.0.1:8765/ }` in a copy of
`electron-builder.yml`, passed with `--config`), serve the newer build's
`dist` folder on that port, and click **Check for updates** in the old copy.
Force-close the old copy afterwards (Task Manager), or it installs the test
update when it quits.
