import { useState, useCallback } from 'react'
import { useStore } from '../context/StoreContext'

export default function Settings() {
  const { settings, setSettings, products, clients, sales, appointments, cashEntries } = useStore()
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [form, setForm] = useState({
    companyName: settings.companyName,
    lowStockThreshold: String(settings.lowStockThreshold),
    darkMode: settings.darkMode,
  })
  const [showClearConfirm, setShowClearConfirm] = useState<string | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleSave = useCallback(() => {
    setSettings({
      companyName: form.companyName || "SOM's Gestão",
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
      darkMode: form.darkMode,
    })
    showToast('success', 'Configurações salvas!')
  }, [form, setSettings, showToast])

  // Exporta todos os dados como JSON
  const handleExport = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      products,
      clients,
      sales,
      appointments,
      cashEntries,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', 'Backup exportado!')
  }, [products, clients, sales, appointments, cashEntries, showToast])

  // Limpa uma entidade específica do localStorage
  const handleClear = useCallback((key: string, label: string) => {
    localStorage.removeItem(key)
    window.location.reload()
  }, [])

  const stats = [
    { label: 'Produtos', value: products.length, key: 'products', color: '#4a9eff' },
    { label: 'Clientes', value: clients.length, key: 'clients', color: '#44dd88' },
    { label: 'Vendas', value: sales.length, key: 'sales', color: '#a78bfa' },
    { label: 'Serviços', value: appointments.length, key: 'appointments', color: '#ffaa00' },
    { label: 'Lançamentos', value: cashEntries.length, key: 'cashEntries', color: '#ff6b6b' },
  ]

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 10,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', fontWeight: 600, zIndex: 1000
        }}>{toast.message}</div>
      )}

      <h2 style={{ marginBottom: 24 }}>Configurações</h2>

      {/* Geral */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Geral</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label>Nome da Empresa</label>
            <input value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="Nome do seu negócio" />
          </div>
          <div>
            <label>Limite de Estoque Baixo (unidades)</label>
            <input type="number" value={form.lowStockThreshold}
              onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleSave} style={{ padding: '10px 28px' }}>Salvar Configurações</button>
      </div>

      {/* Dados do sistema */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Dados Armazenados</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          {stats.map(s => (
            <div key={s.key} style={{
              padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 10, textAlign: 'center'
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Exportar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'rgba(68,221,136,0.06)', borderRadius: 10, marginBottom: 12
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>Exportar Backup</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Baixe todos os dados em formato JSON
            </div>
          </div>
          <button onClick={handleExport} style={{ padding: '8px 20px' }}>
            ⬇ Exportar JSON
          </button>
        </div>

        {/* Limpar dados individuais */}
        <div style={{
          padding: '14px 16px', background: 'rgba(255,68,68,0.05)',
          borderRadius: 10, border: '1px solid rgba(255,68,68,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Limpar Dados</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Remove permanentemente os dados selecionados. Ação irreversível.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.map(s => (
              <div key={s.key}>
                {showClearConfirm === s.key ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#ff4444' }}>Confirmar?</span>
                    <button onClick={() => handleClear(s.key, s.label)}
                      style={{ padding: '4px 12px', fontSize: 12, background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      Sim
                    </button>
                    <button className="muted" onClick={() => setShowClearConfirm(null)}
                      style={{ padding: '4px 10px', fontSize: 12 }}>
                      Não
                    </button>
                  </div>
                ) : (
                  <button className="muted" onClick={() => setShowClearConfirm(s.key)}
                    style={{ padding: '6px 14px', fontSize: 13, color: '#ff6666' }}>
                    Limpar {s.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sobre */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Sobre o Sistema</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sistema</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{settings.companyName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Versão</span>
            <span style={{ color: '#fff' }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Armazenamento</span>
            <span style={{ color: '#fff' }}>Local (navegador)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Módulos</span>
            <span style={{ color: '#fff' }}>PDV • Estoque • Clientes • Financeiro • Serviços • Relatórios</span>
          </div>
        </div>
      </div>
    </div>
  )
}
