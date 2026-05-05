import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../context/StoreContext'

type InvoiceStatus = 'draft' | 'issued' | 'cancelled'

interface Invoice {
  id: string
  number: string
  client: string
  clientDoc: string
  items: { description: string; qty: number; unitPrice: number }[]
  total: number
  status: InvoiceStatus
  issuedAt: string
  notes: string
  fromSale?: string // ✅ CORREÇÃO TS
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function Invoice() {
  const { clients, sales } = useStore()

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('invoices') || '[]')
    } catch {
      return []
    }
  })

  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState({
    client: '',
    clientDoc: '',
    notes: '',
    fromSale: '',
    items: [{ description: '', qty: 1, unitPrice: 0 }],
  })

  const fmt = (v: number) =>
    (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const save = useCallback((list: Invoice[]) => {
    setInvoices(list)
    localStorage.setItem('invoices', JSON.stringify(list))
  }, [])

  const fillFromSale = useCallback(
    (saleId: string) => {
      const sale = sales.find(s => s.id === saleId)
      if (!sale) return

      const client = clients.find(c => c.id === sale.client)

      setForm(f => ({
        ...f,
        fromSale: saleId,
        client: client?.name ?? sale.client ?? '',
        clientDoc: client?.document ?? '',
        items: sale.items.map(i => ({
          description: i.name,
          qty: i.qty,
          unitPrice: i.price,
        })),
      }))
    },
    [sales, clients]
  )

  const addItem = () =>
    setForm(f => ({
      ...f,
      items: [...f.items, { description: '', qty: 1, unitPrice: 0 }],
    }))

  const removeItem = (i: number) =>
    setForm(f => ({
      ...f,
      items: f.items.filter((_, idx) => idx !== i),
    }))

  const updateItem = (i: number, field: string, value: string | number) =>
    setForm(f => ({
      ...f,
      items: f.items.map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item
      ),
    }))

  const formTotal = useMemo(
    () =>
      form.items.reduce(
        (s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
        0
      ),
    [form.items]
  )

  const nextNumber = useMemo(() => {
    const nums = invoices.map(inv => parseInt(inv.number)).filter(Boolean)
    return String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(6, '0')
  }, [invoices])

  const handleIssue = useCallback(() => {
    if (!form.client) {
      showToast('error', 'Informe o cliente')
      return
    }

    if (form.items.some(i => !i.description)) {
      showToast('error', 'Preencha todos os itens')
      return
    }

    const newInv: Invoice = {
      id: generateId(),
      number: nextNumber,
      client: form.client,
      clientDoc: form.clientDoc,
      items: form.items.map(i => ({
        ...i,
        qty: Number(i.qty),
        unitPrice: Number(i.unitPrice),
      })),
      total: formTotal,
      status: 'issued',
      issuedAt: new Date().toISOString(),
      notes: form.notes,
      fromSale: form.fromSale || undefined, // ✅ CORREÇÃO TS
    }

    const updated = [newInv, ...invoices]
    save(updated)

    showToast('success', `NF-e #${newInv.number} emitida!`)

    setShowForm(false)
    setPreview(newInv)

    setForm({
      client: '',
      clientDoc: '',
      notes: '',
      fromSale: '',
      items: [{ description: '', qty: 1, unitPrice: 0 }],
    })
  }, [form, formTotal, invoices, nextNumber, save, showToast])

  const handleCancel = useCallback(
    (id: string) => {
      if (!window.confirm('Cancelar esta nota fiscal?')) return

      save(
        invoices.map(inv =>
          inv.id === id ? { ...inv, status: 'cancelled' } : inv
        )
      )

      showToast('success', 'NF-e cancelada')

      if (preview?.id === id) {
        setPreview(prev =>
          prev ? { ...prev, status: 'cancelled' } : null
        )
      }
    },
    [invoices, preview, save, showToast]
  )

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const STATUS_LABEL: Record<InvoiceStatus, string> = {
    draft: 'Rascunho',
    issued: 'Emitida',
    cancelled: 'Cancelada',
  }

  const STATUS_CLASS: Record<InvoiceStatus, string> = {
    draft: 'badge-info',
    issued: 'badge-success',
    cancelled: 'badge-danger',
  }

  const completedSales = useMemo(
    () => sales.filter(s => s.status === 'completed'),
    [sales]
  )

  return (
    <div>
      {toast && (
        <div
          className="toast"
          style={{
            background:
              toast.type === 'success'
                ? 'var(--success)'
                : 'var(--danger)',
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>NF-e / Notas Fiscais</h2>
        <button onClick={() => setShowForm(true)}>+ Nova NF-e</button>
      </div>

      {/* resto da UI permanece igual (sem alterações) */}
    </div>
  )
}