import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useStore, type Product, type Sale, type PaymentEntry } from '../context/StoreContext'

interface CartItem extends Product {
  cartQty: number
}

type PaymentMethod = 'pix' | 'card' | 'cash' | 'boleto' | 'credit'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  card: 'Cartão',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  credit: 'Crédito',
}

const METHODS: PaymentMethod[] = ['pix', 'card', 'cash', 'boleto', 'credit']

export default function Pos() {
  const { products, recordSale } = useStore()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Múltiplos pagamentos: { method -> valor digitado }
  const [paymentInputs, setPaymentInputs] = useState<Partial<Record<PaymentMethod, string>>>({ pix: '' })
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('pix')

  useEffect(() => { searchRef.current?.focus() }, [])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Produtos ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!search) return products.filter(p => p.qty > 0).slice(0, 20).map(p => ({ ...p, cartQty: 1 }))
    const q = search.toLowerCase()
    return products
      .filter(p => p.qty > 0 && (
        p.name.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.sku?.toLowerCase().includes(q)
      ))
      .slice(0, 10)
      .map(p => ({ ...p, cartQty: 1 }))
  }, [products, search])

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + item.price * item.cartQty, 0)
  , [cart])

  const cartCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.cartQty, 0)
  , [cart])

  // ── Cálculos de pagamento ────────────────────────────────
  // Soma de todos os valores informados nos métodos
  const totalEntered = useMemo(() => {
    return Object.values(paymentInputs).reduce((s, v) => s + (parseFloat(v || '0') || 0), 0)
  }, [paymentInputs])

  // Dinheiro digitado (para calcular troco)
  const cashEntered = useMemo(() => parseFloat(paymentInputs.cash || '0') || 0, [paymentInputs])

  // Quanto foi efetivamente pago (capped no total)
  const amountPaid = useMemo(() => Math.min(totalEntered, cartTotal + cashEntered - Math.min(cashEntered, cartTotal)), [totalEntered, cartTotal, cashEntered])

  // Troco: só existe se dinheiro pago passou do total após subtrair os demais
  const change = useMemo(() => {
    const otherPaid = totalEntered - cashEntered
    const remaining = Math.max(0, cartTotal - otherPaid)
    return cashEntered > remaining ? cashEntered - remaining : 0
  }, [totalEntered, cashEntered, cartTotal])

  // Pendente: total - o que foi pago de verdade (excluindo troco)
  const pending = useMemo(() => {
    const realPaid = totalEntered - change
    return Math.max(0, cartTotal - realPaid)
  }, [totalEntered, change, cartTotal])

  // Forma principal para o campo `payment` da Sale
  const mainPayment = useMemo((): Sale['payment'] => {
    const active = METHODS.filter(m => parseFloat(paymentInputs[m] || '0') > 0)
    if (active.length === 0) return activeMethod
    if (active.length === 1) return active[0]
    return 'misto'
  }, [paymentInputs, activeMethod])

  // Array de PaymentEntry para gravar
  const paymentEntries = useMemo((): PaymentEntry[] => {
    return METHODS
      .filter(m => parseFloat(paymentInputs[m] || '0') > 0)
      .map(m => ({ method: m, amount: parseFloat(paymentInputs[m]!) }))
  }, [paymentInputs])

  // ── Carrinho ──────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id)
      if (existing) {
        if (existing.cartQty >= product.qty) return prev
        return prev.map(p => p.id === product.id ? { ...p, cartQty: p.cartQty + 1 } : p)
      }
      return [...prev, { ...product, cartQty: 1 }]
    })
    setSearch('')
  }, [])

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev
      .map(p => {
        if (p.id !== id) return p
        const newQty = Math.max(0, Math.min(p.cartQty + delta, p.qty))
        return newQty === 0 ? p : { ...p, cartQty: newQty }
      })
      .filter(p => p.cartQty > 0)
    )
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setClientName('')
    setPaymentInputs({ pix: '' })
    setActiveMethod('pix')
  }, [])

  // Quando troca de aba de método: se não havia valor, inicializa
  const selectMethod = useCallback((m: PaymentMethod) => {
    setActiveMethod(m)
    setPaymentInputs(prev => ({ ...prev, [m]: prev[m] ?? '' }))
  }, [])

  // Preenche automaticamente o restante no campo ativo
  const fillRemaining = useCallback(() => {
    const otherSum = METHODS
      .filter(m => m !== activeMethod)
      .reduce((s, m) => s + (parseFloat(paymentInputs[m] || '0') || 0), 0)
    const remaining = Math.max(0, cartTotal - otherSum)
    setPaymentInputs(prev => ({ ...prev, [activeMethod]: remaining.toFixed(2) }))
  }, [activeMethod, paymentInputs, cartTotal])

  // ── Checkout ──────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const realPaid = totalEntered - change
      const sale = recordSale({
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          qty: item.cartQty,
          price: item.price,
        })),
        total: cartTotal,
        payment: mainPayment,
        payments: paymentEntries.length > 0
          ? paymentEntries
          : [{ method: activeMethod, amount: 0 }],
        status: 'completed',
        client: clientName || undefined,
        amountPaid: realPaid,
        change,
        pending,
      })
      setLastSale(sale)
      showToast('success', `Venda concluída: R$ ${cartTotal.toLocaleString('pt-BR')}`)
      clearCart()
      setShowCheckout(false)
    } catch {
      showToast('error', 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }, [cart, cartTotal, mainPayment, paymentEntries, activeMethod, clientName,
      totalEntered, change, pending, recordSale, clearCart, showToast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setSearch(''); searchRef.current?.focus() }
    else if (e.key === 'Enter' && filteredProducts.length > 0) addToCart(filteredProducts[0])
    else if (e.key === 'F1') { e.preventDefault(); setShowCheckout(true) }
  }, [filteredProducts, addToCart])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 180px)' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 10,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', fontWeight: 600, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>{toast.message}</div>
      )}

      {/* ── Coluna esquerda: busca + grid de produtos ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>PDV</h2>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Buscar: Enter | Finalizar: F1</span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar produto por nome, código ou EAN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ width: '100%', fontSize: 18, padding: '14px 20px',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
          />
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12, flex: 1, overflowY: 'auto', alignContent: 'start'
        }}>
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => addToCart(p)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
              background: 'linear-gradient(180deg,rgba(20,25,35,0.6),rgba(15,18,28,0.4))',
              cursor: 'pointer', transition: 'all 0.2s', minHeight: 100
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{p.name}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>R$ {fmt(p.price)}</span>
              <span style={{ fontSize: 12, color: p.qty <= p.minQty ? '#ff4444' : 'var(--muted)' }}>{p.qty} un</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Coluna direita: carrinho ── */}
      <div style={{
        width: 380, display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg,rgba(20,25,35,0.6),rgba(15,18,28,0.4))',
        borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Carrinho</h3>
          <button className="muted" onClick={clearCart} style={{ padding: '6px 12px' }}>Limpar</button>
        </div>

        {cart.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            Carrinho vazio
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
            {cart.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)' }}>R$ {fmt(item.price)} cada</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="muted" onClick={() => updateCartQty(item.id, -1)} style={{ padding: '4px 12px' }}>-</button>
                  <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.cartQty}</span>
                  <button className="muted" onClick={() => updateCartQty(item.id, 1)}
                    disabled={item.cartQty >= item.qty} style={{ padding: '4px 12px' }}>+</button>
                </div>
                <div style={{ textAlign: 'right', minWidth: 70 }}>
                  <div style={{ fontWeight: 600 }}>R$ {fmt(item.price * item.cartQty)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14, color: 'var(--muted)' }}>
            <span>Itens:</span><span>{cartCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
            <span>Total:</span><span>R$ {fmt(cartTotal)}</span>
          </div>

          <input
            type="text"
            placeholder="Nome do cliente (opcional)"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <button
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
            style={{
              width: '100%', padding: 16, borderRadius: 12, border: 'none',
              background: 'linear-gradient(90deg,var(--accent),var(--accent-dark))',
              color: '#000', fontSize: 18, fontWeight: 700, cursor: 'pointer',
              opacity: cart.length === 0 ? 0.5 : 1
            }}
          >
            Finalizar Venda
          </button>
        </div>
      </div>

      {/* ── Modal de checkout ── */}
      {showCheckout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300
        }}>
          <div style={{
            background: '#0d1e36', padding: 32, borderRadius: 20,
            width: '90%', maxWidth: 460, textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: 8 }}>Confirmar Venda</h2>
            <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 4 }}>R$ {fmt(cartTotal)}</div>
            <div style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>
              {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            </div>

            <input
              type="text"
              placeholder="Nome do cliente (opcional)"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              style={{ marginBottom: 20, textAlign: 'center' }}
            />

            {/* Abas de formas de pagamento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 16 }}>
              {METHODS.map(m => {
                const val = parseFloat(paymentInputs[m] || '0') || 0
                const isActive = activeMethod === m
                const hasMoney = val > 0
                return (
                  <button key={m} onClick={() => selectMethod(m)} style={{
                    padding: '8px 4px', borderRadius: 8, border: hasMoney ? '2px solid var(--accent)' : '2px solid transparent',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    color: hasMoney ? 'var(--accent)' : '#fff',
                    cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.15s'
                  }}>
                    {PAYMENT_LABELS[m]}
                    {hasMoney && <div style={{ fontSize: 10, marginTop: 2 }}>R$ {fmt(val)}</div>}
                  </button>
                )
              })}
            </div>

            {/* Campo de valor do método ativo */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>
                Valor em {PAYMENT_LABELS[activeMethod]}:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  placeholder="0,00"
                  value={paymentInputs[activeMethod] ?? ''}
                  onChange={e => setPaymentInputs(prev => ({ ...prev, [activeMethod]: e.target.value }))}
                  style={{ flex: 1, textAlign: 'right', fontSize: 16 }}
                />
                <button className="muted" onClick={fillRemaining}
                  style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  Completar
                </button>
              </div>
            </div>

            {/* Barra de progresso do pagamento */}
            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <div style={{
                height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.3s',
                  width: `${Math.min(100, (totalEntered / cartTotal) * 100)}%`,
                  background: pending === 0 ? '#44dd88' : totalEntered > 0 ? '#ffaa00' : '#4a9eff'
                }} />
              </div>
            </div>

            {/* Resumo financeiro */}
            <div style={{
              background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 14,
              marginBottom: 20, marginTop: 10, textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>Total informado:</span>
                <span style={{ fontWeight: 600 }}>R$ {fmt(totalEntered)}</span>
              </div>
              {change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>Troco (dinheiro):</span>
                  <span style={{ fontWeight: 700, color: '#44dd88' }}>R$ {fmt(change)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontWeight: 600 }}>
                  {pending > 0 ? '⚠ Ficará pendente:' : '✓ Venda quitada'}
                </span>
                {pending > 0 && (
                  <span style={{ fontWeight: 700, color: '#ffaa00', fontSize: 16 }}>R$ {fmt(pending)}</span>
                )}
              </div>
              {totalEntered === 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#ffaa00' }}>
                  Nenhum valor informado — venda ficará totalmente pendente
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="muted" onClick={() => setShowCheckout(false)} style={{ flex: 1, padding: 16 }}>
                Cancelar
              </button>
              <button onClick={handleCheckout} disabled={loading} style={{ flex: 1, padding: 16 }}>
                {loading ? 'Processando...' : pending > 0 ? 'Registrar c/ Pendente' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de sucesso ── */}
      {lastSale && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300
        }}>
          <div style={{
            background: '#0d1e36', padding: 32, borderRadius: 20,
            width: '90%', maxWidth: 400, textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {lastSale.pending > 0 ? '⏳' : '✅'}
            </div>
            <h2 style={{ marginBottom: 8 }}>
              {lastSale.pending > 0 ? 'Venda com Pendente' : 'Venda Concluída!'}
            </h2>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
              R$ {fmt(lastSale.total)}
            </div>

            {/* Formas de pagamento usadas */}
            {lastSale.payments.filter(p => p.amount > 0).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {lastSale.payments.filter(p => p.amount > 0).map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {PAYMENT_LABELS[p.method]}: R$ {fmt(p.amount)}
                  </div>
                ))}
              </div>
            )}

            {lastSale.change > 0 && (
              <div style={{ fontSize: 18, color: '#44dd88', marginBottom: 8 }}>
                Troco: R$ {fmt(lastSale.change)}
              </div>
            )}
            {lastSale.pending > 0 && (
              <div style={{ fontSize: 18, color: '#ffaa00', marginBottom: 8 }}>
                Pendente: R$ {fmt(lastSale.pending)}
              </div>
            )}

            <div style={{ marginBottom: 20 }} />
            <button onClick={() => setLastSale(null)} style={{ width: '100%', padding: 16 }}>
              Nova Venda
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
