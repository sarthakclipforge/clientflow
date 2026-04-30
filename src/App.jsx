/* src/App.jsx — Router + layout shell */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import Nav from './components/Nav'
import { leadsDB, outreachDB } from './lib/db'
import { Toaster } from 'react-hot-toast'

const LeadList   = lazy(() => import('./pages/LeadList'))
const Swiper     = lazy(() => import('./pages/Swiper'))
const Research   = lazy(() => import('./pages/Research'))
const MakeContact = lazy(() => import('./pages/MakeContact'))
const CRM        = lazy(() => import('./pages/CRM'))
const Stats      = lazy(() => import('./pages/Stats'))
const Settings   = lazy(() => import('./pages/Settings'))
const Import     = lazy(() => import('./pages/Import'))

function Loader() {
  return (
    <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>
      Loading…
    </div>
  )
}

export default function App() {
  const [counts, setCounts] = useState({ unreviewed: 0, fuDue: 0 })

  // Fetch badge counts periodically
  useEffect(() => {
    fetchCounts()
    const timer = setInterval(fetchCounts, 30000)
    return () => clearInterval(timer)
  }, [])

  async function fetchCounts() {
    const [unreviewedLeads, fuItems] = await Promise.all([
      leadsDB.getAll({ status: 'unreviewed' }),
      outreachDB.getDueFollowUps(),
    ])
    setCounts({
      unreviewed: unreviewedLeads.length,
      fuDue: fuItems.length,
    })
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1c1c1c', color: '#e8e8e8', border: '1px solid #2a2a2a', fontSize: 13 }
      }} />
      <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
        <Nav unreviewedCount={counts.unreviewed} fuDueCount={counts.fuDue} />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/"            element={<Navigate to="/leads" replace />} />
              <Route path="/leads"       element={<LeadList />} />
              <Route path="/swiper"      element={<Swiper />} />
              <Route path="/research/:leadId" element={<Research />} />
              <Route path="/contact/:leadId"  element={<MakeContact />} />
              <Route path="/crm"         element={<CRM />} />
              <Route path="/stats"       element={<Stats />} />
              <Route path="/settings"    element={<Settings />} />
              <Route path="/import"      element={<Import />} />
              <Route path="*"            element={<Navigate to="/leads" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
