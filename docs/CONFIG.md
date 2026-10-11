# Settings file (config.json)

Everything a user can customize about their Splat Pad is stored in one
JSON file. The app reads and writes it; later the same file is copied to
the device's microSD card so the device can show the user's layout.

The exact format is defined in code in `src/shared/config.ts`
(`Config` type, `DEFAULT_CONFIG`, and `validateConfig`, which rejects
broken files with readable error messages).

## Top level

| Field       | What it is                                                    |
| ----------- | ------------------------------------------------------------- |
| `version`   | Format version. Currently `1`. Bumped if the format changes.  |
| `theme`     | Screen colors                                                 |
| `clock`     | Clock display options                                         |
| `carousel`  | How the moving app carousel behaves                           |
| `apps`      | The app tiles in the carousel                                 |
| `favorites` | App ids pinned to the favorites row                           |
| `sliders`   | Sliders in the tap-to-reveal panel                            |
| `presets`   | Saved slider positions, applied with one tap                  |

## theme

Colors are written `"#RRGGBB"` (for example `"#4f8cff"`).

| Field        | Used for                       |
| ------------ | ------------------------------ |
| `background` | Screen background              |
| `surface`    | Panels and empty tiles         |
| `accent`     | Highlights, slider fill        |
| `text`       | Text                           |

TODO(hardware): the device screen may show fewer colors than a PC monitor,
so very similar colors might look identical on the device. Confirm the
display's color depth once the firmware exists.

## clock

| Field         | Values            |
| ------------- | ----------------- |
| `format`      | `"12h"` or `"24h"`|
| `showSeconds` | `true` / `false`  |
| `showDate`    | `true` / `false`  |

## carousel

App tiles in a loop that slowly drifts up (or down). The user scrolls it to
find an app; it pauses while they scroll and resumes drifting afterwards.

| Field           | Meaning                                                   | Range      |
| --------------- | --------------------------------------------------------- | ---------- |
| `columns`       | Tiles per row                                             | 1 to 4     |
| `speed`         | Drift speed in pixels per second; `0` = no drifting       | 0 to 200   |
| `direction`     | `"up"` or `"down"`                                        |            |
| `resumeDelayMs` | Wait after the user stops scrolling before drifting again | 0 to 60000 |

## apps

Each tile:

| Field    | Meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| `id`     | Short unique name, e.g. `"spotify"`. Used by favorites.              |
| `name`   | Label shown on the tile                                              |
| `color`  | Tile background color                                               |
| `icon`   | Optional image file, e.g. `"icons/spotify.png"`. Without one, the tile shows the first letter of the name. |
| `action` | What the PC does when the tile is tapped (see below)                 |

Actions:
- `{ "type": "launch", "target": "C:\\Path\\To\\Program.exe" }` opens a program
- `{ "type": "url", "target": "https://example.com" }` opens a website
- `{ "type": "none" }` does nothing (placeholder)

The device itself never runs these. It reports which tile was tapped and
the PC app performs the action (Phase 3).

TODO(hardware): icon image size and file format the device can display.

## sliders

| Field    | Meaning                                                            |
| -------- | ------------------------------------------------------------------ |
| `id`     | Short unique name, used by presets                                 |
| `kind`   | `"masterVolume"`, `"brightness"`, `"appVolume"`, or `"device"`     |
| `label`  | Text shown next to the slider                                      |
| `target` | Required for `appVolume` (program name, e.g. `"spotify.exe"`) and `device` (device name) |

## presets

| Field    | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| `id`     | Short unique name                                            |
| `name`   | Label shown on the device                                    |
| `values` | Slider id → position from 0 to 100, e.g. `{ "volume": 70 }`  |

## Example

The built-in defaults (what a new user starts with) are `DEFAULT_CONFIG`
in `src/shared/config.ts`.
