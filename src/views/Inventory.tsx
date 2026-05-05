import { useState, useMemo, useCallback } from 'react'
import { useStore, type Product } from '../context/StoreContext'

type Tab = 'produtos' | 'alertas' | 'entrada'

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', category: '',
  price: '', cost: '', qty: '', minQty: '', supplier: ''
}

export default function Inventory() {
  const { products, alerts, addProduct, updateProduct, deleteProduct, markAlertRead, clearAlerts } = useStore()
  const [tab, setTab] = useState<Tab>('produtos')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [showEntry, setShowEntry] = useState<Product | null>(null)  // entrada de estoque
  const [entryQty, setEntryQty] = useState('')
  const [entryCost, setEntryCost] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  , [products])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p =>
      (!filterCategory || p.category === filterCategory) &&
      (!q || p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.category.toLowerCase().includes(q))
    )
  }, [products, search, filterCategory])

  const stockAlerts = useMemo(() =>
    alerts.filter(a => a.type === 'low_stock' || a.type === 'restock_suggestion')
  , [alerts])

  const unreadAlerts = useMemo(() => stockAlerts.filter(a => !a.read), [stockAlerts])

  // Valor total do estoque
  const totalStockValue = useMemo(() =>
    products.reduce((s, p) => s + p.cost * p.qty, 0)
  , [products])

  const openForm = useCallback((p?: Product) => {
    if (p) {
      setEditing(p)
      setForm({
        name: p.name, sku: p.sku ?? '', barcode: p.barcode ?? '',
        category: p.category, price: String(p.price), cost: String(p.cost),
        qty: String(p.qty), minQty: String(p.minQty), supplier: p.supplier ?? ''
      })
    } else {
      setEditing(null)
      setForm(EMPTY_FORM)
    }
    setShowForm(true)
  }, [])

  const handleSave = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.category || !form.price) {
      showToast('error', 'Nome, categoria e preço são obrigatórios')
      return
    }
    const data = {
      name: form.name, sku: form.sku, barcode: form.barcode,
      category: form.category, price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0, qty: parseInt(form.qty) || 0,
      minQty: parseInt(form.minQty) || 0, supplier: form.supplier
    }
    if (editing) {
      updateProduct(editing.id, data)
      showToast('success', 'Produto atualizado!')
    } else {
      addProduct(data)
      showToast('success', 'Produto cadastrado!')
    }
    setShowForm(false)
    setEditing(null)
  }, [form, editing, addProduct, updateProduct, showToast])

  const handleDelete = useCallback((p: Product) => {
    if (!window.confirm(`Excluir "${p.name}"?`)) return
    deleteProduct(p.id)
    showToast('success', 'Produto removido')
  }, [deleteProduct, showToast])

  const handleEntry = useCallback(() => {
    if (!showEntry) return
    const qty = parseInt(entryQty)
    if (isNaN(qty) || qty <= 0) { showToast('error', 'Quantidade inválida'); return }
    const updates: Partial<Product> = {
      qty: showEntry.qty + qty,
      lastRestock: new Date().toISOString()
    }
    if (entryCost) updates.cost = parseFloat(entryCost)
    updateProduct(showEntry.id, updates)
    showToast('success', `+${qty} unidades adicionadas!`)
    setShowEntry(null)
    setEntryQty('')
    setEntryCost('')
  }, [showEntry, entryQty, entryCost, updateProduct, showToast])

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: tab === t ? '#000' : '#fff', transition: 'all 0.2s'
  })

  const stockColor = (p: Product) => {
    if (p.qty === 0) return '#ff4444'
    if (p.qty <= p.minQty) return '#ffaa00'
    return '#44dd88'
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
        <h2 style={{ margin: 0 }}>Estoque</h2>
        <button onClick={() => openForm()}>+ Novo Produto</button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Total Produtos</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{products.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Valor em Estoque</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4a9eff' }}>R$ {fmt(totalStockValue)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Estoque Baixo</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: products.filter(p => p.qty <= p.minQty && p.qty > 0).length > 0 ? '#ffaa00' : '#44dd88' }}>
            {products.filter(p => p.qty <= p.minQty && p.qty > 0).length}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Sem Estoque</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: products.filter(p => p.qty === 0).length > 0 ? '#ff4444' : '#44dd88' }}>
            {products.filter(p => p.qty === 0).length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('produtos')} onClick={() => setTab('produtos')}>Produtos</button>
        <button style={tabStyle('alertas')} onClick={() => setTab('alertas')}>
          Alertas
          {unreadAlerts.length > 0 && (
            <span style={{
              marginLeft: 6, background: '#ff4444', color: '#fff',
              borderRadius: 10, padding: '1px 7px', fontSize: 11
            }}>{unreadAlerts.length}</span>
          )}
        </button>
        <button style={tabStyle('entrada')} onClick={() => setTab('entrada')}>Entrada de Mercadoria</button>
      </div>

      {/* ── PRODUTOS ── */}
      {tab === 'produtos' && (
        <div className="panel">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ width: 160 }}>
              <option value="">Todas categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Nenhum produto encontrado
            </div>
          ) : (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 90px 90px 90px 90px 100px',
                gap: 8, padding: '6px 12px', fontSize: 12, color: 'var(--muted)',
                fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.07)'
              }}>
                <span>Produto</span>
                <span>Categoria</span>
                <span style={{ textAlign: 'right' }}>Custo</span>
                <span style={{ textAlign: 'right' }}>Preço</span>
                <span style={{ textAlign: 'right' }}>Margem</span>
                <span style={{ textAlign: 'center' }}>Estoque</span>
                <span />
              </div>
              {filtered.map(p => {
                const margin = p.cost > 0 ? ((p.price - p.cost) / p.price * 100) : 0
                return (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 90px 90px 90px 90px 100px',
                    gap: 8, padding: '10px 12px', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11, color: 'var(--muted)' }}>SKU: {p.sku}</div>}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{p.category}</span>
                    <span style={{ textAlign: 'right', fontSize: 13 }}>R$ {fmt(p.cost)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>R$ {fmt(p.price)}</span>
                    <span style={{ textAlign: 'right', fontSize: 13, color: margin >= 30 ? '#44dd88' : margin >= 10 ? '#ffaa00' : '#ff4444' }}>
                      {margin.toFixed(0)}%
                    </span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 14,
                        color: stockColor(p),
                        background: p.qty === 0 ? 'rgba(255,68,68,0.15)' :
                          p.qty <= p.minQty ? 'rgba(255,170,0,0.15)' : 'rgba(68,221,136,0.1)'
                      }}>
                        {p.qty}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="muted" onClick={() => { setShowEntry(p); setTab('entrada') }}
                        style={{ padding: '4px 8px', fontSize: 12 }} title="Entrada">+</button>
                      <button className="muted" onClick={() => openForm(p)}
                        style={{ padding: '4px 8px', fontSize: 12 }}>✏️</button>
                      <button className="muted" onClick={() => handleDelete(p)}
                        style={{ padding: '4px 8px', fontSize: 12, color: '#ff4444' }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS ── */}
      {tab === 'alertas' && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600 }}>{stockAlerts.length} alertas</span>
            {stockAlerts.length > 0 && (
              <button className="muted" onClick={clearAlerts} style={{ padding: '6px 14px', fontSize: 13 }}>
                Limpar todos
              </button>
            )}
          </div>
          {stockAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Nenhum alerta de estoque 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stockAlerts.map(a => {
                const product = a.productId ? products.find(p => p.id === a.productId) : null
                return (
                  <div key={a.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                    borderLeft: `3px solid ${a.severity === 'critical' ? '#ff4444' : a.severity === 'warning' ? '#ffaa00' : '#4a9eff'}`,
                    opacity: a.read ? 0.5 : 1
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.message}</div>
                      {product && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          Mín: {product.minQty} un • Atual: {product.qty} un
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {product && (
                        <button className="muted" onClick={() => { setShowEntry(product); setTab('entrada') }}
                          style={{ padding: '6px 12px', fontSize: 13 }}>
                          Repor
                        </button>
                      )}
                      {!a.read && (
                        <button className="muted" onClick={() => markAlertRead(a.id)}
                          style={{ padding: '6px 12px', fontSize: 13 }}>
                          ✓ Lido
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ENTRADA DE MERCADORIA ── */}
      {tab === 'entrada' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Entrada de Mercadoria</h3>

          {/* Seletor de produto */}
          <div style={{ marginBottom: 20 }}>
            <label>Selecione o produto</label>
            <select
              value={showEntry?.id ?? ''}
              onChange={e => setShowEntry(products.find(p => p.id === e.target.value) ?? null)}
              style={{ marginTop: 6 }}
            >
              <option value="">Selecione...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Estoque atual: {p.qty} un
                </option>
              ))}
            </select>
          </div>

          {showEntry && (
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20, marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{showEntry.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Categoria: {showEntry.category}
                    {showEntry.supplier && ` • Fornecedor: ${showEntry.supplier}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stockColor(showEntry) }}>
                    {showEntry.qty} un
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>estoque atual</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label>Quantidade a Adicionar *</label>
                  <input type="number" placeholder="Ex: 50" value={entryQty}
                    onChange={e => setEntryQty(e.target.value)} />
                </div>
                <div>
                  <label>Novo Custo Unitário (opcional)</label>
                  <input type="number" step="0.01" placeholder={`Atual: R$ ${fmt(showEntry.cost)}`}
                    value={entryCost} onChange={e => setEntryCost(e.target.value)} />
                </div>
              </div>

              {entryQty && parseInt(entryQty) > 0 && (
                <div style={{
                  padding: 12, background: 'rgba(68,221,136,0.08)', borderRadius: 8, marginBottom: 16,
                  fontSize: 14
                }}>
                  Novo estoque: <strong>{showEntry.qty + (parseInt(entryQty) || 0)} un</strong>
                  {entryCost && (
                    <> • Novo custo: <strong>R$ {fmt(parseFloat(entryCost))}</strong></>
                  )}
                </div>
              )}

              <button onClick={handleEntry} style={{ width: '100%', padding: 14 }}>
                Registrar Entrada
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal produto */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <form onSubmit={handleSave} style={{
            background: 'linear-gradient(180deg,rgba(20,25,35,0.98),rgba(15,18,28,0.98))',
            padding: 32, borderRadius: 16, width: '100%', maxWidth: 520,
            border: '1px solid rgba(255,255,255,0.07)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>{editing ? 'Editar Produto' : 'Novo Produto'}</h3>

            <div style={{ marginBottom: 14 }}>
              <label>Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>Categoria *</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Ex: Eletrônicos" required />
              </div>
              <div>
                <label>Fornecedor</label>
                <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>SKU</label>
                <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div>
                <label>Código de Barras (EAN)</label>
                <input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>Custo (R$)</label>
                <input type="number" step="0.01" value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
              </div>
              <div>
                <label>Preço de Venda (R$) *</label>
                <input type="number" step="0.01" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
            </div>
            {form.price && form.cost && parseFloat(form.cost) > 0 && (
              <div style={{
                marginBottom: 14, padding: 10, background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, fontSize: 13, color: 'var(--muted)'
              }}>
                Margem: <strong style={{ color: ((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price) * 100) >= 30 ? '#44dd88' : '#ffaa00' }}>
                  {((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price) * 100).toFixed(1)}%
                </strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label>Quantidade em Estoque</label>
                <input type="number" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div>
                <label>Estoque Mínimo</label>
                <input type="number" value={form.minQty}
                  onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted"
                onClick={() => { setShowForm(false); setEditing(null) }}
                style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" style={{ flex: 1 }}>
                {editing ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
