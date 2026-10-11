# Splat Pad: desktop companion app

Configurator and background agent for the Splat Pad desk device
(5" touchscreen, connects to the PC over one USB-C cable).

Status: **Phase 1 complete.** Design your Splat Pad's screen, apps, sliders,
presets and colors, with a live preview. The app doesn't connect to the
device yet (Phase 2).

## Where your settings are saved

Click **Save** (or press `Ctrl+S`). Settings are stored in one file:

- Windows: `%APPDATA%\Splat Pad\config.json`
- Linux: `~/.config/Splat Pad/config.json`

Open it from the app with **☰ menu → Show settings file**. If the file is
ever damaged, the app starts from the defaults and keeps the damaged copy
next to it as `config.broken-<number>.json`.

## Running in the background

Closing the window keeps Splat Pad running in the tray (the 42 icon next to
the clock), so the device keeps working. Click the icon to open the window;
right-click it for **Start with Windows** and **Quit**. The installed app
starts with Windows by default, hidden in the tray (`--hidden`); this is
never registered while developing with `npm run dev`.

## Updates

Installed copies update themselves from GitHub Releases; **☰ menu → Check
for updates** checks right away. How to publish a new version:
[docs/RELEASING.md](docs/RELEASING.md).

## Requirements

- [Node.js](https://nodejs.org) 22.12 or newer (LTS recommended)
- [Git](https://git-scm.com)

## Run it (development)

Open a terminal in this folder, then:

```
npm install
npm run dev
```

`npm install` is only needed the first time, or after dependencies change.
`npm run dev` opens the app window; edits to the UI code show up instantly.
Close the window, or press `Ctrl+C` in the terminal, to stop.

Other commands:

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run build`     | Compiles the app into `out/`                      |
| `npm run preview`   | Runs the compiled app from `out/`                 |
| `npm run typecheck` | Checks the TypeScript code for type errors        |
| `npm run dist:win`  | Builds the Windows installer into `dist/`         |

## Linux: serial port permission

The app talks to the device over USB serial. On most Linux distributions
your user must be in the `dialout` group to open serial ports:

```
sudo usermod -aG dialout $USER
```

Then **log out and back in** (or reboot) for it to take effect. Check with
`groups`; `dialout` should be listed. (On Arch-based distros the group may
be `uucp` instead.)

## Project layout

```
src/main/       Electron main process (windows, files; later serial + tray)
src/preload/    Safe bridge between main process and UI
src/renderer/   The UI (React)
docs/           Protocol and config documentation
```
