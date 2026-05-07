import { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'

type View =
  | 'dashboard'
  | 'clients'
  | 'stock'
  | 'pos'
  | 'finance'
  | 'appointments'
  | 'reports'
  | 'invoice'
  | 'settings'

interface Props {
  onNavigate: (view: View) => void
  active: string
}

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'pos', label: 'PDV' },
  { view: 'stock', label: 'Estoque' },
  { view: 'clients', label: 'Clientes' },
  { view: 'finance', label: 'Financeiro' },
  { view: 'appointments', label: 'Serviços' },
  { view: 'reports', label: 'Relatórios' },
  { view: 'invoice', label: 'NF-e' },
  { view: 'settings', label: 'Config.' },
]

export default function Header({ onNavigate, active }: Props) {
  const { alerts, getUnreadAlerts } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const unreadCount = useMemo(
    () => getUnreadAlerts().length,
    [alerts, getUnreadAlerts]
  )

  const navigate = (view: View) => {
    onNavigate(view)
    setMenuOpen(false)
  }

  return (
    <>
      {/* DESKTOP */}
      <nav
        className="top-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 4,
        }}
      >
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
            style={{
              marginLeft: 4,
            }}
          >
            {unreadCount}
          </button>
        )}

        {/* MOBILE BUTTON */}
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
        >
          ☰
        </button>
      </nav>

      {/* MOBILE MODAL */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mobile-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <button
                className="mobile-close-btn"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mobile-menu-items">
              {NAV_ITEMS.map(({ view, label }) => (
                <button
                  key={view}
                  className={
                    'mobile-nav-btn' + (active === view ? ' active' : '')
                  }
                  onClick={() => navigate(view)}
                >
                  {label}
                </button>
              ))}

              {unreadCount > 0 && (
                <button
                  className="mobile-nav-btn"
                  onClick={() => navigate('dashboard')}
                >
                  Alertas ({unreadCount})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hamburger-btn {
          display: none;
          margin-left: auto;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: rgba(255,255,255,0.05);
          color: inherit;
          font-size: 18px;
        }

        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .mobile-menu {
          width: calc(100% - 32px);
          max-width: 340px;
          border-radius: 16px;
          padding: 16px;
          background: var(--bg2);
          border: 1px solid var(--border);
        }

        .mobile-menu-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .mobile-close-btn {
          border: none;
          background: transparent;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
        }

        .mobile-menu-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-nav-btn {
          width: 100%;
          text-align: left;
          padding: 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: rgba(255,255,255,0.04);
          color: inherit;
          font-size: 14px;
          transition: 0.2s;
        }

        .mobile-nav-btn.active {
          font-weight: 600;
        }

        @media (max-width: 700px) {
          .top-nav > .nav-btn {
            display: none;
          }

          .hamburger-btn {
            display: block;
          }
        }
      `}</style>
    </>
  )
}