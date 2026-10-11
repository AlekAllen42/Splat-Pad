// A two-way line connection to a device. The real USB serial port (Phase 2,
// once the board arrives) and the pretend Splat Pad window both provide one,
// so the connection manager doesn't care which it's talking to.
export interface Transport {
  readonly pretend: boolean
  write(line: string): void // one protocol message, without the trailing newline
  onLine(callback: (line: string) => void): void
  onClose(callback: () => void): void
  close(): void
}
