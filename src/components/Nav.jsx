/* src/components/Nav.jsx — Left sidebar with badges */
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'

const NAV_ITEMS = [
  { path: '/leads',    icon: '📋', label: 'Lead List' },
  { path: '/swiper',   icon: '👆', label: 'Swiper' },
  { path: '/crm',      icon: '📊', label: 'Pipeline' },
  { path: '/stats',    icon: '📈', label: 'Stats' },
  { path: '/import',   icon: '⬆️', label: 'Import' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Nav({ unreviewedCount = 0, fuDueCount = 0 }) {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useStore()
  const collapsed = sidebarCollapsed

  return (
    <aside
      className="flex flex-col h-full shrink-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '60px' : '200px',
        background: '#0d0d0d',
        borderColor: '#1e1e1e',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: '#1e1e1e' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-base"
          style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)' }}>
          🌊
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-none">ClientFlow</div>
            <div className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Phase 2</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.path)
          const badge = item.path === '/swiper' && unreviewedCount > 0
            ? unreviewedCount
            : item.path === '/crm' && fuDueCount > 0
            ? fuDueCount
            : 0

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : ''}
              className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-all duration-150 group relative"
              style={{
                background: active ? 'rgba(74,222,128,0.1)' : 'transparent',
                color: active ? '#4ade80' : '#6b6b6b',
              }}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {badge > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
                  style={{ background: item.path === '/crm' ? '#dc2626' : '#4ade80', color: '#000' }}
                >
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center py-3 border-t text-sm transition-colors hover:text-white"
        style={{ borderColor: '#1e1e1e', color: '#4a4a4a' }}
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )
}
