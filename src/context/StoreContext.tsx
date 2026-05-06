import React, { createContext, useContext, useEffect, useCallback } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'

// ── Tipos existentes ─────────────────────────────────────
export type Product = {
  id: string
  name: string
  sku?: string
  price: number
  cost: number
  qty: number
  minQty: number
  category: string
  barcode?: string
  ncm?: string
  cfop?: string
  cst?: string
  supplier?: string
  lastRestock?: string
  createdAt: string
}

export type PaymentEntry = {
  method: 'pix' | 'card' | 'cash' | 'boleto' | 'credit'
  amount: number
}

export type Sale = {
  id: string
  items: { productId: string; name: string; qty: number; price: number }[]
  total: number
  payment: 'pix' | 'card' | 'cash' | 'boleto' | 'credit' | 'misto'
  payments: PaymentEntry[]
  status: 'pending' | 'completed' | 'cancelled'
  client?: string
  date: string
  amountPaid: number
  change: number
  pending: number
  nfeId?: string
}

export type Client = {
  id: string
  name: string
  document: string
  phone: string
  email: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  type: 'pf' | 'pj'
  createdAt: string
}

export type Alert = {
  id: string
  type: 'low_stock' | 'expiring' | 'payment_due' | 'restock_suggestion'
  severity: 'warning' | 'critical' | 'info'
  message: string
  productId?: string
  date: string
  read: boolean
}

export type Appointment = {
  id: string
  client: string
  service: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  price?: number
  amountPaid?: number
  pending?: number
  createdAt: string
}

export type Receivable = {
  id: string
  client: string
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'overdue'
  saleId?: string
  createdAt: string
}

export type CashEntry = {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  category: string
  date: string
  saleId?: string
  appointmentId?: string
  pending: number
  amountPaid: number
  createdAt: string
}

// ── Novos tipos ──────────────────────────────────────────

export type Supplier = {
  id: string
  name: string
  document: string
  contact: string
  phone: string
  email: string
  address: string
  city?: string
  state?: string
  paymentTerm?: string
  notes?: string
  createdAt: string
}

export type PurchaseOrderItem = {
  productId: string
  productName: string
  qty: number
  unitCost: number
}

export type PurchaseOrder = {
  id: string
  supplierId: string
  items: PurchaseOrderItem[]
  total: number
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  expectedDate: string
  receivedDate?: string
  notes?: string
  createdAt: string
}

export type Goal = {
  id: string
  title: string
  type: 'revenue' | 'sales_count' | 'new_clients' | 'avg_ticket'
  target: number
  period: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
  createdAt: string
}

export type NFeConfig = {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  ie: string
  crt: '1' | '2' | '3'
  logradouro: string
  numero: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  telefone: string
  apiProvider: 'focusnfe' | 'nfeio' | 'none'
  apiToken: string
  environment: 'homologacao' | 'producao'
  serie: string
  proximoNumero: string
}

export type NFeRecord = {
  id: string
  number: string
  serie: string
  chaveAcesso?: string
  status: 'pending' | 'authorized' | 'rejected' | 'cancelled' | 'processing'
  saleId?: string
  clientId?: string
  clientName: string
  clientDocument: string
  items: { description: string; ncm: string; cfop: string; qty: number; unitPrice: number; total: number }[]
  total: number
  apiResponse?: string
  issuedAt: string
  authorizedAt?: string
  cancelledAt?: string
  xmlUrl?: string
  pdfUrl?: string
  createdAt: string
}

type AppSettings = {
  companyName: string
  darkMode: boolean
  lowStockThreshold: number
}

const defaultSettings: AppSettings = {
  companyName: "SOM's Gestão",
  darkMode: true,
  lowStockThreshold: 10,
}

