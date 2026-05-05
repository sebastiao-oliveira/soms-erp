# SOM's ERP

Sistema ERP completo em React + Vite + TypeScript.

## Instalação

```bash
npm install
npm run dev
```

## Estrutura

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── context/
│   └── StoreContext.tsx       # Estado global + localStorage
├── hooks/
│   └── useLocalStorage.ts
├── components/
│   └── Header.tsx             # Nav responsivo com menu mobile
└── views/
    ├── Dashboard.tsx          # Visão geral + alertas
    ├── Pos.tsx                # PDV com múltiplas formas de pagamento
    ├── Inventory.tsx          # Estoque, entrada de mercadoria, alertas
    ├── StockManage.tsx        # Alias de Inventory (usado no App)
    ├── Clients.tsx            # Clientes PF/PJ + histórico
    ├── Finance.tsx            # Livro caixa, pendentes, resumo
    ├── Appointments.tsx       # Serviços e agendamentos
    ├── Reports.tsx            # Relatórios por período
    ├── Invoice.tsx            # NF-e simplificada
    └── Settings.tsx           # Configurações + backup
```

## Módulos

| Módulo       | Funcionalidade |
|--------------|----------------|
| Dashboard    | KPIs, vendas recentes, alertas, estoque crítico |
| PDV          | Múltiplas formas de pagamento, troco, pendente |
| Estoque      | Produtos, entrada de mercadoria, margem, alertas |
| Clientes     | PF/PJ, histórico de compras e serviços |
| Financeiro   | Livro caixa, quitação de pendentes, resumo por categoria |
| Serviços     | Agendamentos com valor, pagamento parcial |
| Relatórios   | Por período, por pagamento, top produtos, top clientes |
| NF-e         | Emissão simplificada, importação de vendas, impressão |
| Configurações| Exportação backup JSON, limpeza de dados |

## Dados

Todos os dados são armazenados no `localStorage` do navegador.  
Use **Configurações → Exportar JSON** para backup periódico.
