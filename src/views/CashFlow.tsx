import { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'

type Tab = 'fluxo' | 'dre' | 'projecao'

export default function CashFlow() {
  const { cashEntries, sales, products } = useStore()
  const [tab, setTab] = useState<Tab>('fluxo')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const [year, monthNum] = month.split('-').map(Number)
  const startOfMonth = new Date(year, monthNum - 1, 1)
  const endOfMonth   = new Date(year, monthNum, 0, 23, 59, 59)

  // Entradas do mês
  const monthEntries = useMemo(() =>
    cashEntries.filter(e => {
      const d = new Date(e.date)
      return d >= startOfMonth && d <= endOfMonth
    })
  , [cashEntries, startOfMonth, endOfMonth])

  const totalIncome  = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amountPaid ?? 0), 0)
  , [monthEntries])
  const totalExpense = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount ?? 0), 0)
  , [monthEntries])
  const totalPending = useMemo(() =>
    monthEntries.reduce((s, e) => s + (e.pending ?? 0), 0)
  , [monthEntries])
  const balance = totalIncome - totalExpense

  // Por semana do mês
  const byWeek = useMemo(() => {
    const weeks: Record<number, { income: number; expense: number }> = { 1: { income: 0, expense: 0 }, 2: { income: 0, expense: 0 }, 3: { income: 0, expense: 0 }, 4: { income: 0, expense: 0 } }
    monthEntries.forEach(e => {
      const day  = new Date(e.date).getDate()
      const week = Math.min(4, Math.ceil(day / 7))
      if (e.type === 'income') weeks[week].income += e.amountPaid ?? 0
      else weeks[week].expense += e.amount ?? 0
    })
    return weeks
  }, [monthEntries])

  // Por categoria
  const byCategory = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    monthEntries.forEach(e => {
      const cat = e.category || 'Outros'
      if (!map[cat]) map[cat] = { income: 0, expense: 0 }
      if (e.type === 'income') map[cat].income += e.amountPaid ?? 0
      else map[cat].expense += e.amount ?? 0
    })
    return Object.entries(map).sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
  }, [monthEntries])

  // DRE simplificado
  const monthSales = useMemo(() =>
    sales.filter(s => {
      const d = new Date(s.date)
      return s.status === 'completed' && d >= startOfMonth && d <= endOfMonth
    })
  , [sales, startOfMonth, endOfMonth])

  const grossRevenue  = useMemo(() => monthSales.reduce((s, sale) => s + sale.total, 0), [monthSales])
  const totalCOGS     = useMemo(() => {
    return monthSales.reduce((s, sale) => {
      return s + sale.items.reduce((is, item) => {
        const p = products.find(pr => pr.id === item.productId)
        return is + (p?.cost ?? 0) * item.qty
      }, 0)
    }, 0)
  }, [monthSales, products])
  const grossProfit   = grossRevenue - totalCOGS
  const grossMargin   = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
  const operatingExp  = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount ?? 0), 0)
  const ebitda        = grossProfit - operatingExp

  // Projeção: média dos últimos 3 meses
  const projection = useMemo(() => {
    const months = [1, 2, 3].map(offset => {
      const d = new Date(year, monthNum - 1 - offset, 1)
      const e = new Date(year, monthNum - offset, 0, 23, 59, 59)
      const inc = cashEntries.filter(ce => {
        const cd = new Date(ce.date)
        return ce.type === 'income' && cd >= d && cd <= e
      }).reduce((s, ce) => s + (ce.amountPaid ?? 0), 0)
      const exp = cashEntries.filter(ce => {
        const cd = new Date(ce.date)
        return ce.type === 'expense' && cd >= d && cd <= e
      }).reduce((s, ce) => s + (ce.amount ?? 0), 0)
      return { inc, exp }
    })
    const avgInc = months.reduce((s, m) => s + m.inc, 0) / 3
    const avgExp = months.reduce((s, m) => s + m.exp, 0) / 3
    return { income: avgInc, expense: avgExp, balance: avgInc - avgExp }
  }, [cashEntries, year, monthNum])

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: tab === t ? '#000' : '#fff', transition: 'all 0.2s'
  })

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1)
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Fluxo de Caixa</h2>
        <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: 200 }}>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Entradas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(totalIncome)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Saídas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4444' }}>R$ {fmt(totalExpense)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Saldo do Mês</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: balance >= 0 ? '#44dd88' : '#ff4444' }}>
            R$ {fmt(balance)}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>A Receber</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalPending > 0 ? '#ffaa00' : '#44dd88' }}>
            R$ {fmt(totalPending)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('fluxo')} onClick={() => setTab('fluxo')}>Fluxo</button>
        <button style={tabStyle('dre')} onClick={() => setTab('dre')}>DRE</button>
        <button style={tabStyle('projecao')} onClick={() => setTab('projecao')}>Projeção</button>
      </div>

      {/* ── FLUXO ── */}
      {tab === 'fluxo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Por semana */}
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Por Semana</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byWeek).map(([week, vals]) => (
                <div key={week}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Semana {week}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(68,221,136,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entradas</div>
                      <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(vals.income)}</div>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,68,68,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saídas</div>
                      <div style={{ fontWeight: 700, color: '#ff4444' }}>R$ {fmt(vals.expense)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por categoria */}
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Por Categoria</h3>
            {byCategory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Sem movimentações no mês</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byCategory.map(([cat, vals]) => (
                  <div key={cat} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                  }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {vals.income  > 0 && <span style={{ color: '#44dd88', fontSize: 13 }}>+ R$ {fmt(vals.income)}</span>}
                      {vals.expense > 0 && <span style={{ color: '#ff4444', fontSize: 13 }}>- R$ {fmt(vals.expense)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lançamentos do mês */}
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Lançamentos ({monthEntries.length})</h3>
            {monthEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Sem lançamentos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px', gap: 8,
                  padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
                  borderBottom: '1px solid var(--border)' }}>
                  <span>Data</span><span>Descrição</span><span style={{ textAlign: 'right' }}>Valor</span><span style={{ textAlign: 'right' }}>Recebido</span>
                </div>
                {[...monthEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px', gap: 8,
                    padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.02)', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.category}</div>
                    </div>
                    <span style={{ textAlign: 'right', fontWeight: 600, color: e.type === 'income' ? '#44dd88' : '#ff4444' }}>
                      {e.type === 'expense' ? '- ' : '+ '}R$ {fmt(e.amount)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                      {e.type === 'income' ? `R$ ${fmt(e.amountPaid ?? 0)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DRE ── */}
      {tab === 'dre' && (
        <div className="panel" style={{ maxWidth: 600 }}>
          <h3 style={{ marginTop: 0 }}>
            DRE Simplificado — {new Date(year, monthNum - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>

          {[
            { label: 'Receita Bruta de Vendas', value: grossRevenue, color: '#44dd88', bold: true },
            { label: '  (–) CMV / CPV', value: -totalCOGS, color: '#ff6666' },
            { label: 'Lucro Bruto', value: grossProfit, color: grossProfit >= 0 ? '#44dd88' : '#ff4444', bold: true },
            { label: `  Margem Bruta`, value: null, label2: `${grossMargin.toFixed(1)}%`, color: 'var(--text-muted)' },
            { label: '  (–) Despesas Operacionais', value: -operatingExp, color: '#ff6666' },
            { label: 'EBITDA', value: ebitda, color: ebitda >= 0 ? '#44dd88' : '#ff4444', bold: true, divider: true },
            { label: 'A Receber (não realizado)', value: totalPending, color: '#ffaa00' },
          ].map((row, i) => (
            <div key={i}>
              {row.divider && <hr className="divider" />}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontWeight: row.bold ? 700 : 400
              }}>
                <span style={{ fontSize: 14 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: row.bold ? 16 : 14 }}>
                  {row.label2 ?? (row.value !== null ? `R$ ${fmt(row.value ?? 0)}` : '')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROJEÇÃO ── */}
      {tab === 'projecao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Projeção para o próximo mês</h3>
            <p style={{ fontSize: 13, marginBottom: 20 }}>
              Baseado na média dos últimos 3 meses.
            </p>
            <div className="grid-3">
              <div style={{ padding: 20, background: 'rgba(68,221,136,0.08)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Entradas Prev.</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(projection.income)}</div>
              </div>
              <div style={{ padding: 20, background: 'rgba(255,68,68,0.08)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Saídas Prev.</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4444' }}>R$ {fmt(projection.expense)}</div>
              </div>
              <div style={{
                padding: 20, borderRadius: 12, textAlign: 'center',
                background: projection.balance >= 0 ? 'rgba(68,221,136,0.08)' : 'rgba(255,68,68,0.08)'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Saldo Prev.</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: projection.balance >= 0 ? '#44dd88' : '#ff4444' }}>
                  R$ {fmt(projection.balance)}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Comparativo Mês Atual vs Projetado</h3>
            {[
              { label: 'Entradas', atual: totalIncome, prev: projection.income },
              { label: 'Saídas',   atual: totalExpense, prev: projection.expense },
              { label: 'Saldo',    atual: balance, prev: projection.balance },
            ].map(row => {
              const diff = row.atual - row.prev
              const pct  = row.prev > 0 ? (diff / row.prev) * 100 : 0
              return (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontWeight: 600 }}>{row.label}</span>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Prev: R$ {fmt(row.prev)}</span>
                    <span style={{ fontWeight: 700 }}>Atual: R$ {fmt(row.atual)}</span>
                    <span style={{ fontSize: 13, color: diff >= 0 ? '#44dd88' : '#ff4444' }}>
                      {diff >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
