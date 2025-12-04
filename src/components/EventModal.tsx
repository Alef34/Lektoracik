import React, { useEffect, useState } from 'react'

type EventData = {
  id?: string
  title: string
  date: string
  startTime: string
  slotIndex?: number
  lectorId?: string
}

type SlotOption = { time: string; slotIndex: number; label?: string; used?: boolean }

type Props = {
  open: boolean
  initial?: EventData | null
  onClose: () => void
  onSave: (e: EventData) => void
  onDelete?: (id: string) => void
  availableTimes?: SlotOption[]
  lectors?: { id: string; name: string }[]
}

export default function EventModal({ open, initial, onClose, onSave, onDelete, availableTimes = [], lectors = [] }: Props) {
  const [lectorId, setLectorId] = useState<string | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  // store times in `HH:MM:SS` format internally
  const [startTime, setStartTime] = useState('08:00:00')
  const [slotIndex, setSlotIndex] = useState(0)

  useEffect(() => {
    if (open && initial) {
      setTitle(initial.title || '')
      setDate(initial.date || '')
      setStartTime(initial.startTime || '08:00:00')
      setSlotIndex(initial.slotIndex ?? 0)
      setLectorId((initial as any).lectorId)
    } else if (open && !initial) {
      setTitle('')
      setDate('')
      setStartTime('08:00:00')
      setSlotIndex(0)
    }
  }, [open, initial])

  if (!open) return null

  function ensureSeconds(t: string | undefined) {
    if (!t) return undefined
    if (t.length === 8) return t
    if (t.length === 5) return `${t}:00`
    return t
  }

  function handleSave() {
    if (!date || !startTime) {
      alert('Please provide date and start time')
      return
    }
    const payload: EventData = {
      id: initial?.id,
      title: title || 'Lektor',
      date,
      startTime: ensureSeconds(startTime) as string,
      slotIndex: slotIndex ?? 0,
      lectorId: lectorId || undefined
    }
    console.log("Saving event:", payload)
    onSave(payload)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 460, background: 'white', padding: 16, borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>{initial ? 'Udalosť' : 'Nová udalosť'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 12 }}>Lektor</label>
            <select value={lectorId || ''} onChange={(e) => {
              const v = e.target.value || undefined
              setLectorId(v)
              const found = lectors.find(l => l.id === v)
              if (found) setTitle(found.name)
            }} style={{ width: '100%' }}>
              <option value="">(vyber lektora)</option>
              {lectors.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12 }}>Dátum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ fontSize: 12 }}>Čas</label>
            <select value={`${startTime}|${slotIndex}`} onChange={(e) => {
              const [t, s] = e.target.value.split('|')
              setStartTime(t)
              setSlotIndex(parseInt(s || '0', 10))
            }} style={{ width: '100%' }}>
              <option value="">Vybrať čas</option>
              {availableTimes.map((a, i) => (
                <option key={i} value={`${a.time}|${a.slotIndex}`} disabled={!!a.used}>{a.label ?? a.time.slice(0,5)}{a.used ? ' (obsadené)' : ''}</option>
              ))}
            </select>
          </div>

          {/* End Time removed by user request */}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          {initial?.id && onDelete && (
            <button onClick={() => { if (initial.id) onDelete(initial.id) }} style={{ background: '#ffe6e6' }}>Vymazať</button>
          )}
          <button onClick={onClose}>Zrušiť</button>
          <button onClick={handleSave} style={{ background: '#2b8aef', color: 'white' }}>{initial?.id ? 'Uložiť' : 'Vytvoriť'}</button>
        </div>
      </div>
    </div>
  )
}
