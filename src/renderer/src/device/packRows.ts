// Lays out the carousel's endless loop so every row is full.
//
// Apps are placed in order, wrapping back to the start of the list as often
// as needed, until the loop ends exactly at the end of a row *and* the end of
// the list, so it can repeat seamlessly. Example: 7 apps in 2 columns become
// 14 tiles in 7 rows (each app shown twice) instead of 4 rows with a gap.
//
// A double-wide tile that doesn't fit in the last spot of a row waits, and
// the next single-width app fills the spot; the wide one starts the next row.

export interface Slot<T> {
  item: T | null // null = empty spot (only when nothing can fill it)
  span: number // columns taken: 1, or 2 for a double-wide tile
}

const MAX_ROWS = 400 // safety limit for very long or awkward lists

export function packRows<T>(items: T[], spanOf: (item: T) => number, columns: number): Slot<T>[][] {
  if (items.length === 0 || columns < 1) return []
  const span = (item: T): number => Math.min(columns, Math.max(1, spanOf(item)))
  const anySingle = items.some((it) => span(it) === 1)

  const rows: Slot<T>[][] = []
  let next = 0 // index of the next app in the (wrapping) list
  let waiting: T[] = [] // double-wide tiles pushed to the next row
  let placed = 0

  while (rows.length < MAX_ROWS) {
    const row: Slot<T>[] = []
    let free = columns
    const nextWaiting: T[] = []

    // tiles that were waiting go first
    for (const it of waiting) {
      if (span(it) <= free) {
        row.push({ item: it, span: span(it) })
        free -= span(it)
      } else nextWaiting.push(it)
    }

    let guard = 0
    while (free > 0 && guard++ < columns + items.length * 2) {
      const it = items[next % items.length]
      if (span(it) <= free) {
        row.push({ item: it, span: span(it) })
        free -= span(it)
        next++
        placed++
      } else if (anySingle) {
        // too wide for the gap: save it for the next row, keep looking
        nextWaiting.push(it)
        next++
        placed++
      } else break // nothing narrow enough exists: leave the gap
    }
    if (free > 0) row.push({ item: null, span: free })

    rows.push(row)
    waiting = nextWaiting
    // seamless: back at the start of the list, nothing waiting, everything shown
    if (next % items.length === 0 && waiting.length === 0 && placed >= items.length) break
  }
  return rows
}
