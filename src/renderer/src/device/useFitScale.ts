import { useEffect, useRef, useState } from 'react'

// How much to shrink something of size width x height so it fits inside the
// element `ref` is attached to. Updates when the window is resized.
export function useFitScale(width: number, height: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setScale(Math.min(box.width / width, box.height / height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [width, height])
  return [ref, scale]
}
