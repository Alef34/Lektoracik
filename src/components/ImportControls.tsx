import React, { useState } from 'react'
import Papa from 'papaparse'
import { Date } from 'firebase/ai'

type RawRow = Record<string, any>
type MappedEvent = {
  id: string
  date: string
  startTime: Date
  endTime?: Date
  slotIndex?: number
  title: string
}

type Props = {
  onImport: (events: MappedEvent[]) => void
}

const commonDateKeys = ['date', 'datum', 'day']
const commonTimeKeys = ['time', 'start', 'startTime', 'cas']
const commonEndKeys = ['end', 'endTime']
const commonLectorKeys = ['lector', 'lektor', 'name']
const commonSlotKeys = ['slot', 'slotIndex']

function detectColumns(rows: RawRow[]): string[] {
  if (!rows || rows.length === 0) return []
  return Object.keys(rows[0])
}

function guessColumn(cols: string[], candidates: string[]) {
  const lower = cols.map((c) => c.toLowerCase())
  for (const cand of candidates) {
    const idx = lower.indexOf(cand.toLowerCase())
    if (idx >= 0) return cols[idx]
  }
  return ''
}

export default function ImportControls({ onImport }: Props) {
  const [previewRows, setPreviewRows] = useState<RawRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mappings, setMappings] = useState({ date: '', time: '', end: '', lector: '', slot: '' })

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      if (ext === 'json') {
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            setPreviewRows(parsed)
            const cols = detectColumns(parsed)
            setColumns(cols)
            setMappings({
              date: guessColumn(cols, commonDateKeys) || cols[0] || '',
              time: guessColumn(cols, commonTimeKeys) || cols[1] || '',
              end: guessColumn(cols, commonEndKeys) || '',
              lector: guessColumn(cols, commonLectorKeys) || cols[2] || '',
              slot: guessColumn(cols, commonSlotKeys) || ''
            })
          }
        } catch (err) {
          alert('Neplatný JSON súbor')
        }
      } else {
        Papa.parse<RawRow>(text, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
          complete: (res) => {
            const data = res.data as RawRow[]
            setPreviewRows(data)
            const cols = detectColumns(data)
            setColumns(cols)
            setMappings({
              date: guessColumn(cols, commonDateKeys) || cols[0] || '',
              time: guessColumn(cols, commonTimeKeys) || cols[1] || '',
              end: guessColumn(cols, commonEndKeys) || '',
              lector: guessColumn(cols, commonLectorKeys) || cols[2] || '',
              slot: guessColumn(cols, commonSlotKeys) || ''
            })
          }
        })
      }
    }
    if (ext === 'json') reader.readAsText(file)
    else reader.readAsText(file)
  }

  function mapRowToEvent(row: RawRow, idx: number): MappedEvent | null {
    const dateRaw = row[mappings.date]
    const timeRaw = row[mappings.time]
    if (!dateRaw || !timeRaw) return null
    const lector = row[mappings.lector] || row['Lector'] || row['lektor'] || 'Unknown'
    const slotRaw = mappings.slot ? row[mappings.slot] : undefined
    const slotIndex = slotRaw ? parseInt(slotRaw as any, 10) : undefined
    const end = mappings.end ? row[mappings.end] : undefined
    const dateStr = String(dateRaw).trim()
    const timeStr = String(timeRaw).trim()
    const endStr = end ? String(end).trim() : undefined
    return {
      id: `${dateStr}_${timeStr}_${idx}`,
      date: dateStr,
      startTime: timeStr.includes(':') ? (timeStr.length === 5 ? timeStr + ':00' : timeStr) : timeStr,
      endTime: endStr && (endStr.includes(':') ? (endStr.length === 5 ? endStr + ':00' : endStr) : endStr),
      slotIndex: slotIndex !== undefined && !Number.isNaN(slotIndex) ? slotIndex : 0,
      title: String(lector)
    }
  }

  function handleImport() {
    const mapped: MappedEvent[] = []
    for (let i = 0; i < previewRows.length; i++) {
      const m = mapRowToEvent(previewRows[i], i)
      if (m) mapped.push(m)
    }
    onImport(mapped)
    setPreviewRows([])
    setColumns([])
  }

  return (
    <div style={{ marginBottom: 12, border: '1px solid #ddd', padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontWeight: 600 }}>Importovať JSON / CSV:</label>
        <input type="file" accept=".csv,.json" onChange={handleFile} />
        {previewRows.length > 0 && (
          <button onClick={handleImport} style={{ marginLeft: 'auto' }}>
            Importovať ({previewRows.length} riadkov)
          </button>
        )}
      </div>

      {columns.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12 }}>Stĺpec dátum</div>
              <select value={mappings.date} onChange={(e) => setMappings({ ...mappings, date: e.target.value })}>
                <option value="">--</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
                <div style={{ fontSize: 12 }}>Stĺpec času</div>
              <select value={mappings.time} onChange={(e) => setMappings({ ...mappings, time: e.target.value })}>
                <option value="">--</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
                <div style={{ fontSize: 12 }}>Koniec (voliteľné)</div>
              <select value={mappings.end} onChange={(e) => setMappings({ ...mappings, end: e.target.value })}>
                <option value="">--</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
                <div style={{ fontSize: 12 }}>Stĺpec lektora</div>
              <select value={mappings.lector} onChange={(e) => setMappings({ ...mappings, lector: e.target.value })}>
                <option value="">--</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
                <div style={{ fontSize: 12 }}>Stĺpec slotu (voliteľné)</div>
              <select value={mappings.slot} onChange={(e) => setMappings({ ...mappings, slot: e.target.value })}>
                <option value="">--</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {previewRows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Náhľad (prvých 10 riadkov)</div>
          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 4 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} style={{ padding: 4, borderBottom: '1px solid #f3f3f3' }}>{String(r[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
