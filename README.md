# Control Pad: desktop companion app

Configurator and background agent for the Control Pad desk device
(5" touchscreen, connects to the PC over one USB-C cable).

Status: **Phase 1, early scaffold.** The app runs on its own and shows an
on-screen preview of the device; it doesn't connect to the device yet.

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
