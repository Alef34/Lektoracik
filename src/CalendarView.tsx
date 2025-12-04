import React, { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import initialEvents from './data/events.json'
import lectorsRaw from './data/lectors.json'
import { initFirebase, subscribeEvents, addEventFirestore, updateEventFirestore, deleteEventFirestore, getEventFirestore } from './firebase'
import skLocale from '@fullcalendar/core/locales/sk'
import EventModal from './components/EventModal'
import MobileAgendaView from './MobileAgendaView'
import type { SourceEvent } from './types'

// FullCalendar CSS imports removed — using minimal local styles in `src/styles.css`

function toCalendarEvent(e: SourceEvent) {
  const start = `${e.date}T${e.startTime}`
  const end = e.endTime ? `${e.date}T${e.endTime}` : undefined
  // show lector name if available
  let title = e.title
  try {
    const found = (lectorsRaw as any[]).find(l => l.id === (e as any).lectorId)
    if (found) title = found.name
  } catch (err) {
    // ignore
  }
  return {
    id: e.id,
    title,
    start,
    end,
    extendedProps: { slotIndex: e.slotIndex }
  }
}

export default function CalendarView() {
  const [eventsSrc, setEventsSrc] = useState<SourceEvent[]>(() => {
    try {
      const raw = localStorage.getItem('events')
      if (raw) return JSON.parse(raw) as SourceEvent[]
    } catch (e) {}
    return initialEvents as SourceEvent[]
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SourceEvent | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(true)
  const [useFullCalendar, setUseFullCalendar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('useFullCalendar') === '1'
    } catch (e) {
      return false
    }
  })
  type SlotOption = { time: string; slotIndex: number; label?: string; used?: boolean }
  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([])
  const lectors = (lectorsRaw as { id: string; name: string }[])
  const [firebaseEnabled, setFirebaseEnabled] = useState<boolean>(false)
  const [showDayOverrides, setShowDayOverrides] = useState(false)
  const [dayOverrides, setDayOverrides] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('dayOverrides')
      return raw ? JSON.parse(raw) as Record<string, number> : {}
    } catch (e) {
      return {}
    }
  })

  function saveDayOverrides(ov: Record<string, number>) {
    setDayOverrides(ov)
    try { localStorage.setItem('dayOverrides', JSON.stringify(ov)) } catch (e) {}
  }

  useEffect(() => {
    // default behaviour: mobile layout unless `useFullCalendar` is true
    setIsMobile(!useFullCalendar)
  }, [useFullCalendar])


  function openCreate(initial?: Partial<SourceEvent>) {
    const ev = initial ? ({ id: '', title: initial.title || '', date: initial.date || '', startTime: initial.startTime || '08:00:00', endTime: initial.endTime, slotIndex: initial.slotIndex ?? 0 }) : null
    // compute available times for the date (existing start times on that date)
    if (ev && ev.date) {
      const slots: SlotOption[] = []
      const master = getMasterScheduleForDate(ev.date)
      // used slots (exclude this editing event id if present)
      const used = new Set(eventsSrc.filter(e => e.date === ev.date && e.id !== ev.id).map(e => `${e.startTime}|${e.slotIndex ?? 0}`))
      master.forEach((m) => {
        for (let i = 0; i < m.count; i++) {
          const key = `${m.time}|${i}`
          const isUsed = used.has(key)
          const timeLabel = m.time.slice(0,5)
          const readingLabel = m.count > 1 ? `Čítanie ${i+1}` : ''
          const label = readingLabel ? `${timeLabel} — ${readingLabel}` : timeLabel
          slots.push({ time: m.time, slotIndex: i, label, used: isUsed })
        }
      })
      setAvailableSlots(slots)
    } else {
      setAvailableSlots([])
    }
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function openEdit(ev: SourceEvent) {
    // compute available start times for this date
    const slots: SlotOption[] = []
    const master = getMasterScheduleForDate(ev.date)
    const used = new Set(eventsSrc.filter(e => e.date === ev.date && e.id !== ev.id).map(e => `${e.startTime}|${e.slotIndex ?? 0}`))
    master.forEach((m) => {
      for (let i = 0; i < m.count; i++) {
        const key = `${m.time}|${i}`
        const isUsed = used.has(key)
        slots.push({ time: m.time, slotIndex: i, label: m.count > 1 ? `${m.time.slice(0,5)} (slot ${i+1})` : `${m.time.slice(0,5)}`, used: isUsed })
      }
    })
    setAvailableSlots(slots)
    setEditingEvent(ev)
    setModalOpen(true)
  }

  // initialize Firebase (if `public/firebaseConfig.json` exists) and subscribe; otherwise use localStorage
  useEffect(() => {
    let unsub: any | undefined
    let mounted = true
    initFirebase().then((ok) => {
      if (!mounted) return
      if (ok) {
        setFirebaseEnabled(true)
        unsub = subscribeEvents((items) => {
          // items are stored as DB docs (id + fields)
          setEventsSrc(items as SourceEvent[])
        })
      } else {
        setFirebaseEnabled(false)
      }
    })
    return () => { mounted = false; if (unsub) unsub() }
  }, [])

  // persist events to localStorage when NOT using Firebase
  useEffect(() => {
    if (firebaseEnabled) return
    try { localStorage.setItem('events', JSON.stringify(eventsSrc)) } catch (e) {}
  }, [eventsSrc, firebaseEnabled])

  function getMasterScheduleForDate(dateStr: string) {
    // weekday: 0 Sunday .. 6 Saturday
    const d = new Date(dateStr)
    let wd = d.getDay()
    // apply override if configured for this date
    try {
      if (dayOverrides && dayOverrides[dateStr] !== undefined) {
        wd = dayOverrides[dateStr]
      }
    } catch (e) {}
    // times stored as HH:MM:SS
    if (wd >= 1 && wd <= 5) {
      return [{ time: '06:30:00', count: 1 }, { time: '18:00:00', count: 1 }]
    }
    if (wd === 6) {
      return [{ time: '06:30:00', count: 1 }, { time: '18:00:00', count: 2 }]
    }
    // Sunday wd === 0
    return [
      { time: '06:30:00', count: 2 },
      { time: '08:00:00', count: 2 },
      { time: '09:30:00', count: 2 },
      { time: '18:00:00', count: 2 }
    ]
  }

  function handleSaveEvent(payload: any) {
    const normalizeTime = (t?: string) => {
      if (!t) return undefined
      return t.length === 5 ? t + ':00' : t
    }

    const toSave = { ...payload, startTime: normalizeTime(payload.startTime), endTime: normalizeTime(payload.endTime) }
    if (firebaseEnabled) {
      ;(async () => {
        try {
          if (payload.id) {
            await updateEventFirestore(payload.id, toSave)
          } else {
            await addEventFirestore(toSave)
          }
        } catch (err) {
          console.error('Firestore save failed', err)
          // fall back to local state update
          if (payload.id) {
            setEventsSrc((prev) => prev.map((p) => p.id === payload.id ? { ...p, ...toSave } : p))
          } else {
            const id = `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            setEventsSrc((prev) => [...prev, { ...toSave, id }])
          }
        }
      })()
    } else {
      if (payload.id) {
        setEventsSrc((prev) => prev.map((p) => p.id === payload.id ? { ...p, ...toSave } : p))
      } else {
        const id = `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        setEventsSrc((prev) => [...prev, { ...toSave, id }])
      }
    }
    setModalOpen(false)
    setEditingEvent(null)
  }

  function handleDeleteEvent(id?: string) {
    if (!id) return
    if (firebaseEnabled) {
      ;(async () => {
        try {
          await deleteEventFirestore(id)
        } catch (err) {
          console.error('Firestore delete failed', err)
          setEventsSrc((prev) => prev.filter((p) => p.id !== id))
        }
      })()
    } else {
      setEventsSrc((prev) => prev.filter((p) => p.id !== id))
    }
    setModalOpen(false)
    setEditingEvent(null)
  }

  const events = eventsSrc.map(toCalendarEvent)

  function handleDateClick(arg: any) {
    const dt = arg.dateStr
    const [d, t] = dt.split('T')
    openCreate({ date: d, startTime: t ? (t.length === 8 ? t : t + ':00') : '08:00:00' })
  }

  function handleEventClick(clickInfo: any) {
    const ev = clickInfo.event
    const id = ev.id
    const src = eventsSrc.find((e) => e.id === id)
    if (src) openEdit(src)
  }

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
console.log("Is localhost:", isLocalhost)

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={useFullCalendar} onChange={(e) => { setUseFullCalendar(e.target.checked); try { localStorage.setItem('useFullCalendar', e.target.checked ? '1' : '0') } catch (err) {} }} />
            <span style={{ fontSize: 13 }}>Zobraziť plný kalendár &copy;{__APP_VERSION__}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: firebaseEnabled ? 'green' : '#888' }}>{firebaseEnabled ? 'Realtime: ON' : 'Realtime: OFF'}</div>
            {firebaseEnabled && isLocalhost && (
              <button onClick={async () => {
                try {
                  const raw = localStorage.getItem('events')
                  if (!raw) { alert('Žiadne lokálne udalosti na migráciu'); return }
                  const arr = JSON.parse(raw) as any[]
                  let count = 0
                  //await getEventFirestore()
                  for (const ev of arr) {
                   console.log('Migrating event to Firestore:', arr)
                    if (ev.id) {
                      await updateEventFirestore(ev.id, ev)
                    } else {
                    console.log('Adding event to Firestore:', ev)
                   await addEventFirestore(ev)
                    
                   
                    console.log('Event migrated.')
                    }
                    count++
                  }
                  alert(`Migrácia dokončená: ${count} udalostí odoslaných do Firestore.`)
                } catch (err) {
                  console.error(err)
                  alert('Migrácia zlyhala, skontrolujte konzolu')
                }
              }} style={{ padding: '6px 8px' }}>Migrovať lokálne udalosti do Firestore</button>
            )}
          </div>
          <button onClick={() => setShowDayOverrides(true)} style={{ padding: '6px 8px' }}>Nastavenia dní</button>
        </div>
      </div>

      {showDayOverrides && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ width: 520, background: 'white', padding: 16, borderRadius: 6 }}>
            <h3 style={{ marginTop: 0 }}>Nastavenia dní (override)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input id="override-date" type="date" />
              <select id="override-target">
                <option value="">Vybrať režim (napr. Nedeľa)</option>
                <option value="0">Nedeľa</option>
                <option value="1">Pondelok</option>
                <option value="2">Utorok</option>
                <option value="3">Streda</option>
                <option value="4">Štvrtok</option>
                <option value="5">Piatok</option>
                <option value="6">Sobota</option>
              </select>
              <button onClick={() => {
                const dateEl = document.getElementById('override-date') as HTMLInputElement | null
                const sel = document.getElementById('override-target') as HTMLSelectElement | null
                if (!dateEl || !sel) return
                const d = dateEl.value
                const v = sel.value
                if (!d || !v) { alert('Vyplňte dátum a režim'); return }
                const n = parseInt(v, 10)
                const next = { ...dayOverrides }
                next[d] = n
                saveDayOverrides(next)
              }}>Pridať / Uložiť</button>
            </div>
            <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
              {Object.keys(dayOverrides).length === 0 && <div>Žiadne prepísané dni</div>}
              {Object.entries(dayOverrides).map(([date, wd]) => (
                <div key={date} style={{ display: 'flex', justifyContent: 'space-between', padding: 6, borderBottom: '1px solid #f3f3f3' }}>
                  <div>{date} — {( ['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'] )[wd]}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => {
                      const next = { ...dayOverrides }
                      delete next[date]
                      saveDayOverrides(next)
                    }}>Odstrániť</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowDayOverrides(false)}>Zavrieť</button>
            </div>
          </div>
        </div>
      )}
      
      {isMobile ? (
        <MobileAgendaView
          events={eventsSrc}
            onEdit={(e) => { setEditingEvent(e); setModalOpen(true) }}
            onCreate={(date) => { openCreate({ date, startTime: '08:00:00' }) }}
            lectors={lectors}
        />
      ) : (
        <FullCalendar
          locale={skLocale}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
          allDaySlot={false}
          slotMinTime="05:00:00"
          slotMaxTime="22:00:00"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          nowIndicator={true}
          height="auto"
        />
      )}

      <EventModal
        open={modalOpen}
        initial={editingEvent}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        availableTimes={availableSlots}
        lectors={lectors}
      />
    </div>
  )
}
