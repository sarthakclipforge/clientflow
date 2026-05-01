/* src/components/Nav.jsx
   Desktop: collapsible left sidebar
   Mobile (<768px): fixed bottom tab bar
*/
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../lib/store'

// Desktop sidebar items (all 6)
const SIDEBAR_ITEMS = [
  { path: '/leads',    icon: '📋', label: 'Lead List' },
  { path: '/swiper',   icon: '👆', label: 'Swiper' },
  { path: '/crm',      icon: '📊', label: 'Pipeline' },
  { path: '/stats',    icon: '📈', label: 'Stats' },
  { path: '/import',   icon: '⬆️', label: 'Import' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

// Bottom tab items (5 tabs — Import & Settings go into "More")
const TAB_ITEMS = [
  { path: '/leads',  icon: '📋', label: 'Leads'    },
  { path: '/swiper', icon: '👆', label: 'Swiper'   },
  { path: '/crm',    icon: '📊', label: 'Pipeline' },
  { path: '/stats',  icon: '📈', label: 'Stats'    },
  { path: '__more',  icon: '☰',  label: 'More'     },
]

export default function Nav({ unreviewedCount = 0, fuDueCount = 0 }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { sidebarCollapsed, toggleSidebar } = useStore()
  const collapsed = sidebarCollapsed
  const [moreOpen, setMoreOpen] = useState(false)

  function badge(path) {
    if (path === '/swiper' && unreviewedCount > 0) return unreviewedCount
    if (path === '/crm'    && fuDueCount > 0)      return fuDueCount
    return 0
  }

  // ── Desktop Sidebar ─────────────────────────────────────────
  const Sidebar = (
    <aside
      className="hidden md:flex flex-col h-full shrink-0 border-r transition-all duration-200"
      style={{ width: collapsed ? '60px' : '200px', background: '#0d0d0d', borderColor: '#1e1e1e' }}
    >
      <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: '#1e1e1e' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-base"
          style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)' }}>🌊</div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-none">ClientFlow</div>
            <div className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Phase 2</div>
          </div>
        )}
      </div>

      <nav className="flex-1 py-2">
        {SIDEBAR_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.path)
          const b = badge(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : ''}
              className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-all duration-150 relative"
              style={{ background: active ? 'rgba(74,222,128,0.1)' : 'transparent', color: active ? '#4ade80' : '#6b6b6b' }}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              {b > 0 && (
                <span className="absolute top-1.5 right-1.5 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
                  style={{ background: item.path === '/crm' ? '#dc2626' : '#4ade80', color: '#000' }}>
                  {b}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <button onClick={toggleSidebar}
        className="flex items-center justify-center py-3 border-t text-sm transition-colors hover:text-white"
        style={{ borderColor: '#1e1e1e', color: '#4a4a4a' }}>
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )

  // ── Mobile Bottom Tab Bar ────────────────────────────────────
  const BottomBar = (
    <>
      {/* "More" slide-up sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMoreOpen(false)}>
          <div className="slide-up rounded-t-2xl p-4 pb-safe"
            style={{ background: '#141414', border: '1px solid #2a2a2a', paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}
            onClick={e => e.stopPropagation()}>
            <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: '#333' }} />
            {[
              { path: '/import',   icon: '⬆️', label: 'Import Leads' },
              { path: '/settings', icon: '⚙️', label: 'Settings'      },
            ].map(item => (
              <button key={item.path}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl mb-2"
                style={{ background: '#1c1c1c', color: '#e8e8e8' }}
                onClick={() => { navigate(item.path); setMoreOpen(false) }}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden border-t"
        style={{
          background: 'rgba(13,13,13,0.95)',
          borderColor: '#1e1e1e',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: `calc(60px + env(safe-area-inset-bottom))`,
        }}>
        {TAB_ITEMS.map(item => {
          const isMore   = item.path === '__more'
          const active   = !isMore && location.pathname.startsWith(item.path)
          const b        = badge(item.path)
          const color    = active ? '#4ade80' : '#555'

          return (
            <button
              key={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              style={{ color, minHeight: 44 }}
              onClick={() => {
                if (isMore) { setMoreOpen(v => !v) }
                else { navigate(item.path); setMoreOpen(false) }
              }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {b > 0 && (
                <span className="absolute top-1 right-[20%] text-[9px] font-bold rounded-full px-1 leading-none py-0.5"
                  style={{ background: item.path === '/crm' ? '#dc2626' : '#4ade80', color: '#000' }}>
                  {b}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )

  return <>{Sidebar}{BottomBar}</>
}
