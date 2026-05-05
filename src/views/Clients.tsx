import { useState, useMemo, useCallback } from 'react'
import { useStore, type Client } from '../context/StoreContext'

type Tab = 'lista' | 'historico'

const EMPTY_FORM = {
  name: '', document: '', phone: '', email: '', address: '', type: 'pf' as 'pf' | 'pj'
}

export default function Clients() {
  const { clients, addClient, deleteClient, sales, appointments } = useStore()
  const [tab, setTab] = useState<Tab>('lista')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.document.includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  }, [clients, search])

  // Histórico do cliente selecionado
  const clientSales = useMemo(() => {
    if (!selected) return []
    return sales
      .filter(s => s.client === selected.id || s.client === selected.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selected, sales])

  const clientAppointments = useMemo(() => {
    if (!selected) return []
    return appointments
      .filter(a => a.client === selected.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selected, appointments])

  const clientTotal = useMemo(() =>
    clientSales.reduce((s, sale) => s + sale.total, 0)
  , [clientSales])

  const clientPending = useMemo(() =>
    clientSales.reduce((s, sale) => s + (sale.pending ?? 0), 0) +
    clientAppointments.reduce((s, a) => s + (a.pending ?? 0), 0)
  , [clientSales, clientAppointments])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { showToast('error', 'Nome obrigatório'); return }
    addClient(form)
    showToast('success', 'Cliente cadastrado!')
    setForm(EMPTY_FORM)
    setShowForm(false)
  }, [form, addClient, showToast])

  const handleDelete = useCallback((c: Client) => {
    if (!window.confirm(`Excluir ${c.name}?`)) return
    deleteClient(c.id)
    if (selected?.id === c.id) setSelected(null)
    showToast('success', 'Cliente removido')
  }, [deleteClient, selected, showToast])

  const openHistory = useCallback((c: Client) => {
    setSelected(c)
    setTab('historico')
  }, [])

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: tab === t ? '#000' : '#fff', transition: 'all 0.2s'
  })

  const PAYMENT_LABEL: Record<string, string> = {
    pix: 'PIX', card: 'Cartão', cash: 'Dinheiro', boleto: 'Boleto', credit: 'Crédito', misto: 'Misto'
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 10,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', fontWeight: 600, zIndex: 1000
        }}>{toast.message}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Clientes</h2>
        <button onClick={() => setShowForm(true)}>+ Novo Cliente</button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{clients.length}</div>
          <div style={{ color: 'var(--muted)' }}>Total de Clientes</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{clients.filter(c => c.type === 'pf').length}</div>
          <div style={{ color: 'var(--muted)' }}>Pessoa Física</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{clients.filter(c => c.type === 'pj').length}</div>
          <div style={{ color: 'var(--muted)' }}>Pessoa Jurídica</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('lista')} onClick={() => setTab('lista')}>Lista</button>
        <button style={tabStyle('historico')} onClick={() => setTab('historico')}>
          {selected ? `Histórico — ${selected.name}` : 'Histórico'}
        </button>
      </div>

      {/* ── LISTA ── */}
      {tab === 'lista' && (
        <div className="panel">
          <input
            placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(c => {
                const cSales = sales.filter(s => s.client === c.id || s.client === c.name)
                const cTotal = cSales.reduce((s, sale) => s + sale.total, 0)
                const cPending = cSales.reduce((s, sale) => s + (sale.pending ?? 0), 0)
                return (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                    cursor: 'pointer'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: c.type === 'pj' ? 'rgba(74,158,255,0.2)' : 'rgba(68,221,136,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700,
                          color: c.type === 'pj' ? '#4a9eff' : '#44dd88'
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {c.type === 'pj' ? 'PJ' : 'PF'}
                            {c.document && ` • ${c.document}`}
                            {c.phone && ` • ${c.phone}`}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#44dd88' }}>
                        R$ {fmt(cTotal)}
                      </div>
                      {cPending > 0 && (
                        <div style={{ fontSize: 11, color: '#ffaa00' }}>
                          Pendente: R$ {fmt(cPending)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {cSales.length} {cSales.length === 1 ? 'compra' : 'compras'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="muted" onClick={() => openHistory(c)}
                        style={{ padding: '6px 12px', fontSize: 13 }}>Ver</button>
                      <button className="muted" onClick={() => handleDelete(c)}
                        style={{ padding: '6px 12px', fontSize: 13, color: '#ff4444' }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        <div>
          {!selected ? (
            <div className="panel" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
              Selecione um cliente na lista para ver o histórico
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card do cliente */}
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: selected.type === 'pj' ? 'rgba(74,158,255,0.2)' : 'rgba(68,221,136,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700,
                      color: selected.type === 'pj' ? '#4a9eff' : '#44dd88'
                    }}>
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{selected.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        {selected.type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        {selected.document && ` • ${selected.document}`}
                      </div>
                      {selected.phone && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.phone}</div>}
                      {selected.email && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email}</div>}
                      {selected.address && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.address}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(68,221,136,0.08)', borderRadius: 10 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#44dd88' }}>R$ {fmt(clientTotal)}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Gasto</div>
                    </div>
                    <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{clientSales.length}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Compras</div>
                    </div>
                    {clientPending > 0 && (
                      <div style={{ padding: '10px 16px', background: 'rgba(255,170,0,0.08)', borderRadius: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#ffaa00' }}>R$ {fmt(clientPending)}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Pendente</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compras */}
              <div className="panel">
                <h3 style={{ marginTop: 0 }}>Histórico de Compras</h3>
                {clientSales.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Nenhuma compra</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {clientSales.map(sale => (
                      <div key={sale.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>Venda #{sale.id.slice(-6)}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {new Date(sale.date).toLocaleDateString('pt-BR')} • {PAYMENT_LABEL[sale.payment] ?? sale.payment}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {sale.items.map(i => `${i.name} x${i.qty}`).join(', ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(sale.total)}</div>
                          {(sale.pending ?? 0) > 0 && (
                            <div style={{ fontSize: 12, color: '#ffaa00' }}>Pendente: R$ {fmt(sale.pending!)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Serviços */}
              {clientAppointments.length > 0 && (
                <div className="panel">
                  <h3 style={{ marginTop: 0 }}>Histórico de Serviços</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {clientAppointments.map(apt => (
                      <div key={apt.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{apt.service}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {apt.date} {apt.time}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                          {apt.price && (
                            <div style={{ fontSize: 14, fontWeight: 600 }}>R$ {fmt(apt.price)}</div>
                          )}
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 12,
                            background: apt.status === 'completed' ? 'rgba(68,221,136,0.2)' : apt.status === 'scheduled' ? 'rgba(74,158,255,0.2)' : 'rgba(255,68,68,0.2)',
                            color: apt.status === 'completed' ? '#44dd88' : apt.status === 'scheduled' ? '#4a9eff' : '#ff4444'
                          }}>
                            {apt.status === 'completed' ? 'Concluído' : apt.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal novo cliente */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <form onSubmit={handleSubmit} style={{
            background: 'linear-gradient(180deg,rgba(20,25,35,0.98),rgba(15,18,28,0.98))',
            padding: 32, borderRadius: 16, width: '100%', maxWidth: 480,
            border: '1px solid rgba(255,255,255,0.07)'
          }}>
            <h3 style={{ marginTop: 0 }}>Novo Cliente</h3>

            {/* Tipo PF/PJ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['pf', 'pj'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
                  background: form.type === t ? 'rgba(74,158,255,0.3)' : 'rgba(255,255,255,0.05)',
                  color: form.type === t ? '#4a9eff' : '#fff'
                }}>
                  {t === 'pf' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label>Nome {form.type === 'pj' ? '/ Razão Social' : ''} *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={form.type === 'pj' ? 'Empresa Ltda' : 'Nome completo'} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>{form.type === 'pj' ? 'CNPJ' : 'CPF'}</label>
                <input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))}
                  placeholder={form.type === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'} />
              </div>
              <div>
                <label>Telefone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder='(00) 00000-0000' />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder='email@exemplo.com' />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Endereço</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder='Rua, número, bairro, cidade' />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" style={{ flex: 1 }}>Cadastrar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
