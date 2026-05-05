import { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'

type View = 'dashboard' | 'clients' | 'stock' | 'pos' | 'finance' | 'appointments' | 'reports' | 'invoice' | 'settings'

interface Props {
  onNavigate: (view: View) => void
  active: string
}

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'dashboard',    label: 'Dashboard' },
  { view: 'pos',          label: 'PDV' },
  { view: 'stock',        label: 'Estoque' },
  { view: 'clients',      label: 'Clientes' },
  { view: 'finance',      label: 'Financeiro' },
  { view: 'appointments', label: 'Serviços' },
  { view: 'reports',      label: 'Relatórios' },
  { view: 'invoice',      label: 'NF-e' },
  { view: 'settings',     label: 'Config.' },
]

export default function Header({ onNavigate, active }: Props) {
  const { alerts, getUnreadAlerts } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const unreadCount = useMemo(() => getUnreadAlerts().length, [alerts, getUnreadAlerts])

  const navigate = (view: View) => {
    onNavigate(view)
    setMenuOpen(false)
  }

  return (
    <>
      {/* ── Desktop nav ── */}
      <nav className="top-nav" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 4 }}>
        {NAV_ITEMS.map(({ view, label }) => (
          <button
            key={view}
            className={'nav-btn' + (active === view ? ' active' : '')}
            onClick={() => navigate(view)}
          >
            {label}
          </button>
        ))}
        {unreadCount > 0 && (
          <button
            className="nav-btn"
            onClick={() => navigate('dashboard')}
            style={{ background: 'rgba(255,68,68,0.15)', color: '#ff4444', marginLeft: 4 }}
          >
            🔔 {unreadCount}
          </button>
        )}

        {/* Botão hamburguer — só visível no mobile via CSS */}
        <button
          className="muted hamburger-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{ marginLeft: 'auto', display: 'none' }}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
        }} onClick={() => setMenuOpen(false)}>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 240,
            background: 'var(--bg2)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', padding: 20, gap: 4,
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              MENU
            </div>
            {NAV_ITEMS.map(({ view, label }) => (
              <button
                key={view}
                className={'nav-btn' + (active === view ? ' active' : '')}
                onClick={() => navigate(view)}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                {label}
              </button>
            ))}
            {unreadCount > 0 && (
              <button
                className="nav-btn"
                onClick={() => navigate('dashboard')}
                style={{ background: 'rgba(255,68,68,0.15)', color: '#ff4444', justifyContent: 'flex-start' }}
              >
                🔔 {unreadCount} alertas
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .top-nav > .nav-btn:not(.hamburger-btn) { display: none; }
          .hamburger-btn { display: inline-flex !important; }
        }
      `}</style>
    </>
  )
}
