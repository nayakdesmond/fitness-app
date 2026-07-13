'use client'

import { useEffect, useState } from 'react'

function formatRestTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function RestTimerBar() {
  // End timestamp instead of a decrementing counter, so the timer stays
  // accurate when the phone locks or the tab is backgrounded.
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (endsAt === null) return

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        setEndsAt(null)
        setDone(true)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([200, 100, 200])
        }
      }
    }

    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [endsAt])

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
      <div className="max-w-2xl mx-auto">
        {endsAt !== null ? (
          <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-lg">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rest</span>
            <span className="text-2xl font-bold text-black tabular-nums">{formatRestTime(secondsLeft)}</span>
            <button
              onClick={() => setEndsAt(null)}
              className="text-sm font-semibold text-neutral-500 hover:text-black transition"
            >
              Skip
            </button>
          </div>
        ) : done ? (
          <button
            onClick={() => setDone(false)}
            className="w-full bg-green-600 rounded-xl px-4 py-3 shadow-lg text-white font-bold"
          >
            ✓ Rest done — go!
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-neutral-900/95 backdrop-blur rounded-xl px-3 py-2.5 border border-neutral-700 shadow-lg">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0">Rest</span>
            {[60, 90, 120, 180].map(secs => (
              <button
                key={secs}
                onClick={() => {
                  setDone(false)
                  setEndsAt(Date.now() + secs * 1000)
                }}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg py-1.5 text-sm font-bold text-white transition"
              >
                {formatRestTime(secs)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
