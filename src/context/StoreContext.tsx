import React, { createContext, useContext, useEffect, useCallback } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'

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
  supplier?: string
  lastRestock?: string
  createdAt: string
}

// Um pagamento individual dentro de uma venda
export type PaymentEntry = {
  method: 'pix' | 'card' | 'cash' | 'boleto' | 'credit'
  amount: number   // valor atribuído a esta forma
}

export type Sale = {
  id: string
  items: { productId: string, name: string, qty: number, price: number }[]
  total: number
  // mantido para compatibilidade — representa o método principal ou 'misto'
  payment: 'pix' | 'card' | 'cash' | 'boleto' | 'credit' | 'misto'
  payments: PaymentEntry[]   // detalhamento múltiplo
  status: 'pending' | 'completed' | 'cancelled'
  client?: string
  date: string
  amountPaid: number    // soma do que foi realmente pago
  change: number        // troco (somente dinheiro)
  pending: number       // ainda a receber
}

export type Client = {
  id: string
  name: string
  document: string
  phone: string
  email: string
  address: string
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
  price?: number       // valor do serviço
  amountPaid?: number  // quanto foi pago na hora
  pending?: number     // saldo pendente
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

type AppSettings = {
  companyName: string
  darkMode: boolean
  lowStockThreshold: number
}

const defaultSettings: AppSettings = {
  companyName: "SOM's Gestão",
  darkMode: true,
  lowStockThreshold: 10
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
  settings: AppSettings
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product
  updateProduct: (id: string, data: Partial<Product>) => void
  deleteProduct: (id: string) => void
  recordSale: (sale: Omit<Sale, 'id' | 'date'>) => Sale
  updateSale: (id: string, data: Partial<Sale>) => void
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client
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
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useLocalStorage<Product[]>('products', [])
  const [clients, setClients] = useLocalStorage<Client[]>('clients', [])
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', [])
  const [alerts, setAlerts] = useLocalStorage<Alert[]>('alerts', [])
  const [appointments, setAppointments] = useLocalStorage<Appointment[]>('appointments', [])
  const [receivables, setReceivables] = useLocalStorage<Receivable[]>('receivables', [])
  const [cashEntries, setCashEntries] = useLocalStorage<CashEntry[]>('cashEntries', [])
  const [settings, setSettings] = useLocalStorage('settings', defaultSettings)

  const checkLowStock = useCallback((prods: Product[]): Alert[] => {
    return prods
      .filter(p => p.qty <= p.minQty)
      .map(p => ({
        id: generateId(),
        type: 'low_stock' as const,
        severity: getAlertSeverity(p.qty, p.minQty),
        message: `Estoque baixo: ${p.name} (${p.qty} un)`,
        productId: p.id,
        date: new Date().toISOString(),
        read: false
      }))
  }, [])

  const suggestRestock = useCallback((prods: Product[]): Alert[] => {
    return prods
      .filter(p => p.qty <= p.minQty * 1.5)
      .map(p => {
        const suggestedQty = Math.max(p.minQty * 2, p.minQty - p.qty + 10)
        return {
          id: generateId(),
          type: 'restock_suggestion' as const,
          severity: 'info' as const,
          message: `Sugestão: Repor ${p.name} (+${suggestedQty} un)`,
          productId: p.id,
          date: new Date().toISOString(),
          read: false
        }
      })
  }, [])

  useEffect(() => {
    const toAdd = [...checkLowStock(products), ...suggestRestock(products)].filter(
      a => !alerts.some(e => e.type === a.type && e.productId === a.productId)
    )
    if (toAdd.length > 0) {
      setAlerts(prev => [
        ...prev.filter(a => !toAdd.some(n => n.type === a.type && n.productId === a.productId)),
        ...toAdd
      ])
    }
  }, [products, checkLowStock, suggestRestock, alerts, setAlerts])

  const addProduct = useCallback((product: Omit<Product, 'id' | 'createdAt'>) => {
    const p: Product = { ...product, id: generateId(), createdAt: new Date().toISOString() }
    setProducts(prev => [...prev, p])
    return p
  }, [setProducts])

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [setProducts])

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    setAlerts(prev => prev.filter(a => a.productId !== id))
  }, [setProducts, setAlerts])

  const recordSale = useCallback((sale: Omit<Sale, 'id' | 'date'>) => {
    const newSale: Sale = { ...sale, id: generateId(), date: new Date().toISOString() }
    setSales(prev => [...prev, newSale])

    // Baixa estoque
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (product) {
        const newQty = Math.max(0, product.qty - item.qty)
        updateProduct(item.productId, {
          qty: newQty,
          lastRestock: newQty < product.minQty ? new Date().toISOString() : product.lastRestock
        })
      }
    })

    // Lança no caixa automaticamente
    setCashEntries(prev => [...prev, {
      id: generateId(),
      type: 'income',
      description: `Venda #${newSale.id.slice(-6)}`,
      amount: sale.total,
      category: 'Venda',
      date: new Date().toISOString(),
      saleId: newSale.id,
      amountPaid: sale.amountPaid,
      pending: sale.pending,
      createdAt: new Date().toISOString()
    }])

    return newSale
  }, [setSales, products, updateProduct, setCashEntries])

  const updateSale = useCallback((id: string, data: Partial<Sale>) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }, [setSales])

  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt'>) => {
    const c: Client = { ...client, id: generateId(), createdAt: new Date().toISOString() }
    setClients(prev => [...prev, c])
    return c
  }, [setClients])

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id))
  }, [setClients])

  const markAlertRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }, [setAlerts])

  const clearAlerts = useCallback(() => setAlerts([]), [setAlerts])

  const getUnreadAlerts = useCallback(() => alerts.filter(a => !a.read), [alerts])

  const getTotalRevenue = useCallback(() =>
    sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.total, 0)
  , [sales])

  const getLowStockProducts = useCallback(() =>
    products.filter(p => p.qty <= p.minQty)
  , [products])

  const searchProducts = useCallback((query: string) => {
    const q = query.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      p.category.toLowerCase().includes(q)
    )
  }, [products])

  const addAppointment = useCallback((apt: Omit<Appointment, 'id' | 'createdAt'>) => {
    const a: Appointment = { ...apt, id: generateId(), createdAt: new Date().toISOString() }
    setAppointments(prev => [...prev, a])

    // Se tem valor de serviço, lança no caixa
    if (apt.price && apt.price > 0) {
      const paid = apt.amountPaid ?? 0
      const pend = apt.pending ?? (apt.price - paid)
      setCashEntries(prev => [...prev, {
        id: generateId(),
        type: 'income',
        description: `Serviço: ${apt.service}`,
        amount: apt.price!,
        category: 'Serviço',
        date: new Date().toISOString(),
        appointmentId: a.id,
        amountPaid: paid,
        pending: pend,
        createdAt: new Date().toISOString()
      }])
    }

    return a
  }, [setAppointments, setCashEntries])

  const updateAppointment = useCallback((id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    // Sincroniza pagamento no caixa se vier com amountPaid
    if (data.amountPaid !== undefined || data.pending !== undefined) {
      setCashEntries(prev => prev.map(e =>
        e.appointmentId === id
          ? { ...e, amountPaid: data.amountPaid ?? e.amountPaid, pending: data.pending ?? e.pending }
          : e
      ))
    }
  }, [setAppointments, setCashEntries])

  const deleteAppointment = useCallback((id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
  }, [setAppointments])

  const addReceivable = useCallback((rec: Omit<Receivable, 'id' | 'createdAt'>) => {
    setReceivables(prev => [...prev, { ...rec, id: generateId(), createdAt: new Date().toISOString() }])
  }, [setReceivables])

  const updateReceivable = useCallback((id: string, data: Partial<Receivable>) => {
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }, [setReceivables])

  const addCashEntry = useCallback((entry: Omit<CashEntry, 'id' | 'createdAt'>) => {
    const e: CashEntry = { ...entry, id: generateId(), createdAt: new Date().toISOString() }
    setCashEntries(prev => [...prev, e])
    return e
  }, [setCashEntries])

  const updateCashEntry = useCallback((id: string, data: Partial<CashEntry>) => {
    setCashEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
  }, [setCashEntries])

  const deleteCashEntry = useCallback((id: string) => {
    setCashEntries(prev => prev.filter(e => e.id !== id))
  }, [setCashEntries])

  const api: StoreContextType = {
    products, clients, sales, alerts, appointments, receivables, cashEntries, settings,
    addProduct, updateProduct, deleteProduct,
    recordSale, updateSale,
    addClient, deleteClient,
    markAlertRead, clearAlerts, getUnreadAlerts,
    getTotalRevenue, getLowStockProducts, searchProducts,
    addAppointment, updateAppointment, deleteAppointment,
    addReceivable, updateReceivable,
    addCashEntry, updateCashEntry, deleteCashEntry,
    setSettings
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
