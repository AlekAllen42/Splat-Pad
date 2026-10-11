import { app } from 'electron'
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Real PC controls, 0..100: master volume, per-app volume, screen brightness.
//
// Windows has no built-in commands for these, so one long-lived PowerShell
// process runs a little C# that talks to Windows directly:
//   - volume:          Core Audio (default speakers)
//   - per-app volume:  Core Audio sessions (what the Volume Mixer shows)
//   - brightness:      WMI for laptop screens, DDC/CI (dxva2) for external monitors
// It answers simple text commands, one line each. Keeping it running makes
// slider drags instant (starting PowerShell takes about half a second).
// Linux uses pactl (PulseAudio/PipeWire), brightnessctl and ddcutil when installed.

const PS_SCRIPT = String.raw`
$code = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float level, Guid context);
  int j();
  int GetMasterVolumeLevelScalar(out float level);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object result); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionManager2 { int f(); int g(); int GetSessionEnumerator(out IAudioSessionEnumerator sessions); }
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionEnumerator { int GetCount(out int count); int GetSession(int index, out IAudioSessionControl2 session); }
[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl2 {
  int a(); int b(); int c(); int d(); int e(); int f(); int g(); int h(); int i(); // IAudioSessionControl
  int j(); int k(); // session identifiers
  int GetProcessId(out uint pid);
}
[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface ISimpleAudioVolume { int SetMasterVolume(float level, ref Guid context); int GetMasterVolume(out float level); }

public static class SplatPc {
  static IMMDevice Speakers() {
    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
    return device;
  }
  static object Activate(Guid iid) {
    object o; var id = iid;
    Marshal.ThrowExceptionForHR(Speakers().Activate(ref id, 23, IntPtr.Zero, out o));
    return o;
  }
  static IAudioEndpointVolume Endpoint() { return (IAudioEndpointVolume)Activate(typeof(IAudioEndpointVolume).GUID); }

  public static int GetVolume() { float v; Marshal.ThrowExceptionForHR(Endpoint().GetMasterVolumeLevelScalar(out v)); return (int)Math.Round(v * 100); }
  public static void SetVolume(int p) { Marshal.ThrowExceptionForHR(Endpoint().SetMasterVolumeLevelScalar(Clamp(p) / 100f, Guid.Empty)); }

  // ---- per-app volume: every audio session whose process matches the name ----
  static string Bare(string name) { name = name.Trim().ToLowerInvariant(); return name.EndsWith(".exe") ? name.Substring(0, name.Length - 4) : name; }
  static List<ISimpleAudioVolume> AppSessions(string name) {
    var found = new List<ISimpleAudioVolume>();
    var mgr = (IAudioSessionManager2)Activate(typeof(IAudioSessionManager2).GUID);
    IAudioSessionEnumerator sessions;
    Marshal.ThrowExceptionForHR(mgr.GetSessionEnumerator(out sessions));
    int count; sessions.GetCount(out count);
    string want = Bare(name);
    for (int n = 0; n < count; n++) {
      IAudioSessionControl2 ctl; sessions.GetSession(n, out ctl);
      uint pid; if (ctl.GetProcessId(out pid) != 0 || pid == 0) continue;
      try { if (Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant() == want) found.Add((ISimpleAudioVolume)ctl); } catch { }
    }
    return found;
  }
  public static int GetAppVolume(string name) {
    foreach (var s in AppSessions(name)) { float v; if (s.GetMasterVolume(out v) == 0) return (int)Math.Round(v * 100); }
    return -1;
  }
  public static int SetAppVolume(string name, int p) {
    var g = Guid.Empty; int done = 0;
    foreach (var s in AppSessions(name)) if (s.SetMasterVolume(Clamp(p) / 100f, ref g) == 0) done++;
    return done;
  }

  // ---- brightness: laptop screens (WMI) and external monitors (DDC/CI) ----
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct PHYSICAL_MONITOR { public IntPtr handle; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string description; }
  delegate bool MonitorEnumProc(IntPtr monitor, IntPtr hdc, IntPtr rect, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc proc, IntPtr data);
  [DllImport("dxva2.dll")] static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr monitor, out uint count);
  [DllImport("dxva2.dll")] static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr monitor, uint count, [Out] PHYSICAL_MONITOR[] monitors);
  [DllImport("dxva2.dll")] static extern bool DestroyPhysicalMonitors(uint count, PHYSICAL_MONITOR[] monitors);
  [DllImport("dxva2.dll")] static extern bool GetVCPFeatureAndVCPFeatureReply(IntPtr monitor, byte code, IntPtr type, out uint current, out uint max);
  [DllImport("dxva2.dll")] static extern bool SetVCPFeature(IntPtr monitor, byte code, uint value);
  const byte VCP_BRIGHTNESS = 0x10;

  static List<PHYSICAL_MONITOR[]> OpenMonitors() {
    var all = new List<PHYSICAL_MONITOR[]>();
    MonitorEnumProc proc = (m, hdc, r, d) => {
      uint n; if (!GetNumberOfPhysicalMonitorsFromHMONITOR(m, out n) || n == 0) return true;
      var arr = new PHYSICAL_MONITOR[n];
      if (GetPhysicalMonitorsFromHMONITOR(m, n, arr)) all.Add(arr);
      return true;
    };
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, proc, IntPtr.Zero);
    GC.KeepAlive(proc);
    return all;
  }

  public static int GetBrightness() {
    try {
      using (var q = new ManagementObjectSearcher("root\\WMI", "SELECT CurrentBrightness FROM WmiMonitorBrightness"))
        foreach (ManagementObject o in q.Get()) return Convert.ToInt32(o["CurrentBrightness"]);
    } catch { }
    var monitors = OpenMonitors();
    try {
      foreach (var arr in monitors) foreach (var m in arr) {
        uint cur, max;
        if (GetVCPFeatureAndVCPFeatureReply(m.handle, VCP_BRIGHTNESS, IntPtr.Zero, out cur, out max) && max > 0) return (int)Math.Round(cur * 100.0 / max);
      }
    } finally { foreach (var arr in monitors) DestroyPhysicalMonitors((uint)arr.Length, arr); }
    return -1;
  }

  // Returns "<laptop screens set> <external monitors set>".
  public static string SetBrightness(int p) {
    int laptop = 0, external = 0;
    try {
      using (var q = new ManagementObjectSearcher("root\\WMI", "SELECT * FROM WmiMonitorBrightnessMethods"))
        foreach (ManagementObject o in q.Get()) { o.InvokeMethod("WmiSetBrightness", new object[] { (uint)1, (byte)Clamp(p) }); laptop++; }
    } catch { }
    var monitors = OpenMonitors();
    try {
      foreach (var arr in monitors) foreach (var m in arr) {
        uint cur, max;
        if (!GetVCPFeatureAndVCPFeatureReply(m.handle, VCP_BRIGHTNESS, IntPtr.Zero, out cur, out max) || max == 0) continue;
        if (SetVCPFeature(m.handle, VCP_BRIGHTNESS, (uint)Math.Round(Clamp(p) * max / 100.0))) external++;
      }
    } finally { foreach (var arr in monitors) DestroyPhysicalMonitors((uint)arr.Length, arr); }
    return laptop + " " + external;
  }

  static int Clamp(int p) { return Math.Max(0, Math.Min(100, p)); }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Management
[Console]::Out.WriteLine('ready')
while ($null -ne ($line = [Console]::In.ReadLine())) {
  try {
    if ($line -eq 'vol get') { [Console]::Out.WriteLine([SplatPc]::GetVolume()) }
    elseif ($line -match '^vol set (\d{1,3})$') { [SplatPc]::SetVolume([int]$matches[1]); [Console]::Out.WriteLine('ok') }
    elseif ($line -match '^app get (.+)$') { [Console]::Out.WriteLine([SplatPc]::GetAppVolume($matches[1])) }
    elseif ($line -match '^app set (\d{1,3}) (.+)$') { [Console]::Out.WriteLine([SplatPc]::SetAppVolume($matches[2], [int]$matches[1])) }
    elseif ($line -eq 'bri get') { [Console]::Out.WriteLine([SplatPc]::GetBrightness()) }
    elseif ($line -match '^bri set (\d{1,3})$') { [Console]::Out.WriteLine([SplatPc]::SetBrightness([int]$matches[1])) }
    else { [Console]::Out.WriteLine('error unknown command') }
  } catch { [Console]::Out.WriteLine('error ' + $_.Exception.Message) }
}
`

