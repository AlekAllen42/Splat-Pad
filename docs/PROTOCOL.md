# Splat Pad USB protocol (version 1)

How the desktop app ("app") and the Splat Pad ("device") talk over the USB
cable. Both sides must follow this document; change it first, then the code.

Status: **draft for review.** Items marked **TODO(hardware)** depend on the
Elecrow board and must be confirmed before the firmware is written.

## 1. Connection

- The device appears on the PC as a USB serial port (COM port on Windows,
  `/dev/ttyACM*` or `/dev/ttyUSB*` on Linux).
  - TODO(hardware): does the board use the ESP32-S3's built-in USB or a
    separate USB-to-serial chip? This decides the port name, the USB IDs
    (VID/PID) the app looks for, and whether a baud rate matters.
  - Baud rate: 115200 unless the board requires otherwise. TODO(hardware).
- **Finding the device:** the app lists serial ports, tries ports whose USB
  IDs match (TODO(hardware): the IDs), then any others, by opening the port
  and sending `hello`. A port that answers with a valid `hello` within
  1 second is a Splat Pad.
- **Reconnecting:** if the port closes (cable unplugged) or no message
  arrives for 6 seconds, the app treats the device as disconnected and
  retries every 2 seconds.

## 2. Message format

- Every message is **one line of JSON** (UTF-8), ending with `\n`.
  Lines must not contain raw newlines (JSON escapes them).
- Maximum line length: **32 KB**. Anything bigger (icons, the logo) is sent
  as a file transfer (section 5). TODO(hardware): confirm the firmware has
  RAM for a 32 KB line buffer (fine if the board has PSRAM).
- Every message has:
  - `"v": 1` protocol version
  - `"type"`: what the message is
  - `"id"` (optional): a number chosen by the sender. If present, the
    receiver must reply with `ack` or `error` carrying the same number in
    `"re"`. Messages without `id` get no reply (used for frequent ones such
    as slider moves).
- Unknown `type` → reply `error` with code `unknown_type` (if it had an `id`)
  and keep going. Unknown fields are ignored, so new fields can be added
  without breaking older devices.
- If `v` is higher than the receiver understands, it replies `error`
  `unsupported_version`; the app then tells the user to update.

Example:

```
{"v":1,"type":"tap","appId":"spotify"}
```

## 3. Starting a session

```
app    → device   {"v":1,"type":"hello","id":1,"app":"splat-pad","appVersion":"0.1.0"}
device → app      {"v":1,"type":"hello","re":1,"model":"splat-pad-5","firmware":"1.0.0",
                   "protocol":1,"sd":{"present":true,"freeBytes":1234567},
                   "configHash":"9f2c…","files":["icons/3a7b….png"]}
app    → device   {"v":1,"type":"time","id":2,"unix":1791700000,"tzOffsetMin":-300}
device → app      {"v":1,"type":"ack","re":2}
```

Then, if the device's `configHash` differs from the app's saved settings,
the app sends any missing files (section 5) and the saved settings with
`"save": true` (section 4).

