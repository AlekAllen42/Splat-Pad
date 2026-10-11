# Splat Pad: desktop companion app

## The product
Splat Pad is a hardware product I'm designing: a Stream Deck-sized desk
device with a 5-inch capacitive touchscreen (Elecrow 5" ESP32-S3 board,
800x480, microSD slot). The screen shows a clock, a carousel of app
shortcuts (Stream Deck-style icon tiles that continuously drift vertically
in a loop; the user can scroll it to find an app), a few favorites, and a
tap-to-reveal panel of
sliders (computer brightness, volume, per-app volume, connected devices),
plus saved presets. It plugs into the PC with one USB-C cable (power + data).
The hardware may not be in my hands yet, so build everything to work
against a simulated device first.

## What we're building now
The desktop companion app for Windows and Linux (macOS later, after a
Kickstarter funds the Apple Developer membership; don't build Mac releases yet). The device
is the product; the app is how users personalize it. Two jobs:
1. Configurator: edit layout, colors, apps, sliders, presets, with a live
   preview of the device screen. Once the device is connected (Phase 2+),
   edits also update the real device live as you work.
2. Background agent (system tray): talks to the device over USB serial and
   performs actions on the PC (set volume or brightness, launch apps).

## UI
Branding matches https://42potential.com (company site; co-founder owns
myleskerschner.com): warm paper background, one orange accent #e2562c,
thick ink outlines with flat offset shadows, no gradients/glow, Fraunces
for headings, Inter for body, 42 Potential logo. App has light + dark modes.

Window layout:
- Pop-out top bar (slim strip; slides open on hover/tap): logo, "Splat Pad",
  hamburger menu (light/dark/system), Update firmware, Discard, Save.
- Top left: live screen, what the device shows right now (animated).
- Top right: layout editor, drag/resize/move screen pieces on a grid.
- Bottom left: AI panel (Claude) to create things that don't exist yet;
  user can opt to send creations to 42 Potential for review (wording: "send
  to 42 Potential", never "Splat") to become presets for everyone. Real AI must go
  through our website's server (never ship an API key in the app); until
  then, pretend responses.
- Center: orange star in a circle cut from the four panels' inner corners;
  spins on hover, click toggles Test mode (taps in the live screen really
  open apps/websites and set master volume on this PC; glows while on).
- Bottom right: library, add apps (with icons from the PC), clock,
  sliders, presets, device background/theme colors, quantities, and
  optional extras (e.g. "Opening <app>" message on tap, off by default).

## Phases (do one at a time)
1. App only, no hardware: scaffold, on-screen preview of the device screen,
   config UI that updates the preview live, save/discard config as JSON.
2. Protocol doc, then serial manager: auto-detect device, auto-reconnect,
   time sync, send config.
3. PC actions: volume, brightness, launch app, driven by device events.
4. System tray and start-on-login.
5. Auto-update plus installers (Windows installer, Linux AppImage), released
   through GitHub Releases or my own website.
6. Firmware update button (after the firmware exists).

## Tech decisions
- Electron + TypeScript, React + Vite via electron-vite.
- electron-vite 5 requires Vite 7 (not 8); keep them matched when upgrading.
- `serialport` for USB serial, `electron-builder` + `electron-updater` for
  packaging and updates. Ask before adding other large dependencies.
- Config is one JSON file. The same file will later be copied to the
  device's microSD card.
- Protocol: newline-delimited, versioned JSON over USB serial, specified in
  docs/PROTOCOL.md before coding against it.
- The device firmware (C++ with LVGL on ESP32-S3) is a separate project, not
  part of this repo.

## Distribution
Downloads and updates are hosted on my own website. Beta builds are
unsigned; Windows code signing comes before I sell anything. Linux users
need to be in the `dialout` group for serial access (documented in README).

## How to work with me
- Before each phase, give a short plan and wait for my OK.
- Small steps. After each one, tell me exactly how to run and test it.
- My coding experience: beginner (assumed; not yet confirmed). Explain
  choices in plain language and don't assume terminal knowledge.
- My computer: Windows 11.
- Commit to git at logical steps with clear messages.
- Never invent hardware facts (pins, ports, specs). If something depends on
  the Elecrow board, leave a clearly marked TODO and ask me.
- Keep this file short. Put details in docs/.
