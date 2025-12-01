import React from 'react'
import CalendarView from './CalendarView'

export default function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Lektorská služba — demo</h1>
      </header>
      <main>
        <CalendarView />
      </main>
    </div>
  )
}

