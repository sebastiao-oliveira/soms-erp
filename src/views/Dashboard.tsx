import { useMemo } from 'react'
import { useStore } from '../context/StoreContext'

export default function Dashboard() {
  const { products, sales, clients, appointments, alerts, cashEntries, markAlertRead } = useStore()

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const completedSales = useMemo(() => sales.filter(s => s.status === 'completed'), [sales])
  const totalRevenue   = useMemo(() => completedSales.reduce((s, sale) => s + sale.total, 0), [completedSales])
  const totalPending   = useMemo(() => cashEntries.reduce((s, e) => s + (e.pending ?? 0), 0), [cashEntries])
  const lowStock       = useMemo(() => products.filter(p => p.qty <= p.minQty), [products])
  const unreadAlerts   = useMemo(() => alerts.filter(a => !a.read), [alerts])

  const todaySales = useMemo(() => {
    const today = new Date().toDateString()
    return completedSales.filter(s => new Date(s.date).toDateString() === today)
  }, [completedSales])

  const todayRevenue = useMemo(() => todaySales.reduce((s, sale) => s + sale.total, 0), [todaySales])

  const recentSales = useMemo(() =>
    [...completedSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  , [completedSales])

  const upcomingAppointments = useMemo(() => {
    const now = new Date()
    return appointments
      .filter(a => a.status === 'scheduled' && new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }, [appointments])

  const PAYMENT_LABEL: Record<string, string> = {
    pix: 'PIX', card: 'Cartão', cash: 'Dinheiro', boleto: 'Boleto', credit: 'Crédito', misto: 'Misto'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Cards principais */}
      <div className="grid-4">
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receita Total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{completedSales.length} vendas</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hoje</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>R$ {fmt(todayRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{todaySales.length} vendas hoje</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>A Receber</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalPending > 0 ? '#ffaa00' : '#44dd88' }}>
            R$ {fmt(totalPending)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>valores pendentes</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clientes</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{clients.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>cadastrados</div>
        </div>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid-4">
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produtos</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{products.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>no catálogo</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estoque Baixo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: lowStock.length > 0 ? '#ffaa00' : '#44dd88' }}>
            {lowStock.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>produtos críticos</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços Agendados</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
            {appointments.filter(a => a.status === 'scheduled').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>próximos</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alertas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: unreadAlerts.length > 0 ? '#ff4444' : '#44dd88' }}>
            {unreadAlerts.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>não lidos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Vendas recentes */}
        <div className="panel">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Vendas Recentes</h3>
          {recentSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              Nenhuma venda ainda
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSales.map(sale => (
                <div key={sale.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>#{sale.id.slice(-6)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(sale.date).toLocaleDateString('pt-BR')} • {PAYMENT_LABEL[sale.payment] ?? sale.payment}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(sale.total)}</div>
                    {(sale.pending ?? 0) > 0 && (
                      <div style={{ fontSize: 11, color: '#ffaa00' }}>Pend: R$ {fmt(sale.pending!)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos serviços */}
        <div className="panel">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Próximos Serviços</h3>
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              Nenhum agendamento
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingAppointments.map(apt => (
                <div key={apt.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{apt.service}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {apt.date} às {apt.time}
                    </div>
                  </div>
                  <span className="badge badge-info">Agendado</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de estoque */}
        {unreadAlerts.length > 0 && (
          <div className="panel">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Alertas de Estoque</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unreadAlerts.slice(0, 5).map(a => (
                <div key={a.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                  borderLeft: `3px solid ${a.severity === 'critical' ? '#ff4444' : a.severity === 'warning' ? '#ffaa00' : '#4a9eff'}`
                }}>
                  <div style={{ fontSize: 13, flex: 1 }}>{a.message}</div>
                  <button className="muted" onClick={() => markAlertRead(a.id)}
                    style={{ padding: '4px 10px', fontSize: 11, marginLeft: 8 }}>✓</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estoque crítico */}
        {lowStock.length > 0 && (
          <div className="panel">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Estoque Crítico</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowStock.slice(0, 6).map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category}</div>
                  </div>
                  <span className={`badge ${p.qty === 0 ? 'badge-danger' : 'badge-warning'}`}>
                    {p.qty} un
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
