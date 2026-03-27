
import React, { useState, useMemo } from 'react';
import { useNexus } from '../contexts/NexusContext';
import { Invoice, Contact, Item } from '../types';
import { FileText, CheckCircle, AlertCircle, Copy, Send, Check, BarChart3, Target, AlertTriangle, Eye, ClipboardCheck, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Fiscal: React.FC = () => {
  const { invoices, contacts, items, emitInvoice, toggleInvoiceOverdue, settings } = useNexus();
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter Invoices for Current Month
      const monthlyInvoices = invoices.filter(inv => {
          const d = new Date(inv.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const totalScheduled = monthlyInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
      const totalIssued = monthlyInvoices
        .filter(inv => inv.status === 'ISSUED')
        .reduce((acc, inv) => acc + inv.totalAmount, 0);
      
      const goal = settings.monthlyFiscalGoal || 1; // Avoid div by zero
      const percentage = (totalIssued / goal) * 100;
      
      const pendingCount = invoices.filter(inv => inv.status === 'DRAFT' || inv.status === 'OVERDUE').length;

      return { totalScheduled, totalIssued, percentage, pendingCount, goal };
  }, [invoices, settings.monthlyFiscalGoal]);

  // --- CHART DATA ---
  const chartData = [
      { name: 'Potencial (Agendado)', valor: stats.totalScheduled },
      { name: 'Realizado (Emitido)', valor: stats.totalIssued }
  ];

  const handleOpenAudit = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setAuditModalOpen(true);
  };

  const handleMarkAsIssued = () => {
      if (selectedInvoice) {
          emitInvoice(selectedInvoice.id); // This now just marks as ISSUED in context
          setAuditModalOpen(false);
          setSelectedInvoice(null);
      }
  };

  const copyToClipboard = (text: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      // Optional: Show a tiny toast notification here if needed
  };

  const sortedInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Helper to get client info safely
  const getClient = (id: string) => contacts.find(c => c.id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-[#0a0f1e]">Painel de Controle Fiscal</h2>
           <p className="text-[#64748b]">Auditoria, Controle de Metas e Preparação para Faturamento.</p>
        </div>
      </div>

      {/* --- KPI DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. THERMOMETER (GOAL) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe] col-span-2 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-lg font-bold text-[#0a0f1e] flex items-center gap-2">
                          <Target className="text-[#0284c7]" /> Meta de Faturamento (Teto)
                      </h3>
                      <p className="text-sm text-[#64748b]">Acompanhamento para não estourar o limite (MEI/Simples).</p>
                  </div>
                  <div className="text-right">
                      <span className="text-2xl font-bold text-[#0a0f1e]">{stats.percentage.toFixed(1)}%</span>
                      <p className="text-xs text-[#64748b]">do limite mensal</p>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#f0f9ff] rounded-full h-6 mb-2 relative">
                  <div 
                    className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-lg ${
                        stats.percentage >= 100 ? 'bg-red-500' : 
                        stats.percentage >= 80 ? 'bg-[#0284c7]' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                  >
                  </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-[#64748b]">
                  <span>R$ 0</span>
                  <span>Meta: R$ {stats.goal.toLocaleString('pt-BR')}</span>
              </div>

              {/* Critical Alerts */}
              {stats.percentage >= 80 && (
                  <div className={`mt-4 p-3 rounded-lg border flex items-start gap-3 ${
                      stats.percentage >= 100 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-[#fef9c3] border-[#fef9c3] text-[#854d0e]'
                  }`}>
                      <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                      <div>
                          <p className="font-bold">Atenção Fiscal!</p>
                          <p className="text-sm">
                              {stats.percentage >= 100 
                                ? 'Você atingiu ou ultrapassou o teto de faturamento mensal estipulado.' 
                                : 'Você já consumiu mais de 80% do seu limite de faturamento mensal.'}
                          </p>
                      </div>
                  </div>
              )}
          </div>

          {/* 2. BAR CHART (SCHEDULED vs ISSUED) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe]">
              <h3 className="text-sm font-bold text-[#64748b] mb-4 flex items-center gap-2">
                  <BarChart3 size={16} /> Realização Fiscal (Mês Atual)
              </h3>
              <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                          <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
                          <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20}>
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#10b981'} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
              <div className="mt-2 text-center">
                  <span className="text-xs text-[#64748b]">
                      Faltam <strong>R$ {(stats.totalScheduled - stats.totalIssued).toLocaleString('pt-BR')}</strong> para regularizar este mês.
                  </span>
              </div>
          </div>
      </div>

      {/* --- INVOICE LIST --- */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
          <div className="p-4 bg-[#f0f9ff] border-b border-[#e0f2fe] flex justify-between items-center">
              <h3 className="font-bold text-[#0a0f1e]">Fila de Emissão & Auditoria</h3>
              <span className="text-xs bg-[#e0f2fe] text-[#64748b] px-2 py-1 rounded-full font-bold">{stats.pendingCount} Pendentes</span>
          </div>
          
          <div className="divide-y divide-[#e0f2fe]">
              {sortedInvoices.map(invoice => {
                  const client = getClient(invoice.clientId);
                  const isDraft = invoice.status === 'DRAFT';
                  const isOverdue = invoice.status === 'OVERDUE';

                  return (
                      <div key={invoice.id} className={`p-4 flex flex-col md:flex-row items-center gap-4 transition-colors ${isOverdue ? 'bg-red-50' : 'hover:bg-[#f0f9ff]'}`}>
                          <div className="min-w-[50px] flex justify-center">
                              {isDraft ? (
                                  <AlertCircle className="text-[#0284c7]" size={24} />
                              ) : isOverdue ? (
                                  <XCircle className="text-red-500" size={24} />
                              ) : (
                                  <CheckCircle className="text-green-500" size={24} />
                              )}
                          </div>
                          
                          <div className="flex-1 w-full text-center md:text-left">
                              <h4 className="font-bold text-[#0a0f1e]">{client?.name || 'Cliente Removido'}</h4>
                              <p className="text-xs text-[#64748b]">
                                  Gerado em: {new Date(invoice.createdAt).toLocaleDateString()}
                              </p>
                              <div className="text-xs font-mono text-[#64748b] mt-1">
                                  Valor: R$ {invoice.totalAmount.toFixed(2)}
                              </div>
                          </div>

                          <div className="flex-1 hidden md:block text-xs text-[#64748b]">
                               {invoice.items.map((i, idx) => (
                                   <div key={idx}>{i.quantity}x {i.name}</div>
                               ))}
                          </div>

                          <div className="w-full md:w-auto flex justify-center gap-2">
                               {isDraft || isOverdue ? (
                                   <>
                                   <button 
                                      onClick={() => handleOpenAudit(invoice)}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                                   >
                                       <Eye size={16} /> Audit / Emitir
                                   </button>
                                   <button 
                                      onClick={() => toggleInvoiceOverdue(invoice.id)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
                                          isOverdue 
                                            ? 'bg-white text-[#64748b] border-[#e0f2fe] hover:bg-[#f0f9ff]' 
                                            : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                      }`}
                                      title={isOverdue ? "Remover status de inadimplência" : "Marcar como Em Atraso"}
                                   >
                                       {isOverdue ? 'Regularizar' : 'Inadimplente'}
                                   </button>
                                   </>
                               ) : (
                                   <span className="flex items-center gap-1 text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                       <Check size={14} /> Emitida
                                   </span>
                               )}
                          </div>
                      </div>
                  );
              })}
              {sortedInvoices.length === 0 && (
                  <div className="p-8 text-center text-[#64748b]">Nenhuma nota fiscal registrada.</div>
              )}
          </div>
      </div>

      {/* --- AUDIT MODAL (FOR MANUAL EMISSION) --- */}
      {auditModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 bg-[#0284c7] text-white flex justify-between items-center rounded-t-xl">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <ClipboardCheck /> Dados para Emissão
                          </h3>
                          <p className="text-xs opacity-70">Copie os dados abaixo para o portal da Prefeitura/Sefaz.</p>
                      </div>
                      <button onClick={() => setAuditModalOpen(false)} className="hover:bg-white/20 p-1 rounded"><span className="sr-only">Fechar</span>x</button>
                  </div>

                  <div className="p-6 space-y-6">
                      {/* 1. Client Data Group */}
                      <div className="bg-[#f0f9ff] p-4 rounded-lg border border-[#e0f2fe]">
                          <h4 className="font-bold text-[#0a0f1e] mb-3 border-b border-[#e0f2fe] pb-1">Tomador do Serviço / Cliente</h4>
                          {(() => {
                              const c = getClient(selectedInvoice.clientId);
                              if (!c) return <p className="text-red-500">Cliente não encontrado.</p>;
                              return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <CopyField label="Razão Social / Nome" value={c.name} onCopy={() => copyToClipboard(c.name)} />
                                      <CopyField label="CPF / CNPJ" value={c.document} onCopy={() => copyToClipboard(c.document)} />
                                      <CopyField label="E-mail" value={c.email} onCopy={() => copyToClipboard(c.email)} />
                                      <CopyField label="CEP" value={c.address.zipCode} onCopy={() => copyToClipboard(c.address.zipCode)} />
                                      <CopyField label="Endereço" value={`${c.address.street}, ${c.address.number}`} onCopy={() => copyToClipboard(`${c.address.street}, ${c.address.number}`)} />
                                      <CopyField label="Bairro" value={c.address.neighborhood} onCopy={() => copyToClipboard(c.address.neighborhood)} />
                                  </div>
                              );
                          })()}
                      </div>

                      {/* 2. Service/Product Data Group */}
                      <div className="bg-[#f0f9ff] p-4 rounded-lg border border-[#e0f2fe]">
                          <h4 className="font-bold text-[#0a0f1e] mb-3 border-b border-[#e0f2fe] pb-1">Detalhes do Item (Serviço/Produto)</h4>
                          {selectedInvoice.items.map((invItem, idx) => {
                              const itemDef = items.find(i => i.id === invItem.itemId);
                              const totalTax = itemDef?.issRate ? (invItem.total * (itemDef.issRate / 100)) : 0;

                              return (
                                  <div key={idx} className="mb-4 last:mb-0 border-b border-[#e0f2fe] pb-4 last:border-0 last:pb-0">
                                      <div className="flex justify-between font-bold text-[#0a0f1e] mb-2">
                                          <span>{invItem.name}</span>
                                          <span>R$ {invItem.total.toFixed(2)}</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {itemDef?.type === 'SERVICE' ? (
                                              <>
                                                 <CopyField label="Descrição" value={invItem.name} onCopy={() => copyToClipboard(invItem.name)} />
                                                 <CopyField label="Cód. Serviço (LC 116)" value={itemDef.lc116} onCopy={() => copyToClipboard(itemDef.lc116 || '')} />
                                                 <CopyField label="Cód. Municipal" value={itemDef.municipalCode} onCopy={() => copyToClipboard(itemDef.municipalCode || '')} />
                                                 <CopyField label="Alíquota ISS (%)" value={itemDef.issRate?.toString()} onCopy={() => copyToClipboard(itemDef.issRate?.toString() || '')} />
                                                 <CopyField label="Valor ISS (Calc)" value={totalTax > 0 ? `R$ ${totalTax.toFixed(2)}` : ''} onCopy={() => copyToClipboard(totalTax.toFixed(2))} />
                                              </>
                                          ) : (
                                              <>
                                                  <CopyField label="NCM" value={itemDef?.ncm} onCopy={() => copyToClipboard(itemDef?.ncm || '')} />
                                                  <CopyField label="Unidade" value={itemDef?.unit} onCopy={() => copyToClipboard(itemDef?.unit || '')} />
                                                  <CopyField label="CEST" value={itemDef?.cest} onCopy={() => copyToClipboard(itemDef?.cest || '')} />
                                                  <CopyField label="Origem" value={itemDef?.origin} onCopy={() => copyToClipboard(itemDef?.origin || '')} />
                                              </>
                                          )}
                                          <CopyField label="CST / CSOSN" value={itemDef?.cst_csosn} onCopy={() => copyToClipboard(itemDef?.cst_csosn || '')} />
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div className="flex justify-end pt-4 gap-3">
                          <button 
                            onClick={() => setAuditModalOpen(false)}
                            className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg font-medium"
                          >
                              Cancelar
                          </button>
                          <button 
                             onClick={handleMarkAsIssued}
                             className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-500/20 flex items-center gap-2"
                          >
                              <CheckCircle size={18} />
                              Marcar como Emitida
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Helper Component for Copy Fields
const CopyField: React.FC<{ label: string, value?: string, onCopy: () => void }> = ({ label, value, onCopy }) => {
    const missing = !value || value.trim() === '';
    
    return (
    <div className="group relative">
        <label className="block text-[10px] font-bold text-[#64748b] uppercase">{label}</label>
        <div className="flex items-center gap-2">
            {missing ? (
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle size={10} /> Campo não informado no cadastro
                </span>
            ) : (
                <>
                    <span className="text-sm font-medium text-[#0a0f1e] truncate block w-full">{value}</span>
                    <button 
                        onClick={onCopy}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#e0f2fe] rounded text-[#64748b]"
                        title="Copiar"
                    >
                        <Copy size={14} />
                    </button>
                </>
            )}
        </div>
    </div>
    );
};

export default Fiscal;