const defaultNFeConfig: NFeConfig = {
  cnpj: '', razaoSocial: '', nomeFantasia: '', ie: '', crt: '1',
  logradouro: '', numero: '', bairro: '', municipio: '', uf: 'SP', cep: '', telefone: '',
  apiProvider: 'none', apiToken: '', environment: 'homologacao',
  serie: '1', proximoNumero: '1',
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function getAlertSeverity(qty: number, minQty: number): 'warning' | 'critical' {
  return qty <= minQty / 2 ? 'critical' : 'warning'
}

interface StoreContextType {
  products: Product[]
  clients: Client[]
  sales: Sale[]
  alerts: Alert[]
  appointments: Appointment[]
  receivables: Receivable[]
  cashEntries: CashEntry[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  goals: Goal[]
  nfeConfig: NFeConfig
  nfeRecords: NFeRecord[]
  settings: AppSettings
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Product
  updateProduct: (id: string, data: Partial<Product>) => void
  deleteProduct: (id: string) => void
  recordSale: (sale: Omit<Sale, 'id' | 'date'>) => Sale
  updateSale: (id: string, data: Partial<Sale>) => void
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Client
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void
  markAlertRead: (id: string) => void
  clearAlerts: () => void
  getUnreadAlerts: () => Alert[]
  getTotalRevenue: () => number
  getLowStockProducts: () => Product[]
  searchProducts: (q: string) => Product[]
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt'>) => Appointment
  updateAppointment: (id: string, data: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void
  addReceivable: (rec: Omit<Receivable, 'id' | 'createdAt'>) => void
  updateReceivable: (id: string, data: Partial<Receivable>) => void
  addCashEntry: (entry: Omit<CashEntry, 'id' | 'createdAt'>) => CashEntry
  updateCashEntry: (id: string, data: Partial<CashEntry>) => void
  deleteCashEntry: (id: string) => void
  addSupplier: (s: Omit<Supplier, 'id' | 'createdAt'>) => Supplier
  updateSupplier: (id: string, data: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => PurchaseOrder
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => void
  receivePurchaseOrder: (id: string) => void
  deletePurchaseOrder: (id: string) => void
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => Goal
  updateGoal: (id: string, data: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getGoalProgress: (goal: Goal) => number
  setNFeConfig: (config: Partial<NFeConfig>) => void
  addNFeRecord: (rec: Omit<NFeRecord, 'id' | 'createdAt'>) => NFeRecord
  updateNFeRecord: (id: string, data: Partial<NFeRecord>) => void
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts]             = useLocalStorage<Product[]>('products', [])
  const [clients, setClients]               = useLocalStorage<Client[]>('clients', [])
  const [sales, setSales]                   = useLocalStorage<Sale[]>('sales', [])
  const [alerts, setAlerts]                 = useLocalStorage<Alert[]>('alerts', [])
  const [appointments, setAppointments]     = useLocalStorage<Appointment[]>('appointments', [])
  const [receivables, setReceivables]       = useLocalStorage<Receivable[]>('receivables', [])
  const [cashEntries, setCashEntries]       = useLocalStorage<CashEntry[]>('cashEntries', [])
  const [suppliers, setSuppliers]           = useLocalStorage<Supplier[]>('suppliers', [])
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', [])
  const [goals, setGoals]                   = useLocalStorage<Goal[]>('goals', [])
  const [nfeConfig, setNFeConfigState]      = useLocalStorage<NFeConfig>('nfeConfig', defaultNFeConfig)
  const [nfeRecords, setNFeRecords]         = useLocalStorage<NFeRecord[]>('nfeRecords', [])
  const [settings, setSettings]             = useLocalStorage('settings', defaultSettings)

  const checkLowStock = useCallback((prods: Product[]): Alert[] =>
    prods.filter(p => p.qty <= p.minQty).map(p => ({
      id: generateId(), type: 'low_stock' as const,
      severity: getAlertSeverity(p.qty, p.minQty),
      message: `Estoque baixo: ${p.name} (${p.qty} un)`,
      productId: p.id, date: new Date().toISOString(), read: false,
    }))
  , [])

  const suggestRestock = useCallback((prods: Product[]): Alert[] =>
    prods.filter(p => p.qty <= p.minQty * 1.5).map(p => ({
      id: generateId(), type: 'restock_suggestion' as const, severity: 'info' as const,
      message: `Sugestão: Repor ${p.name} (+${Math.max(p.minQty * 2, p.minQty - p.qty + 10)} un)`,
      productId: p.id, date: new Date().toISOString(), read: false,
    }))
  , [])

  useEffect(() => {
    const toAdd = [...checkLowStock(products), ...suggestRestock(products)].filter(
      a => !alerts.some(e => e.type === a.type && e.productId === a.productId)
    )
    if (toAdd.length > 0) {
      setAlerts(prev => [
        ...prev.filter(a => !toAdd.some(n => n.type === a.type && n.productId === a.productId)),
        ...toAdd,
      ])
    }
  }, [products, checkLowStock, suggestRestock, alerts, setAlerts])

  const addProduct = useCallback((product: Omit<Product, 'id' | 'createdAt'>) => {
    const p: Product = { ...product, id: generateId(), createdAt: new Date().toISOString() }
    setProducts(prev => [...prev, p]); return p
  }, [setProducts])
  const updateProduct = useCallback((id: string, data: Partial<Product>) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p)), [setProducts])
  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    setAlerts(prev => prev.filter(a => a.productId !== id))
  }, [setProducts, setAlerts])

  const recordSale = useCallback((sale: Omit<Sale, 'id' | 'date'>) => {
    const newSale: Sale = { ...sale, id: generateId(), date: new Date().toISOString() }
    setSales(prev => [...prev, newSale])
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (product) {
        const newQty = Math.max(0, product.qty - item.qty)
        updateProduct(item.productId, { qty: newQty,
          lastRestock: newQty < product.minQty ? new Date().toISOString() : product.lastRestock })
      }
    })
    setCashEntries(prev => [...prev, {
      id: generateId(), type: 'income',
      description: `Venda #${newSale.id.slice(-6)}`,
      amount: sale.total, category: 'Venda',
      date: new Date().toISOString(), saleId: newSale.id,
      amountPaid: sale.amountPaid, pending: sale.pending,
      createdAt: new Date().toISOString(),
    }])
    return newSale
  }, [setSales, products, updateProduct, setCashEntries])

  const updateSale = useCallback((id: string, data: Partial<Sale>) =>
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...data } : s)), [setSales])

  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt'>) => {
    const c: Client = { ...client, id: generateId(), createdAt: new Date().toISOString() }
    setClients(prev => [...prev, c]); return c
  }, [setClients])
  const updateClient = useCallback((id: string, data: Partial<Client>) =>
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c)), [setClients])
  const deleteClient = useCallback((id: string) =>
    setClients(prev => prev.filter(c => c.id !== id)), [setClients])

  const markAlertRead   = useCallback((id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)), [setAlerts])
  const clearAlerts     = useCallback(() => setAlerts([]), [setAlerts])
  const getUnreadAlerts = useCallback(() => alerts.filter(a => !a.read), [alerts])
  const getTotalRevenue = useCallback(() =>
    sales.filter(s => s.status === 'completed').reduce((s, sale) => s + sale.total, 0), [sales])
  const getLowStockProducts = useCallback(() => products.filter(p => p.qty <= p.minQty), [products])
  const searchProducts = useCallback((q: string) => {
    const lq = q.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(lq) || p.sku?.toLowerCase().includes(lq) ||
      p.barcode?.includes(lq) || p.category.toLowerCase().includes(lq))
  }, [products])

  const addAppointment = useCallback((apt: Omit<Appointment, 'id' | 'createdAt'>) => {
    const a: Appointment = { ...apt, id: generateId(), createdAt: new Date().toISOString() }
    setAppointments(prev => [...prev, a])
    if (apt.price && apt.price > 0) {
      const paid = apt.amountPaid ?? 0
      setCashEntries(prev => [...prev, {
        id: generateId(), type: 'income',
        description: `Serviço: ${apt.service}`, amount: apt.price!,
        category: 'Serviço', date: new Date().toISOString(),
        appointmentId: a.id, amountPaid: paid,
        pending: apt.pending ?? (apt.price! - paid),
        createdAt: new Date().toISOString(),
      }])
    }
    return a
  }, [setAppointments, setCashEntries])

  const updateAppointment = useCallback((id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    if (data.amountPaid !== undefined || data.pending !== undefined) {
      setCashEntries(prev => prev.map(e =>
        e.appointmentId === id
          ? { ...e, amountPaid: data.amountPaid ?? e.amountPaid, pending: data.pending ?? e.pending }
          : e))
    }
  }, [setAppointments, setCashEntries])

  const deleteAppointment = useCallback((id: string) =>
    setAppointments(prev => prev.filter(a => a.id !== id)), [setAppointments])

  const addReceivable = useCallback((rec: Omit<Receivable, 'id' | 'createdAt'>) =>
    setReceivables(prev => [...prev, { ...rec, id: generateId(), createdAt: new Date().toISOString() }])
  , [setReceivables])
  const updateReceivable = useCallback((id: string, data: Partial<Receivable>) =>
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...data } : r)), [setReceivables])

  const addCashEntry = useCallback((entry: Omit<CashEntry, 'id' | 'createdAt'>) => {
    const e: CashEntry = { ...entry, id: generateId(), createdAt: new Date().toISOString() }
    setCashEntries(prev => [...prev, e]); return e
  }, [setCashEntries])
  const updateCashEntry = useCallback((id: string, data: Partial<CashEntry>) =>
    setCashEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e)), [setCashEntries])
  const deleteCashEntry = useCallback((id: string) =>
    setCashEntries(prev => prev.filter(e => e.id !== id)), [setCashEntries])

  const addSupplier = useCallback((s: Omit<Supplier, 'id' | 'createdAt'>) => {
    const sup: Supplier = { ...s, id: generateId(), createdAt: new Date().toISOString() }
    setSuppliers(prev => [...prev, sup]); return sup
  }, [setSuppliers])
  const updateSupplier = useCallback((id: string, data: Partial<Supplier>) =>
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s)), [setSuppliers])
  const deleteSupplier = useCallback((id: string) =>
    setSuppliers(prev => prev.filter(s => s.id !== id)), [setSuppliers])

  const addPurchaseOrder = useCallback((po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
    const order: PurchaseOrder = { ...po, id: generateId(), createdAt: new Date().toISOString() }
    setPurchaseOrders(prev => [...prev, order]); return order
  }, [setPurchaseOrders])
  const updatePurchaseOrder = useCallback((id: string, data: Partial<PurchaseOrder>) =>
    setPurchaseOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o)), [setPurchaseOrders])
  const receivePurchaseOrder = useCallback((id: string) => {
    const order = purchaseOrders.find(o => o.id === id)
    if (!order) return
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (product) updateProduct(item.productId, {
        qty: product.qty + item.qty, cost: item.unitCost,
        lastRestock: new Date().toISOString(),
      })
    })
    updatePurchaseOrder(id, { status: 'received', receivedDate: new Date().toISOString() })
    setCashEntries(prev => [...prev, {
      id: generateId(), type: 'expense',
      description: `Compra OC#${id.slice(-6)}`, amount: order.total,
      category: 'Compra/Fornecedor', date: new Date().toISOString(),
      amountPaid: order.total, pending: 0,
      createdAt: new Date().toISOString(),
    }])
  }, [purchaseOrders, products, updateProduct, updatePurchaseOrder, setCashEntries])
  const deletePurchaseOrder = useCallback((id: string) =>
    setPurchaseOrders(prev => prev.filter(o => o.id !== id)), [setPurchaseOrders])

  const addGoal = useCallback((g: Omit<Goal, 'id' | 'createdAt'>) => {
    const goal: Goal = { ...g, id: generateId(), createdAt: new Date().toISOString() }
    setGoals(prev => [...prev, goal]); return goal
  }, [setGoals])
  const updateGoal = useCallback((id: string, data: Partial<Goal>) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g)), [setGoals])
  const deleteGoal = useCallback((id: string) =>
    setGoals(prev => prev.filter(g => g.id !== id)), [setGoals])

  const getGoalProgress = useCallback((goal: Goal): number => {
    const start = new Date(goal.startDate)
    const end   = new Date(goal.endDate)
    const ps = sales.filter(s => {
      const d = new Date(s.date)
      return s.status === 'completed' && d >= start && d <= end
    })
    switch (goal.type) {
      case 'revenue':      return ps.reduce((s, sale) => s + sale.total, 0)
      case 'sales_count':  return ps.length
      case 'new_clients':  return clients.filter(c => { const d = new Date(c.createdAt); return d >= start && d <= end }).length
      case 'avg_ticket':   return ps.length > 0 ? ps.reduce((s, sale) => s + sale.total, 0) / ps.length : 0
      default: return 0
    }
  }, [sales, clients])

  const setNFeConfig = useCallback((config: Partial<NFeConfig>) =>
    setNFeConfigState(prev => ({ ...prev, ...config })), [setNFeConfigState])
  const addNFeRecord = useCallback((rec: Omit<NFeRecord, 'id' | 'createdAt'>) => {
    const r: NFeRecord = { ...rec, id: generateId(), createdAt: new Date().toISOString() }
    setNFeRecords(prev => [...prev, r]); return r
  }, [setNFeRecords])
  const updateNFeRecord = useCallback((id: string, data: Partial<NFeRecord>) =>
    setNFeRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r)), [setNFeRecords])

  const api: StoreContextType = {
    products, clients, sales, alerts, appointments, receivables,
    cashEntries, suppliers, purchaseOrders, goals, nfeConfig, nfeRecords, settings,
    addProduct, updateProduct, deleteProduct,
    recordSale, updateSale,
    addClient, updateClient, deleteClient,
    markAlertRead, clearAlerts, getUnreadAlerts,
    getTotalRevenue, getLowStockProducts, searchProducts,
    addAppointment, updateAppointment, deleteAppointment,
    addReceivable, updateReceivable,
    addCashEntry, updateCashEntry, deleteCashEntry,
    addSupplier, updateSupplier, deleteSupplier,
    addPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder, deletePurchaseOrder,
    addGoal, updateGoal, deleteGoal, getGoalProgress,
    setNFeConfig, addNFeRecord, updateNFeRecord,
    setSettings,
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
