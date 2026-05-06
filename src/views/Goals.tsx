import { useState, useCallback } from 'react'
import { useStore, type Goal } from '../context/StoreContext'

const TYPE_LABEL: Record<Goal['type'], string> = {
  revenue: 'Faturamento (R$)',
  sales_count: 'Número de Vendas',
  new_clients: 'Novos Clientes',
  avg_ticket: 'Ticket Médio (R$)',
}

const PERIOD_LABEL: Record<Goal['period'], string> = {
  daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal'
}

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal, getGoalProgress } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    title: '',
    type: 'revenue' as Goal['type'],
    target: '',
    period: 'monthly' as Goal['period'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
  })

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const openForm = (goal?: Goal) => {
    setEditingGoal(goal ?? null)
    setForm(goal ? {
      title: goal.title, type: goal.type, target: String(goal.target),
      period: goal.period, startDate: goal.startDate, endDate: goal.endDate
    } : {
      title: '', type: 'revenue', target: '', period: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    })
    setShowForm(true)
  }

  const handleSave = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.target) { showToast('error', 'Preencha todos os campos'); return }
    const data = {
      title: form.title, type: form.type,
      target: parseFloat(form.target), period: form.period,
      startDate: form.startDate, endDate: form.endDate,
    }
    if (editingGoal) {
      updateGoal(editingGoal.id, data)
      showToast('success', 'Meta atualizada!')
    } else {
      addGoal(data)
      showToast('success', 'Meta criada!')
    }
    setShowForm(false)
    setEditingGoal(null)
  }, [form, editingGoal, addGoal, updateGoal, showToast])

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#44dd88'
    if (pct >= 70)  return '#4a9eff'
    if (pct >= 40)  return '#ffaa00'
    return '#ff4444'
  }

  const activeGoals   = goals.filter(g => new Date(g.endDate) >= new Date())
  const completedGoals = goals.filter(g => new Date(g.endDate) < new Date())

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const progress   = getGoalProgress(goal)
    const pct        = Math.min(100, Math.round((progress / goal.target) * 100))
    const color      = getProgressColor(pct)
    const isRevenue  = goal.type === 'revenue' || goal.type === 'avg_ticket'
    const expired    = new Date(goal.endDate) < new Date()

    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {TYPE_LABEL[goal.type]} • {PERIOD_LABEL[goal.period]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(goal.startDate).toLocaleDateString('pt-BR')} → {new Date(goal.endDate).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {!expired && <button className="muted" onClick={() => openForm(goal)} style={{ padding: '4px 8px', fontSize: 12 }}>✏️</button>}
            <button className="muted" onClick={() => { if (window.confirm('Excluir meta?')) { deleteGoal(goal.id); showToast('success', 'Meta removida') } }}
              style={{ padding: '4px 8px', fontSize: 12, color: '#ff4444' }}>✕</button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color }}>
              {isRevenue ? `R$ ${fmt(progress)}` : Math.round(progress)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              meta: {isRevenue ? `R$ ${fmt(goal.target)}` : goal.target}
            </span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: `${pct}%`,
              background: color,
              transition: 'width 0.6s ease',
              boxShadow: pct >= 100 ? `0 0 8px ${color}` : 'none'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
            <span style={{ color, fontWeight: 700 }}>{pct}%</span>
            {pct >= 100
              ? <span style={{ color: '#44dd88', fontWeight: 700 }}>🎉 Meta atingida!</span>
              : <span style={{ color: 'var(--text-muted)' }}>
                  Falta: {isRevenue ? `R$ ${fmt(Math.max(0, goal.target - progress))}` : Math.max(0, goal.target - Math.round(progress))}
                </span>
            }
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {toast && (
        <div className="toast" style={{ background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Metas</h2>
        <button onClick={() => openForm()}>+ Nova Meta</button>
      </div>

      {/* Cards resumo */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeGoals.length}</div>
          <div style={{ color: 'var(--text-muted)' }}>Metas Ativas</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#44dd88' }}>
            {activeGoals.filter(g => {
              const pct = Math.round((getGoalProgress(g) / g.target) * 100)
              return pct >= 100
            }).length}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Atingidas</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffaa00' }}>
            {activeGoals.filter(g => {
              const pct = Math.round((getGoalProgress(g) / g.target) * 100)
              return pct >= 40 && pct < 100
            }).length}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Em Progresso</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4444' }}>
            {activeGoals.filter(g => {
              const pct = Math.round((getGoalProgress(g) / g.target) * 100)
              return pct < 40
            }).length}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Abaixo</div>
        </div>
      </div>

      {/* Metas ativas */}
      {activeGoals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Metas Ativas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {activeGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Metas encerradas */}
      {completedGoals.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12, color: 'var(--text-muted)' }}>Metas Encerradas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {completedGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nenhuma meta criada</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Defina metas de faturamento, número de vendas, novos clientes ou ticket médio
          </div>
          <button onClick={() => openForm()}>Criar primeira meta</button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay">
          <form className="modal-box" onSubmit={handleSave}>
            <h3 style={{ marginTop: 0 }}>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h3>

            <div style={{ marginBottom: 14 }}>
              <label>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Faturamento de Junho" required />
            </div>

            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label>Tipo de Meta</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Goal['type'] }))}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label>Período</label>
                <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as Goal['period'] }))}>
                  {Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label>
                Valor Alvo {(form.type === 'revenue' || form.type === 'avg_ticket') ? '(R$)' : '(quantidade)'} *
              </label>
              <input type="number" step="0.01" value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))} required />
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div>
                <label>Data Início</label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label>Data Fim</label>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted" onClick={() => { setShowForm(false); setEditingGoal(null) }}
                style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" style={{ flex: 1 }}>{editingGoal ? 'Salvar' : 'Criar Meta'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
