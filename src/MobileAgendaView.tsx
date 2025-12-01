import React, { useMemo, useState } from 'react'
import type { SourceEvent } from './types'

type Props = {
  events: SourceEvent[]
  onEdit: (e: SourceEvent) => void
  onCreate: (date: string) => void
  lectors?: { id: string; name: string }[]
}

function startOfWeek(d: Date) {
  // Monday as start of week
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day // if Sunday (0) go back 6 days
  const res = new Date(d)
  res.setDate(d.getDate() + diff)
  res.setHours(0,0,0,0)
  return res
}

function formatDateHeader(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  } catch (e) {
    return dateStr
  }
}

function formatWeekRange(start: Date) {
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const s = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const e = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${s} — ${e}`
}

function toKey(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function MobileAgendaView({ events, onEdit, onCreate, lectors = [] }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  const weekDates = useMemo(() => {
    const arr: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      arr.push(toKey(d))
    }
    return arr
  }, [weekStart])

  const grouped = useMemo(() => {
    const map: Record<string, SourceEvent[]> = {}
    // initialize keys for week
    weekDates.forEach((k) => map[k] = [])
    events.forEach((ev) => {
      if (map[ev.date]) map[ev.date].push(ev)
    })
    return map
  }, [events, weekDates])

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(startOfWeek(d))
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(startOfWeek(d))
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()))
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={prevWeek} style={{ padding: '6px 8px' }}>◀</button>
        <div style={{ fontWeight: 700, flex: 1, textAlign: 'center' }}>{formatWeekRange(weekStart)}</div>
        <button onClick={nextWeek} style={{ padding: '6px 8px' }}>▶</button>
        <button onClick={goToToday} style={{ padding: '6px 8px' }}>Dnes</button>
      </div>

      {weekDates.map((date) => (
        <div key={date} style={{ marginBottom: 12, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#00b4d8', color: 'white', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>{formatDateHeader(date)}</div>
            <button onClick={() => onCreate(date)} style={{ background: 'white', color: '#00b4d8', borderRadius: 4, padding: '6px 8px', border: 'none' }}>+ Pridať</button>
          </div>
          <div>
            {(grouped[date] || []).sort((a,b)=>{
              if (a.startTime === b.startTime) return (a.slotIndex||0) - (b.slotIndex||0)
              return a.startTime.localeCompare(b.startTime)
            }).map((ev) => (
              <div key={ev.id} style={{ display: 'flex', padding: 8, borderBottom: '1px solid #f3f3f3', alignItems: 'center' }}>
                <div style={{ minWidth: 80, fontWeight: 600 }}>{ev.startTime?.slice(0,5)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{(lectors.find(l => l.id === (ev as any).lectorId)?.name) ?? ev.title}</div>
                </div>
                <div>
                  <button onClick={() => onEdit(ev)} style={{ padding: '6px 8px' }}>Upraviť</button>
                </div>
              </div>
            ))}
            {(grouped[date] || []).length === 0 && <div style={{ padding: 8, color: '#666' }}>Žiadne udalosti</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