| Field (device `hello`) | Meaning |
| --- | --- |
| `model` | Hardware model name. TODO(hardware): final name. |
| `firmware` | Firmware version, e.g. `"1.0.0"` (used by the Update button later) |
| `protocol` | Highest protocol version the device understands |
| `sd` | Whether a microSD card is in and how much space is free |
| `configHash` | SHA-256 (hex) of the settings currently saved on the card, or `null` |
| `files` | Icon/image files already on the card (so the app doesn't resend them) |

## 4. Messages from the app to the device

### `time`: set the clock
Sent at connect and every hour (the device clock drifts).
`unix`: seconds since 1970 (UTC). `tzOffsetMin`: minutes from UTC for the
PC's time zone (e.g. `-300` for US Eastern standard time).

### `config`: settings to show
```
{"v":1,"type":"config","id":7,"save":false,"hash":"9f2c…","config":{…}}
```
- `config` is the settings file (see `docs/CONFIG.md`) **with images
  replaced by file names**: each app's `icon` becomes e.g.
  `"icons/3a7b9c….png"` (the file must already be on the device, sent with
  section 5). The `hash` is the SHA-256 of the settings text.
- `"save": false`, **live preview**: sent while the user edits, at most
  about 3 times a second (the app waits until edits pause for 300 ms). The
  device shows it immediately but does **not** write it to the card.
- `"save": true`, **saved**: sent when the user clicks Save (and at connect
  if the card's copy is out of date). The device shows it and writes it to
  `config.json` on the card, so it appears at power-on even before the PC
  app runs.
- If the user clicks Discard, the app sends the saved settings again with
  `"save": false`, and the device goes back to showing them.
- Reply: `ack`, or `error` (e.g. `missing_file`, `invalid_config`,
  `sd_write_failed`).

### `state`: keep sliders in sync with the PC
```
{"v":1,"type":"state","sliders":{"volume":67,"brightness":80}}
```
Sent when a value changes on the PC (e.g. the user changes the volume with
the keyboard) so the device's sliders match. No reply.

### `ping`
Sent every 2 seconds when nothing else was sent. Device replies `pong`
(with the same `id`). Keeps the 6-second disconnect check honest.

## 5. File transfers (icons, logo)

Images are converted by the app before sending:
- PNG, square, **TODO(hardware): size in pixels** (proposal: 96×96 for app
  icons), and a color format the firmware can draw (TODO: LVGL may want a
  pre-converted format instead of PNG; decide when writing firmware).
- Named by content: `icons/<first 16 hex chars of SHA-256>.png`, so a file
  is only ever sent once and never needs renaming.

```
app    → device   {"v":1,"type":"fileBegin","id":20,"path":"icons/3a7b9c….png","size":5321,"sha256":"3a7b9c…"}
device → app      {"v":1,"type":"ack","re":20}
app    → device   {"v":1,"type":"fileChunk","id":21,"path":"icons/3a7b9c….png","offset":0,"data":"<base64, up to 4096 bytes before encoding>"}
device → app      {"v":1,"type":"ack","re":21}
…more chunks, each waiting for its ack…
app    → device   {"v":1,"type":"fileEnd","id":25,"path":"icons/3a7b9c….png"}
device → app      {"v":1,"type":"ack","re":25}       (or error "checksum_mismatch")
```

The device writes to a temporary file and only renames it to `path` after
`fileEnd` checks the size and SHA-256, so a pulled cable never leaves a
broken image. Unused files can be removed with
`{"v":1,"type":"fileDelete","id":30,"path":"icons/…png"}`.

## 6. Messages from the device to the app

| `type` | Fields | Sent when | App does |
| --- | --- | --- | --- |
| `tap` | `appId` | An app tile or favorite is tapped | Runs the app's action (open program/website, custom button) |
| `slider` | `sliderId`, `value` (0–100) | A slider moves (at most ~10 per second while dragging, plus the final value) | Sets volume/brightness/etc. |
| `preset` | `presetId` | A preset is tapped | Applies each slider value in the preset |
| `pong` | `re` | Reply to `ping` | Notes the device is alive |
| `log` | `level` (`info`/`warn`/`error`), `msg` | Something worth recording | Writes it to the app's log file (for support) |

None of these need an `id`; the app never acks them. (Taps are not retried:
a duplicate tap would open an app twice.)

## 7. `ack` and `error`

```
{"v":1,"type":"ack","re":7}
{"v":1,"type":"error","re":7,"code":"missing_file","msg":"icons/3a7b….png not found"}
```

| `code` | Meaning |
| --- | --- |
| `unknown_type` | Message type not understood |
| `unsupported_version` | `v` is newer than this side understands |
| `bad_message` | Not valid JSON, or a required field is missing |
| `invalid_config` | Settings failed the device's checks |
| `missing_file` | Settings refer to an image the device doesn't have |
| `checksum_mismatch` | A file arrived damaged; the app resends it |
| `sd_missing` / `sd_write_failed` | No card, or the card couldn't be written |
| `busy` | Try again shortly (e.g. during a file write) |

If a request with an `id` gets no reply within 2 seconds, the sender may
retry it once, then treats the device as disconnected.

## 8. Reserved for later

- Firmware updates over USB (`fwBegin` / `fwChunk` / `fwEnd`), Phase 6.
- Screen brightness of the device itself, sleep/wake.
- Device-side errors shown in the app (low SD space, etc.).

## 9. Open questions (TODO(hardware), to confirm with the board)

1. Built-in USB vs USB-to-serial chip; the USB VID/PID to detect.
2. Baud rate (if a USB-to-serial chip is used).
3. RAM available for the 32 KB line buffer (PSRAM?).
4. Icon size in pixels and the image format the firmware draws.
5. How the device reads the microSD card (pins/bus), and its file system (FAT32 expected).
6. Final model name for `hello`.
