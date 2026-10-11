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
| `tiles`     | How app tiles look (image, name, letter)                      |
| `behavior`  | Optional extras, switched on from the Library                 |
| `layout`    | Where each piece sits on the screen                           |
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
| `timeColor`   | Optional color for the time digits; default: theme `text` |
| `dateColor`   | Optional color for the date; default: theme `text`, dimmed |
| `ampmColor`   | Optional color for AM/PM; default: theme `accent` |

## carousel

Every row of the carousel is always full: when the apps don't fill the last
row, the loop continues into the start of the list (7 apps in 2 columns are
shown as 14 tiles). A double-wide tile that doesn't fit at the end of a row
moves to the next row and a single tile fills the spot.

App tiles in a loop that slowly drifts up (or down). The user scrolls it to
find an app; it pauses while they scroll and resumes drifting afterwards.

| Field           | Meaning                                                   | Range      |
| --------------- | --------------------------------------------------------- | ---------- |
| `columns`       | Tiles per row                                             | 1 to 4     |
| `speed`         | Drift speed in pixels per second; `0` = no drifting       | 0 to 200   |
| `direction`     | `"up"` or `"down"`                                        |            |
| `resumeDelayMs` | Wait after the user stops scrolling before drifting again | 0 to 60000 |

## tiles

| Field   | Values                                                              | Default       |
| ------- | ------------------------------------------------------------------- | ------------- |
| `style` | `"imageName"` (image + name), `"image"` (image only), `"letterName"` (letter + name) | `"imageName"` |

| `shape` | `"square"`, `"circle"`, `"rectangle"` (two columns wide), or `"mixed"` (each app uses its own `shape`) | `"square"` |
| `showBoxes` | `true` (colored box behind each app) or `false` (just the image or letter; the tap area stays the same square) | `true` |

Apps without an `icon` always show their first letter and name.

## behavior

| Field             | Meaning                                                       | Default |
| ----------------- | ------------------------------------------------------------- | ------- |
| `showOpenMessage` | Show a brief "Opening Spotify" message when an app is tapped  | `false` |

## layout

The screen is 800 × 480 pixels; `x` and `y` count from the top-left
corner. Pieces snap to a 20-pixel grid in the layout editor and must be at
least 40 pixels wide and tall. A piece may not stick out past the screen edge.

| Field  | Meaning                                                              |
| ------ | -------------------------------------------------------------------- |
| `id`   | Short unique name                                                    |
| `type` | `"clock"`, `"carousel"`, `"favorites"`, `"presets"`, or `"controls"` (the button that opens the sliders panel) |
| `x`, `y` | Position of the top-left corner, in pixels                         |
| `w`, `h` | Width and height, in pixels                                        |

## apps

Each tile:

| Field    | Meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| `id`     | Short unique name, e.g. `"spotify"`. Used by favorites.              |
| `name`   | Label shown on the tile                                              |
| `color`  | Tile background color                                               |
| `shape`  | Optional: `"square"`, `"circle"` or `"rectangle"`; used when `tiles.shape` is `"mixed"` (default square) |
| `icon`   | Optional image. Filled in automatically from the program (Add program, starter-app finder) or the website (Add website), or chosen by the user. Stored as a data URL for now. Without one, the tile shows the first letter of the name. |
| `action` | What the PC does when the tile is tapped (see below)                 |

Actions:
- `{ "type": "launch", "target": "C:\\Path\\To\\Program.exe" }` opens a program
- `{ "type": "url", "target": "https://example.com" }` opens a website
- `{ "type": "macro", "steps": [...] }` a custom button that does several
  things in order. Each step is one of:
  - `{ "type": "openApp", "appId": "spotify" }`: do what that app tile does
  - `{ "type": "url", "target": "https://example.com" }`: open a website
  - `{ "type": "setSlider", "sliderId": "volume", "value": 40 }`: set a slider (0 to 100)

  Removing an app or slider also removes the steps that used it; a custom
  button left with no steps becomes `none`.
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

## Older files

When a file saved by an older version of the app is loaded, settings added
since then are filled in with their defaults (`upgradeConfig` in
`src/shared/config.ts`), so saved settings keep working after updates.

## Example

The built-in defaults (what a new user starts with) are `DEFAULT_CONFIG`
in `src/shared/config.ts`.
