import { useState, useMemo, useCallback } from 'react'
import { useStore, type Appointment } from '../context/StoreContext'

export default function Appointments() {
  const { appointments, clients, addAppointment, updateAppointment, deleteAppointment } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const [form, setForm] = useState({
    client: '',
    service: '',
    date: '',
    time: '',
    notes: '',
    price: '',
    amountPaid: '',
  })

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Cálculo de troco/pendente no formulário
  const formPrice = parseFloat(form.price) || 0
  const formPaid = parseFloat(form.amountPaid) || 0
  const formChange = formPaid > formPrice ? formPaid - formPrice : 0
  const formPending = formPaid < formPrice ? formPrice - formPaid : 0

  const upcomingAppointments = useMemo(() => {
    const now = new Date()
    return appointments
      .filter(a => a.status === 'scheduled' && new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [appointments])

  const pastAppointments = useMemo(() =>
    appointments
      .filter(a => a.status !== 'scheduled' || new Date(a.date) < new Date())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [appointments])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client || !form.service || !form.date) {
      showToast('error', 'Preencha cliente, serviço e data')
      return
    }
    const price = parseFloat(form.price) || 0
    const paid = parseFloat(form.amountPaid) || 0
    const pending = price > 0 ? Math.max(0, price - paid) : 0

    addAppointment({
      client: form.client,
      service: form.service,
      date: form.date,
      time: form.time || '10:00',
      status: 'scheduled',
      notes: form.notes,
      price: price > 0 ? price : undefined,
      amountPaid: price > 0 ? paid : undefined,
      pending: price > 0 ? pending : undefined,
    })

    showToast('success', pending > 0
      ? `Agendado! Pendente: R$ ${fmt(pending)}`
      : 'Serviço agendado e quitado!'
    )
    setForm({ client: '', service: '', date: '', time: '', notes: '', price: '', amountPaid: '' })
    setShowForm(false)
  }, [form, addAppointment, showToast])

  const handleComplete = useCallback((apt: Appointment) => {
    updateAppointment(apt.id, { status: 'completed' })
    showToast('success', 'Serviço concluído!')
  }, [updateAppointment, showToast])

  const handleCancel = useCallback((apt: Appointment) => {
    if (window.confirm('Cancelar este agendamento?')) {
      deleteAppointment(apt.id)
      showToast('success', 'Agendamento cancelado')
    }
  }, [deleteAppointment, showToast])

  // Quitar pendente de um agendamento diretamente na lista
  const [settleValues, setSettleValues] = useState<Record<string, string>>({})

  const handleSettleAppointment = useCallback((apt: Appointment, paidNow: number) => {
    const newPending = Math.max(0, (apt.pending ?? 0) - paidNow)
    const newAmountPaid = (apt.amountPaid ?? 0) + paidNow
    updateAppointment(apt.id, { amountPaid: newAmountPaid, pending: newPending })
    showToast('success', newPending === 0 ? 'Serviço quitado!' : `Falta R$ ${fmt(newPending)}`)
  }, [updateAppointment, showToast])

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
        <h2 style={{ margin: 0 }}>Serviços</h2>
        <button onClick={() => setShowForm(true)}>+ Novo Agendamento</button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{appointments.length}</div>
          <div style={{ color: 'var(--muted)' }}>Total</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{upcomingAppointments.length}</div>
          <div style={{ color: 'var(--muted)' }}>Agendados</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {appointments.filter(a => a.status === 'completed').length}
          </div>
          <div style={{ color: 'var(--muted)' }}>Concluídos</div>
        </div>
      </div>

      {/* Modal de agendamento */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <form onSubmit={handleSubmit} style={{
            background: 'linear-gradient(180deg,rgba(20,25,35,0.95),rgba(15,18,28,0.95))',
            padding: 32, borderRadius: 16, width: '100%', maxWidth: 480,
            border: '1px solid rgba(255,255,255,0.05)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>Novo Agendamento</h3>

            <div style={{ marginBottom: 16 }}>
              <label>Cliente</label>
              <select value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} required>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Serviço</label>
              <input value={form.service}
                onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                required placeholder="Ex: Corte de cabelo" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label>Data</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label>Horário</label>
                <input type="time" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>

            {/* Valor e pagamento */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 10,
              padding: 16, marginBottom: 16
            }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Financeiro do Serviço</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label>Valor do Serviço (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label>Valor Pago Agora (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" value={form.amountPaid}
                    onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))} />
                </div>
              </div>

              {/* Feedback de troco/pendente */}
              {formPrice > 0 && (
                <div style={{ marginTop: 10 }}>
                  {formPaid === 0 && (
                    <div style={{ fontSize: 13, color: '#ffaa00' }}>
                      ⚠ Nenhum valor informado — ficará totalmente pendente (R$ {fmt(formPrice)})
                    </div>
                  )}
                  {formPending > 0 && formPaid > 0 && (
                    <div style={{ fontSize: 13, color: '#ffaa00' }}>
                      Pendente: R$ {fmt(formPending)}
                    </div>
                  )}
                  {formChange > 0 && (
                    <div style={{ fontSize: 13, color: '#44dd88' }}>
                      Troco: R$ {fmt(formChange)}
                    </div>
                  )}
                  {formPending === 0 && formPaid > 0 && formChange === 0 && (
                    <div style={{ fontSize: 13, color: '#44dd88' }}>
                      ✓ Serviço quitado
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Observações</label>
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" style={{ flex: 1 }}>Agendar</button>
            </div>
          </form>
        </div>
      )}

      {/* Próximos agendamentos */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Próximos Agendamentos</h3>
        {upcomingAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            Nenhum agendamento futuro
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingAppointments.map(apt => (
              <div key={apt.id} style={{
                padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                borderLeft: (apt.pending ?? 0) > 0 ? '3px solid #ffaa00' : '3px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{apt.service}</div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>
                      {clients.find(c => c.id === apt.client)?.name || 'Cliente'}
                      {' • '}{apt.date} {apt.time}
                    </div>
                    {apt.price !== undefined && apt.price > 0 && (
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        <span style={{ color: 'var(--muted)' }}>Valor: </span>
                        <span style={{ fontWeight: 600 }}>R$ {fmt(apt.price)}</span>
                        {(apt.pending ?? 0) > 0 && (
                          <span style={{ color: '#ffaa00', marginLeft: 8 }}>
                            • Pendente: R$ {fmt(apt.pending!)}
                          </span>
                        )}
                        {(apt.pending ?? 0) === 0 && apt.amountPaid !== undefined && (
                          <span style={{ color: '#44dd88', marginLeft: 8 }}>• Quitado</span>
                        )}
                      </div>
                    )}
                    {apt.notes && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{apt.notes}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <button className="muted" onClick={() => handleComplete(apt)}>Concluir</button>
                    <button className="muted" onClick={() => handleCancel(apt)}
                      style={{ color: '#ff4444' }}>Cancelar</button>
                  </div>
                </div>

                {/* Quitar pendente diretamente */}
                {(apt.pending ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                    <input
                      type="number"
                      placeholder="Receber agora"
                      value={settleValues[apt.id] ?? ''}
                      onChange={e => setSettleValues(prev => ({ ...prev, [apt.id]: e.target.value }))}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    />
                    <button
                      onClick={() => {
                        const v = parseFloat(settleValues[apt.id] ?? '')
                        if (isNaN(v) || v <= 0) { showToast('error', 'Informe um valor válido'); return }
                        handleSettleAppointment(apt, Math.min(v, apt.pending!))
                        setSettleValues(prev => ({ ...prev, [apt.id]: '' }))
                      }}
                      style={{ padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                      Receber
                    </button>
                    <button
                      className="muted"
                      onClick={() => {
                        handleSettleAppointment(apt, apt.pending!)
                        setSettleValues(prev => ({ ...prev, [apt.id]: '' }))
                      }}
                      style={{ padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Histórico</h3>
        {pastAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Sem histórico</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastAppointments.slice(0, 10).map(apt => (
              <div key={apt.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{apt.service}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {apt.date}
                    {apt.price !== undefined && apt.price > 0 && (
                      <> • R$ {fmt(apt.price)}</>
                    )}
                    {(apt.pending ?? 0) > 0 && (
                      <span style={{ color: '#ffaa00' }}> • Pendente: R$ {fmt(apt.pending!)}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 12,
                  background: apt.status === 'completed' ? 'rgba(68,221,136,0.2)' : 'rgba(255,68,68,0.2)',
                  color: apt.status === 'completed' ? '#44dd88' : '#ff4444'
                }}>
                  {apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
