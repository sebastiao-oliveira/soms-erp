import { useState, useMemo, useCallback } from 'react'
import { useStore, type CashEntry } from '../context/StoreContext'
import type { Appointment } from '../context/StoreContext'

type Tab = 'caixa' | 'pendentes' | 'resumo'

// Lê campos numéricos que podem ser undefined em dados legados do localStorage
const n = (v: number | undefined) => v ?? 0

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'PIX', card: 'Cartão', cash: 'Dinheiro', boleto: 'Boleto', credit: 'Crédito', misto: 'Misto'
}

export default function Finance() {
  const { sales, clients, appointments, cashEntries, addCashEntry, updateCashEntry, deleteCashEntry, updateSale } = useStore()

  const [tab, setTab] = useState<Tab>('caixa')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [settleValues, setSettleValues] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
  })

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const openForm = useCallback((entry?: CashEntry) => {
    if (entry) {
      setEditingEntry(entry)
      setForm({
        type: entry.type,
        description: entry.description,
        amount: String(entry.amount),
        category: entry.category,
        date: (entry.date ?? new Date().toISOString()).slice(0, 10),
      })
    } else {
      setEditingEntry(null)
      setForm({ type: 'income', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) })
    }
    setShowForm(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!form.description || !form.amount || !form.category) {
      showToast('error', 'Preencha todos os campos')
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { showToast('error', 'Valor inválido'); return }

    if (editingEntry) {
      updateCashEntry(editingEntry.id, {
        type: form.type,
        description: form.description,
        amount,
        category: form.category,
        date: form.date,
      })
      showToast('success', 'Lançamento atualizado!')
    } else {
      addCashEntry({
        type: form.type,
        description: form.description,
        amount,
        category: form.category,
        date: form.date,
        amountPaid: form.type === 'income' ? amount : 0,
        pending: 0,
      })
      showToast('success', 'Lançamento registrado!')
    }
    setShowForm(false)
    setEditingEntry(null)
  }, [form, editingEntry, addCashEntry, updateCashEntry, showToast])

  const handleDelete = useCallback((id: string) => {
    deleteCashEntry(id)
    showToast('success', 'Lançamento removido')
  }, [deleteCashEntry, showToast])

  const handleSettlePending = useCallback((entry: CashEntry, paidNow: number) => {
    const currentPending = n(entry.pending)
    const currentPaid = n(entry.amountPaid)
    const newPending = Math.max(0, currentPending - paidNow)
    const newAmountPaid = currentPaid + paidNow
    updateCashEntry(entry.id, { pending: newPending, amountPaid: newAmountPaid })
    if (entry.saleId && updateSale) {
      updateSale(entry.saleId, { pending: newPending, amountPaid: newAmountPaid })
    }
    showToast('success', newPending === 0 ? 'Valor quitado!' : `Falta R$ ${fmt(newPending)}`)
  }, [updateCashEntry, updateSale, showToast])

  // ── Dados calculados — todos blindados com ?? 0 ────────
  const sortedEntries = useMemo(() =>
    [...cashEntries].sort((a, b) => {
      const da = new Date(a.date ?? 0).getTime()
      const db = new Date(b.date ?? 0).getTime()
      return db - da
    })
  , [cashEntries])

  const pendingEntries = useMemo(() =>
    sortedEntries.filter(e => n(e.pending) > 0)
  , [sortedEntries])

  const totalIncome = useMemo(() =>
    cashEntries
      .filter(e => e.type === 'income')
      .reduce((s, e) => s + n(e.amountPaid), 0)
  , [cashEntries])

  const totalExpense = useMemo(() =>
    cashEntries
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + n(e.amount), 0)
  , [cashEntries])

  const totalPending = useMemo(() =>
    cashEntries.reduce((s, e) => s + n(e.pending), 0)
  , [cashEntries])

  const balance = totalIncome - totalExpense

  const byCategory = useMemo(() => {
    const map: Record<string, { income: number, expense: number }> = {}
    cashEntries.forEach(e => {
      const cat = e.category || 'Sem categoria'
      if (!map[cat]) map[cat] = { income: 0, expense: 0 }
      if (e.type === 'income') map[cat].income += n(e.amountPaid)
      else map[cat].expense += n(e.amount)
    })
    return Object.entries(map).sort((a, b) =>
      (b[1].income + b[1].expense) - (a[1].income + a[1].expense)
    )
  }, [cashEntries])

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: tab === t ? '#000' : '#fff', transition: 'all 0.2s'
  })

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 10,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', fontWeight: 600, zIndex: 1000
        }}>{toast.message}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Financeiro</h2>
        <button onClick={() => openForm()}>+ Novo Lançamento</button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Entradas Recebidas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(totalIncome)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Saídas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4444' }}>R$ {fmt(totalExpense)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Saldo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: balance >= 0 ? '#44dd88' : '#ff4444' }}>
            R$ {fmt(balance)}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>A Receber</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalPending > 0 ? '#ffaa00' : '#44dd88' }}>
            R$ {fmt(totalPending)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('caixa')} onClick={() => setTab('caixa')}>Livro Caixa</button>
        <button style={tabStyle('pendentes')} onClick={() => setTab('pendentes')}>
          Pendentes
          {pendingEntries.length > 0 && (
            <span style={{
              marginLeft: 6, background: '#ff4444', color: '#fff',
              borderRadius: 10, padding: '1px 7px', fontSize: 11
            }}>{pendingEntries.length}</span>
          )}
        </button>
        <button style={tabStyle('resumo')} onClick={() => setTab('resumo')}>Resumo</button>
      </div>

      {/* ── LIVRO CAIXA ── */}
      {tab === 'caixa' && (
        <div className="panel">
          {sortedEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Nenhum lançamento ainda
            </div>
          ) : (
            <div>
              {/* Cabeçalho da tabela */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 110px 120px 120px 80px',
                gap: 8, padding: '6px 12px', fontSize: 12,
                color: 'var(--muted)', fontWeight: 600,
                borderBottom: '1px solid rgba(255,255,255,0.07)'
              }}>
                <span>Data</span>
                <span>Descrição</span>
                <span>Categoria</span>
                <span style={{ textAlign: 'right' }}>Valor Total</span>
                <span style={{ textAlign: 'right' }}>Recebido</span>
                <span />
              </div>

              {sortedEntries.map(entry => {
                const entryPending = n(entry.pending)
                const entryPaid = n(entry.amountPaid)
                return (
                  <div key={entry.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 110px 120px 120px 80px',
                    gap: 8, padding: '10px 12px', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: entryPending > 0 ? 'rgba(255,170,0,0.04)' : undefined
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {entry.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '—'}
                    </span>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.description}</div>
                      {(entry.saleId || entry.appointmentId) && (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {entry.saleId ? 'PDV automático' : 'Serviço automático'}
                        </div>
                      )}
                      {entryPending > 0 && (
                        <div style={{ fontSize: 11, color: '#ffaa00' }}>
                          Pendente: R$ {fmt(entryPending)}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {entry.category || '—'}
                    </span>

                    <span style={{
                      textAlign: 'right', fontWeight: 600,
                      color: entry.type === 'income' ? '#44dd88' : '#ff4444'
                    }}>
                      {entry.type === 'expense' ? '- ' : '+ '}R$ {fmt(n(entry.amount))}
                    </span>

                    <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>
                      {entry.type === 'income' ? `R$ ${fmt(entryPaid)}` : '—'}
                    </span>

                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="muted" onClick={() => openForm(entry)}
                        style={{ padding: '4px 8px', fontSize: 12 }}>✏️</button>
                      {!entry.saleId && !entry.appointmentId && (
                        <button className="muted" onClick={() => handleDelete(entry.id)}
                          style={{ padding: '4px 8px', fontSize: 12, color: '#ff4444' }}>✕</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PENDENTES ── */}
      {tab === 'pendentes' && (
        <div className="panel">
          {pendingEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Nenhum valor pendente 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingEntries.map(entry => {
                const entryPending = n(entry.pending)
                const entryPaid = n(entry.amountPaid)

                // Resolve nome do cliente por todas as fontes possíveis
                const saleData = entry.saleId ? sales.find(s => s.id === entry.saleId) : null
                const aptData = entry.appointmentId
                  ? appointments.find(a => a.id === entry.appointmentId)
                  : undefined

                const clientById =
                  (saleData?.client ? clients.find(c => c.id === saleData.client) : undefined) ??
                  (aptData?.client ? clients.find(c => c.id === aptData.client) : undefined)

                // Se client não bateu como ID, pode ter sido gravado como nome texto
                const clientNameRaw = saleData?.client ?? aptData?.client ?? ''
                const isId = !!clients.find(c => c.id === clientNameRaw)
                const clientName: string =
                  clientById?.name ??
                  (!isId && clientNameRaw ? clientNameRaw : undefined) ??
                  'Sem cliente identificado'

                return (
                  <div key={entry.id} style={{
                    padding: 16, background: 'rgba(0,0,0,0.2)',
                    borderRadius: 10, borderLeft: '3px solid #ffaa00'
                  }}>
                    {/* Info do lançamento */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 12
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{entry.description}</div>
                        {/* Nome do cliente em destaque */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          marginTop: 4, marginBottom: 2,
                          background: 'rgba(74,158,255,0.12)', borderRadius: 6,
                          padding: '2px 8px'
                        }}>
                          <span style={{ fontSize: 12, color: '#4a9eff' }}>👤</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a9eff' }}>
                            {clientName}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                          {entry.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '—'}
                          {` • Total: R$ ${fmt(n(entry.amount))}`}
                          {` • Pago: R$ ${fmt(entryPaid)}`}
                        </div>
                        {/* Formas de pagamento da venda original */}
                        {saleData?.payments && saleData.payments.filter(p => (p.amount ?? 0) > 0).length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                            {saleData.payments.filter(p => (p.amount ?? 0) > 0).map((p, i) => (
                              <span key={i} style={{ marginRight: 8 }}>
                                {PAYMENT_LABEL[p.method] ?? p.method}: R$ {fmt(n(p.amount))}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#ffaa00' }}>
                          R$ {fmt(entryPending)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>falta receber</div>
                      </div>
                    </div>

                    {/* Ações de quitação */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Valor recebido agora"
                        value={settleValues[entry.id] ?? ''}
                        onChange={e => setSettleValues(prev => ({ ...prev, [entry.id]: e.target.value }))}
                        style={{ flex: 1, padding: '8px 12px' }}
                      />
                      <button
                        onClick={() => {
                          const v = parseFloat(settleValues[entry.id] ?? '')
                          if (isNaN(v) || v <= 0) { showToast('error', 'Informe um valor válido'); return }
                          handleSettlePending(entry, Math.min(v, entryPending))
                          setSettleValues(prev => ({ ...prev, [entry.id]: '' }))
                        }}
                        style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                      >
                        Registrar
                      </button>
                      <button
                        className="muted"
                        onClick={() => {
                          handleSettlePending(entry, entryPending)
                          setSettleValues(prev => ({ ...prev, [entry.id]: '' }))
                        }}
                        style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                      >
                        Quitar tudo
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RESUMO ── */}
      {tab === 'resumo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Resultado Geral</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div style={{
                padding: 16, background: 'rgba(68,221,136,0.08)',
                borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Entradas</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(totalIncome)}</div>
              </div>
              <div style={{
                padding: 16, background: 'rgba(255,68,68,0.08)',
                borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Saídas</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4444' }}>R$ {fmt(totalExpense)}</div>
              </div>
              <div style={{
                padding: 16, borderRadius: 10, textAlign: 'center',
                background: balance >= 0 ? 'rgba(68,221,136,0.08)' : 'rgba(255,68,68,0.08)'
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Saldo Líquido</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: balance >= 0 ? '#44dd88' : '#ff4444' }}>
                  R$ {fmt(balance)}
                </div>
              </div>
            </div>
            {totalPending > 0 && (
              <div style={{
                marginTop: 12, padding: 12, background: 'rgba(255,170,0,0.08)',
                borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: '#ffaa00', fontWeight: 600 }}>⚠ Valores ainda não recebidos</span>
                <span style={{ fontWeight: 700, color: '#ffaa00' }}>R$ {fmt(totalPending)}</span>
              </div>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Por Categoria</h3>
            {byCategory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sem dados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byCategory.map(([cat, vals]) => (
                  <div key={cat} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                  }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {vals.income > 0 && (
                        <span style={{ color: '#44dd88', fontSize: 14 }}>+ R$ {fmt(vals.income)}</span>
                      )}
                      {vals.expense > 0 && (
                        <span style={{ color: '#ff4444', fontSize: 14 }}>- R$ {fmt(vals.expense)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL LANÇAMENTO ── */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            background: 'linear-gradient(180deg,rgba(20,25,35,0.98),rgba(15,18,28,0.98))',
            padding: 32, borderRadius: 16, width: '100%', maxWidth: 420,
            border: '1px solid rgba(255,255,255,0.07)'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>

            {/* Tipo entrada/saída */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['income', 'expense'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
                  background: form.type === t
                    ? (t === 'income' ? 'rgba(68,221,136,0.3)' : 'rgba(255,68,68,0.3)')
                    : 'rgba(255,255,255,0.05)',
                  color: form.type === t ? (t === 'income' ? '#44dd88' : '#ff4444') : '#fff'
                }}>
                  {t === 'income' ? '↑ Entrada' : '↓ Saída'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label>Descrição</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Pagamento fornecedor"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>Valor (R$)</label>
                <input
                  type="number" step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label>Data</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Categoria</label>
              <input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ex: Venda, Aluguel, Fornecedor..."
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="muted"
                onClick={() => { setShowForm(false); setEditingEntry(null) }}
                style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1 }}>
                {editingEntry ? 'Salvar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
