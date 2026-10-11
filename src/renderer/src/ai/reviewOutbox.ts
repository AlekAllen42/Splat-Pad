import { useState } from 'react'
import type { Creation } from './mockAssistant'

// Creations and ideas the user chose to send to the Splat team for review.
// They wait here (on this computer) until sending is connected to our website.
export interface ReviewItem {
  id: string
  createdAt: string // ISO date
  request: string // what the user typed
  creation?: Creation // missing for an idea the assistant couldn't build
}

const STORAGE_KEY = 'splatpad.reviewOutbox'

function load(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ReviewItem[]) : []
  } catch {
    return []
  }
}

export function useReviewOutbox(): [ReviewItem[], (item: Omit<ReviewItem, 'id' | 'createdAt'>) => void] {
  const [items, setItems] = useState<ReviewItem[]>(load)
  const add = (item: Omit<ReviewItem, 'id' | 'createdAt'>): void => {
    setItems((prev) => {
      const next = [...prev, { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable; the item still shows for this session
      }
      return next
    })
  }
  return [items, add]
}