// ---------------------------------------------------------------------------
// The Windows helper process

let helper: ChildProcessWithoutNullStreams | null = null
let ready: Promise<void> | null = null
const waiting: ((line: string) => void)[] = [] // one callback per command sent, answered in order

function startHelper(): Promise<void> {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    const scriptPath = join(app.getPath('userData'), 'pc-helper.ps1')
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
    ps.on('exit', () => fail('PC helper stopped'))
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

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(cmd, args, { timeout: 5000 }, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  )
}

const clamp = (v: number): number => Math.round(Math.min(100, Math.max(0, v)))
const asLevel = (s: string): number | null => {
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// While a slider is dragged, only the newest value matters: run one command
// at a time per control and skip the in-between values.
function latestOnly<T>(apply: (value: number) => Promise<T>): (value: number) => Promise<T | undefined> {
  let pending: number | null = null
  let running: Promise<T | undefined> | null = null
  return async (value) => {
    pending = value
    if (running) return running
    running = (async () => {
      let result: T | undefined
      while (pending !== null) {
        const next = pending
        pending = null
        result = await apply(next)
      }
      running = null
      return result
    })()
    return running
  }
}

// ---------------------------------------------------------------------------
// Master volume

export async function getVolume(): Promise<number | null> {
  try {
    if (process.platform === 'win32') return asLevel(await send('vol get'))
    if (process.platform === 'linux') {
      const m = (await run('pactl', ['get-sink-volume', '@DEFAULT_SINK@'])).match(/(\d+)%/)
      return m ? Number(m[1]) : null
    }
  } catch {
    // fall through
  }
  return null
}

const applyVolume = latestOnly(async (value) => {
  try {
    if (process.platform === 'win32') return (await send(`vol set ${value}`)) === 'ok'
    if (process.platform === 'linux') {
      await run('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${value}%`])
      return true
    }
  } catch {
    // fall through
  }
  return false
})

export const setVolume = async (percent: number): Promise<boolean> => (await applyVolume(clamp(percent))) ?? false

// ---------------------------------------------------------------------------
// Brightness (all screens that accept it)

export interface BrightnessResult {
  laptop: number // laptop screens set
  external: number // external monitors set
}

export async function getBrightness(): Promise<number | null> {
  try {
    if (process.platform === 'win32') return asLevel(await send('bri get'))
    if (process.platform === 'linux') {
      const out = await run('brightnessctl', ['-m']) // name,class,current,percent,max
      const m = out.match(/,(\d+)%,/)
      return m ? Number(m[1]) : null
    }
  } catch {
    // fall through
  }
  return null
}

const applyBrightness = latestOnly(async (value): Promise<BrightnessResult> => {
  if (process.platform === 'win32') {
    const [laptop, external] = (await send(`bri set ${value}`)).split(' ').map(Number)
    return { laptop: laptop || 0, external: external || 0 }
  }
  if (process.platform === 'linux') {
    let laptop = 0
    let external = 0
    await run('brightnessctl', ['set', `${value}%`]).then(() => laptop++, () => undefined)
    await run('ddcutil', ['setvcp', '10', String(value)]).then(() => external++, () => undefined)
    return { laptop, external }
  }
  return { laptop: 0, external: 0 }
})

export const setBrightness = async (percent: number): Promise<BrightnessResult> =>
  (await applyBrightness(clamp(percent)).catch(() => undefined)) ?? { laptop: 0, external: 0 }

// ---------------------------------------------------------------------------
// Per-app volume. If the app isn't playing, the level is remembered and
// applied as soon as it starts making sound (checked every 2 seconds).

const SAFE_NAME = /^[\w .()+-]{1,64}$/ // program names only; nothing that could act as a command
const remembered = new Map<string, number>() // app name -> level waiting to be applied
let retryTimer: NodeJS.Timeout | null = null

async function trySetAppVolume(name: string, value: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') return Number(await send(`app set ${value} ${name}`)) > 0
    if (process.platform === 'linux') {
      // find this program's audio streams ("sink inputs")
      const out = await run('pactl', ['list', 'sink-inputs'])
      const want = name.toLowerCase().replace(/\.exe$/, '')
      let done = 0
      for (const block of out.split(/\n(?=Sink Input #)/)) {
        const id = block.match(/^Sink Input #(\d+)/)?.[1]
        const binary = block.match(/application\.process\.binary = "([^"]+)"/)?.[1]?.toLowerCase()
        if (id && binary === want) {
          await run('pactl', ['set-sink-input-volume', id, `${value}%`])
          done++
        }
      }
      return done > 0
    }
  } catch {
    // fall through
  }
  return false
}

function retryRemembered(): void {
  if (retryTimer || remembered.size === 0) return
  retryTimer = setInterval(async () => {
    for (const [name, value] of remembered) {
      if (await trySetAppVolume(name, value)) remembered.delete(name)
    }
    if (remembered.size === 0 && retryTimer) {
      clearInterval(retryTimer)
      retryTimer = null
    }
  }, 2000)
}

const appSetters = new Map<string, (value: number) => Promise<boolean | undefined>>()

// 'set': applied now. 'remembered': the app isn't playing; applied when it does.
export async function setAppVolume(name: string, percent: number): Promise<'set' | 'remembered' | 'invalid'> {
  const target = name.trim()
  if (!SAFE_NAME.test(target)) return 'invalid'
  const key = target.toLowerCase()
  let setter = appSetters.get(key)
  if (!setter) {
    setter = latestOnly((value) => trySetAppVolume(target, value))
    appSetters.set(key, setter)
  }
  const value = clamp(percent)
  if (await setter(value)) {
    remembered.delete(key)
    return 'set'
  }
  remembered.set(key, value)
  retryRemembered()
  return 'remembered'
}

export async function getAppVolume(name: string): Promise<number | null> {
  const target = name.trim()
  if (!SAFE_NAME.test(target) || process.platform !== 'win32') return null
  try {
    return asLevel(await send(`app get ${target}`))
  } catch {
    return null
  }
}

export function stopPcHelper(): void {
  if (retryTimer) clearInterval(retryTimer)
  retryTimer = null
  helper?.kill()
  helper = null
  ready = null
}
