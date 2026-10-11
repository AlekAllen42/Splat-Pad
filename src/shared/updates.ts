// What the app's updater is doing; shown in the ☰ menu and the tray menu.
export type UpdateStatus =
  | { state: 'dev' } // npm run dev: there's nothing installed to update
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'none' } // already the latest version
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string } // downloaded, installs on restart
  | { state: 'error' }
