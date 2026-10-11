import { app } from 'electron'
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Reads and sets the PC's main (master) volume, 0..100.
//
// Windows has no built-in command for this, so we run one long-lived
// PowerShell process that talks to the Windows audio API (Core Audio) and
// answers simple "get" / "set 40" lines. Keeping it running makes slider
// drags instant (starting PowerShell each time takes about a second).
// Linux uses PulseAudio/PipeWire's `pactl`.
// TODO(phase 3): per-app volume; consider a native module instead of PowerShell.

const PS_SCRIPT = String.raw`
$code = @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float level, Guid context);
  int j();
  int GetMasterVolumeLevelScalar(out float level);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, IntPtr activationParams, out IAudioEndpointVolume endpoint); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }
public static class SplatAudio {
  static IAudioEndpointVolume Endpoint() {
    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
    IAudioEndpointVolume volume;
    var id = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, IntPtr.Zero, out volume));
    return volume;
  }
  public static int Get() { float v; Marshal.ThrowExceptionForHR(Endpoint().GetMasterVolumeLevelScalar(out v)); return (int)Math.Round(v * 100); }
  public static void Set(int percent) { Marshal.ThrowExceptionForHR(Endpoint().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(100, percent)) / 100f, Guid.Empty)); }
}
'@
Add-Type -TypeDefinition $code
[Console]::Out.WriteLine('ready')
while ($null -ne ($line = [Console]::In.ReadLine())) {
  try {
    if ($line -match '^set (\d{1,3})$') { [SplatAudio]::Set([int]$matches[1]); [Console]::Out.WriteLine('ok') }
    elseif ($line -eq 'get') { [Console]::Out.WriteLine([SplatAudio]::Get()) }
    else { [Console]::Out.WriteLine('error unknown command') }
  } catch { [Console]::Out.WriteLine('error ' + $_.Exception.Message) }
}
`

let helper: ChildProcessWithoutNullStreams | null = null
let ready: Promise<void> | null = null
const waiting: ((line: string) => void)[] = [] // one callback per command sent, answered in order

function startHelper(): Promise<void> {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    const scriptPath = join(app.getPath('userData'), 'volume-helper.ps1')
    writeFileSync(scriptPath, PS_SCRIPT, 'utf8')
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      windowsHide: true
    })
    helper = ps
    let buffer = ''
    let started = false
    ps.stdout.setEncoding('utf8')
    ps.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!started && line === 'ready') {
          started = true
          resolve()
        } else if (started) waiting.shift()?.(line)
      }
    })
    const fail = (why: string): void => {
      helper = null
      ready = null
      while (waiting.length) waiting.shift()?.(`error ${why}`)
      if (!started) reject(new Error(why))
    }
    ps.on('exit', () => fail('volume helper stopped'))
    ps.on('error', (e) => fail(e.message))
  })
  return ready
}

async function send(command: string): Promise<string> {
  await startHelper()
  return new Promise((resolve) => {
    waiting.push(resolve)
    helper!.stdin.write(command + '\n')
  })
}

function pactl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile('pactl', args, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  )
}

export async function getVolume(): Promise<number | null> {
  try {
    if (process.platform === 'win32') {
      const n = Number(await send('get'))
      return Number.isFinite(n) ? n : null
    }
    if (process.platform === 'linux') {
      const out = await pactl(['get-sink-volume', '@DEFAULT_SINK@'])
      const m = out.match(/(\d+)%/)
      return m ? Number(m[1]) : null
    }
  } catch {
    // fall through
  }
  return null
}

// Only the newest requested level matters while a slider is being dragged.
let pending: number | null = null
let busy = false

export async function setVolume(percent: number): Promise<boolean> {
  const value = Math.round(Math.min(100, Math.max(0, percent)))
  if (process.platform === 'linux') {
    try {
      await pactl(['set-sink-volume', '@DEFAULT_SINK@', `${value}%`])
      return true
    } catch {
      return false
    }
  }
  if (process.platform !== 'win32') return false

  pending = value
  if (busy) return true // the running loop below will pick up the newest value
  busy = true
  let ok = true
  try {
    while (pending !== null) {
      const next = pending
      pending = null
      ok = (await send(`set ${next}`)) === 'ok'
    }
  } catch {
    ok = false
  } finally {
    busy = false
  }
  return ok
}

export function stopVolumeHelper(): void {
  helper?.kill()
  helper = null
  ready = null
}
