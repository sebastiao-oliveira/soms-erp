import { useState, useEffect } from 'react'
import Header from './components/Header'
import Dashboard from './views/Dashboard'
import Clients from './views/Clients'
import Pos from './views/Pos'
import Finance from './views/Finance'
import StockManage from './views/StockManage'
import Appointments from './views/Appointments'
import Reports from './views/Reports'
import Invoice from './views/Invoice'
import Settings from './views/Settings'
import { StoreProvider } from './context/StoreContext'

type View = 'dashboard' | 'clients' | 'stock' | 'pos' | 'finance' | 'appointments' | 'reports' | 'invoice' | 'settings'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [companyName, setCompanyName] = useState(() =>
    localStorage.getItem('companyName') || "SOM's Gestão"
  )

  useEffect(() => {
    document.title = companyName || "SOM's Gestão"
    localStorage.setItem('companyName', companyName)
  }, [companyName])

  return (
    <StoreProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Barra do nome da empresa */}
        <div className="company-bar">
          <input
            className="company-name-input"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            title="Clique para editar o nome"
          />
        </div>

        {/* Header / Nav */}
        <header className="site-header">
          <div className="app-container">
            <Header onNavigate={setView} active={view} />
          </div>
        </header>

        {/* Conteúdo principal */}
        <main style={{ flex: 1 }}>
          <div className="main-inner">
            <section className={view === 'dashboard'    ? 'view active' : 'view'}><Dashboard /></section>
            <section className={view === 'clients'      ? 'view active' : 'view'}><Clients /></section>
            <section className={view === 'pos'          ? 'view active' : 'view'}><Pos /></section>
            <section className={view === 'stock'        ? 'view active' : 'view'}><StockManage /></section>
            <section className={view === 'finance'      ? 'view active' : 'view'}><Finance /></section>
            <section className={view === 'appointments' ? 'view active' : 'view'}><Appointments /></section>
            <section className={view === 'reports'      ? 'view active' : 'view'}><Reports /></section>
            <section className={view === 'invoice'      ? 'view active' : 'view'}><Invoice /></section>
            <section className={view === 'settings'     ? 'view active' : 'view'}><Settings /></section>
          </div>
        </main>

        <footer className="site-footer">
          © {new Date().getFullYear()} SOM's Consultoria — {companyName}
        </footer>
      </div>
    </StoreProvider>
  )
}
