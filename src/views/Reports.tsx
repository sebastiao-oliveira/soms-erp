import { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'

type Period = 'today' | 'week' | 'month' | 'custom'

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'PIX', card: 'Cartão', cash: 'Dinheiro',
  boleto: 'Boleto', credit: 'Crédito', misto: 'Misto'
}

export default function Reports() {
  const { sales, products, clients, appointments } = useStore()
  const [period, setPeriod] = useState<Period>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  // Calcula intervalo de datas do período selecionado
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    if (period === 'today') {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { startDate: start, endDate: end }
    }
    if (period === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return { startDate: start, endDate: end }
    }
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: start, endDate: end }
    }
    // custom
    const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(0)
    const customEndDate = customEnd ? new Date(customEnd + 'T23:59:59') : end
    return { startDate: start, endDate: customEndDate }
  }, [period, customStart, customEnd])

  // Vendas no período
  const periodSales = useMemo(() =>
    sales.filter(s => {
      const d = new Date(s.date)
      return s.status === 'completed' && d >= startDate && d <= endDate
    })
  , [sales, startDate, endDate])

  // Totais gerais
  const totalRevenue = useMemo(() => periodSales.reduce((s, sale) => s + sale.total, 0), [periodSales])
  const totalReceived = useMemo(() => periodSales.reduce((s, sale) => s + (sale.amountPaid ?? sale.total), 0), [periodSales])
  const totalPending = useMemo(() => periodSales.reduce((s, sale) => s + (sale.pending ?? 0), 0), [periodSales])
  const avgTicket = useMemo(() => periodSales.length > 0 ? totalRevenue / periodSales.length : 0, [totalRevenue, periodSales])

  // Produtos mais vendidos
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string, qty: number, revenue: number }> = {}
    periodSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 }
        map[item.productId].qty += item.qty
        map[item.productId].revenue += item.qty * item.price
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [periodSales])

  // Receita por forma de pagamento
  const byPayment = useMemo(() => {
    const map: Record<string, number> = {}
    periodSales.forEach(sale => {
      const method = sale.payment ?? 'outros'
      map[method] = (map[method] ?? 0) + sale.total
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [periodSales])

  // Vendas por dia (últimos 30 dias ou período)
  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {}
    periodSales.forEach(sale => {
      const day = new Date(sale.date).toLocaleDateString('pt-BR')
      map[day] = (map[day] ?? 0) + sale.total
    })
    return Object.entries(map).sort((a, b) => {
      const [da, ma, ya] = a[0].split('/').map(Number)
      const [db, mb, yb] = b[0].split('/').map(Number)
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()
    })
  }, [periodSales])

  // Serviços no período
  const periodAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.date)
      return a.status === 'completed' && d >= startDate && d <= endDate
    })
  , [appointments, startDate, endDate])

  const appointmentRevenue = useMemo(() =>
    periodAppointments.reduce((s, a) => s + (a.price ?? 0), 0)
  , [periodAppointments])

  // Cliente que mais comprou
  const topClients = useMemo(() => {
    const map: Record<string, { name: string, total: number, count: number }> = {}
    periodSales.forEach(sale => {
      if (!sale.client) return
      const client = clients.find(c => c.id === sale.client)
      const name = client?.name ?? sale.client
      if (!map[sale.client]) map[sale.client] = { name, total: 0, count: 0 }
      map[sale.client].total += sale.total
      map[sale.client].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [periodSales, clients])

  const periodLabel = { today: 'Hoje', week: 'Últimos 7 dias', month: 'Este mês', custom: 'Personalizado' }

  const maxDayRevenue = useMemo(() =>
    Math.max(...salesByDay.map(([, v]) => v), 1)
  , [salesByDay])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Relatórios</h2>
      </div>

      {/* Seletor de período */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['today', 'week', 'month', 'custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
              background: period === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: period === p ? '#000' : '#fff'
            }}>
              {periodLabel[p]}
            </button>
          ))}
          {period === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ width: 150 }} />
              <span style={{ color: 'var(--muted)' }}>até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ width: 150 }} />
            </>
          )}
        </div>
      </div>

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Faturamento</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{periodSales.length} vendas</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Recebido</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4a9eff' }}>R$ {fmt(totalReceived)}</div>
          {totalPending > 0 && (
            <div style={{ fontSize: 12, color: '#ffaa00', marginTop: 4 }}>Pendente: R$ {fmt(totalPending)}</div>
          )}
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Ticket Médio</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>R$ {fmt(avgTicket)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Serviços</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa' }}>R$ {fmt(appointmentRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{periodAppointments.length} serviços</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Gráfico de barras por dia */}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Vendas por Dia</h3>
          {salesByDay.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Sem vendas no período</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {salesByDay.map(([day, value]) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 70 }}>{day}</span>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, background: 'var(--accent)',
                      width: `${(value / maxDayRevenue) * 100}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                    R$ {fmt(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por forma de pagamento */}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Por Forma de Pagamento</h3>
          {byPayment.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Sem dados</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byPayment.map(([method, value]) => (
                <div key={method} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <span style={{ fontWeight: 600 }}>{PAYMENT_LABEL[method] ?? method}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(value)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Produtos mais vendidos */}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Produtos Mais Vendidos</h3>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Sem dados</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topProducts.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                      background: i === 0 ? '#ffaa00' : i === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                      color: i === 0 ? '#000' : '#fff'
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.qty} unidades</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Melhores clientes */}
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Melhores Clientes</h3>
          {topClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
              Nenhuma venda com cliente identificado
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topClients.map((c, i) => (
                <div key={c.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                      background: i === 0 ? '#4a9eff' : 'rgba(255,255,255,0.07)', color: '#fff'
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.count} compras</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(c.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
