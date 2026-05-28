import React, { useState, useMemo } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { Professional } from '@/types';
import {
  Plus, Search, Edit2, Trash2, X, CheckCircle, AlertCircle,
  User, Phone, Mail, Calendar, Award, MapPin, Clock,
  Stethoscope, ShieldCheck, BadgeCheck, ChevronDown, ChevronUp,
  UserCheck, UserX,
} from 'lucide-react';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const SPECIALTIES = [
  'Clínica Geral', 'Ortodontia', 'Endodontia', 'Periodontia',
  'Implantodontia', 'Cirurgia', 'Estética', 'Pediatria',
  'Prótese', 'Radiologia', 'Patologia', 'Outro',
];

const EMPTY_FORM: Omit<Professional, 'id'> = {
  name: '', role: '', active: true,
  cpf: '', birthDate: '', phone: '', email: '',
  hireDate: '', cro: '', croState: 'SP', croExpiry: '',
  specialty: 'Clínica Geral',
  availability: { start: '08:00', end: '18:00', workDays: [1, 2, 3, 4, 5] },
};

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function croStatus(expiry?: string): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiry) return 'none';
  const today = new Date();
  const exp = new Date(expiry + 'T12:00:00');
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 60) return 'expiring';
  return 'valid';
}

const Professionals: React.FC = () => {
  const { professionals, addProfessional, updateProfessional, deleteProfessional, appointments } = useNexus();

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Professional, 'id'>>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return professionals.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.cro || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.specialty || '').toLowerCase().includes(search.toLowerCase());
      const matchActive =
        filterActive === 'ALL' ||
        (filterActive === 'ACTIVE' && p.active) ||
        (filterActive === 'INACTIVE' && !p.active);
      return matchSearch && matchActive;
    });
  }, [professionals, search, filterActive]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonthStart = today.slice(0, 7) + '-01';
    const total = professionals.length;
    const active = professionals.filter(p => p.active).length;
    const expiringCRO = professionals.filter(p => ['expiring', 'expired'].includes(croStatus(p.croExpiry))).length;
    const thisMonthAppts = appointments.filter(a =>
      a.date >= thisMonthStart && a.date <= today && a.status === 'COMPLETED'
    );
    return { total, active, expiringCRO, completedThisMonth: thisMonthAppts.length };
  }, [professionals, appointments]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (p: Professional) => {
    setEditingId(p.id);
    const { id, ...rest } = p;
    setForm({ ...EMPTY_FORM, ...rest });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateProfessional({ id: editingId, ...form });
    } else {
      addProfessional({ id: Date.now().toString(), ...form });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProfessional(id);
    setDeleteConfirmId(null);
    if (expandedId === id) setExpandedId(null);
  };

  const toggleDay = (day: number) => {
    const days = form.availability?.workDays || [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    setForm(f => ({ ...f, availability: { ...f.availability!, workDays: next } }));
  };

  const set = (field: keyof Omit<Professional, 'id'>, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const profAppts = (profId: string) =>
    appointments.filter(a => a.professionalId === profId).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0f1e]">Equipe Clínica</h1>
          <p className="text-[#64748b] text-sm mt-0.5">Gerencie dentistas e profissionais da sua clínica.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-blue-500/20 transition-colors"
          style={{ background: '#0284c7' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0369a1')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0284c7')}
        >
          <Plus size={18} /> Novo Profissional
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl font-bold text-[#0a0f1e]">{stats.total}</p>
          <p className="text-xs text-[#64748b] mt-0.5">profissionais</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Ativos</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-xs text-[#64748b] mt-0.5">{stats.total - stats.active} inativos</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${stats.expiringCRO > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e0f2fe]'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${stats.expiringCRO > 0 ? 'text-amber-700' : 'text-[#64748b]'}`}>CRO Atenção</p>
          <p className={`text-2xl font-bold ${stats.expiringCRO > 0 ? 'text-amber-600' : 'text-[#0a0f1e]'}`}>{stats.expiringCRO}</p>
          <p className="text-xs text-[#64748b] mt-0.5">vencidos ou a vencer</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
          <p className="text-xs font-bold text-[#0284c7] uppercase tracking-wide mb-1">Atendimentos</p>
          <p className="text-2xl font-bold text-[#0284c7]">{stats.completedThisMonth}</p>
          <p className="text-xs text-[#64748b] mt-0.5">concluídos este mês</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-[#64748b]" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, CRO ou especialidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#e0f2fe] rounded-xl text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          />
        </div>
        <div className="flex rounded-xl border border-[#e0f2fe] overflow-hidden text-sm bg-white">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-4 py-2 font-medium transition-colors ${filterActive === f ? 'bg-[#0284c7] text-white' : 'text-[#64748b] hover:bg-[#f0f9ff]'}`}>
              {f === 'ALL' ? 'Todos' : f === 'ACTIVE' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Professional cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e0f2fe] flex flex-col items-center justify-center py-20 text-[#64748b]">
          <Stethoscope size={40} className="mb-4 text-[#e0f2fe]" />
          <p className="font-semibold text-base">Nenhum profissional encontrado</p>
          <p className="text-sm mt-1">Cadastre o primeiro profissional da equipe.</p>
          <button onClick={openNew} className="mt-5 flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg bg-[#0284c7] hover:bg-[#0369a1]">
            <Plus size={15} /> Novo Profissional
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(prof => {
            const status = croStatus(prof.croExpiry);
            const isExpanded = expandedId === prof.id;
            const apptCount = profAppts(prof.id);

            return (
              <div key={prof.id} className={`bg-white rounded-xl border shadow-sm transition-all ${prof.active ? 'border-[#e0f2fe]' : 'border-slate-200 opacity-75'}`}>
                {/* Card main row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg ${prof.active ? 'bg-[#0284c7]' : 'bg-slate-400'}`}>
                    {prof.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name / role / specialty */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#0a0f1e] text-base leading-tight">{prof.name}</p>
                      {!prof.active && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Inativo</span>
                      )}
                    </div>
                    <p className="text-sm text-[#64748b]">{prof.role}{prof.specialty ? ` · ${prof.specialty}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {prof.cro && (
                        <span className="text-xs flex items-center gap-1">
                          <Award size={11} className="text-[#0284c7]" />
                          <span className="text-[#0284c7] font-medium">CRO {prof.croState} {prof.cro}</span>
                        </span>
                      )}
                      {prof.croExpiry && (
                        <span className={`text-xs flex items-center gap-1 font-medium ${status === 'valid' ? 'text-emerald-600' : status === 'expiring' ? 'text-amber-600' : 'text-red-600'}`}>
                          {status === 'valid' ? <ShieldCheck size={11} /> : <AlertCircle size={11} />}
                          {status === 'expired' ? 'CRO Vencido' : status === 'expiring' ? 'Vence em breve' : 'CRO Válido'}
                        </span>
                      )}
                      <span className="text-xs text-[#94a3b8]">{apptCount} atendimento{apptCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateProfessional({ ...prof, active: !prof.active })}
                      title={prof.active ? 'Desativar' : 'Ativar'}
                      className={`p-2 rounded-lg transition-colors ${prof.active ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {prof.active ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                    <button onClick={() => openEdit(prof)} title="Editar"
                      className="p-2 rounded-lg text-[#64748b] hover:text-[#0284c7] hover:bg-[#e0f2fe] transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteConfirmId(prof.id)} title="Excluir"
                      className="p-2 rounded-lg text-[#64748b] hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : prof.id)}
                      className="p-2 rounded-lg text-[#64748b] hover:bg-[#f0f9ff] transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[#f0f9ff] px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {prof.cpf && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">CPF</p>
                          <p className="text-[#0a0f1e]">{prof.cpf}</p>
                        </div>
                      )}
                      {prof.birthDate && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">Nascimento</p>
                          <p className="text-[#0a0f1e]">{new Date(prof.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {prof.hireDate && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">Contratação</p>
                          <p className="text-[#0a0f1e]">{new Date(prof.hireDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {prof.phone && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">Telefone</p>
                          <p className="text-[#0a0f1e]">{prof.phone}</p>
                        </div>
                      )}
                      {prof.email && (
                        <div className="col-span-2">
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">E-mail</p>
                          <p className="text-[#0a0f1e]">{prof.email}</p>
                        </div>
                      )}
                      {prof.croExpiry && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">Validade CRO</p>
                          <p className={`font-medium ${status === 'expired' ? 'text-red-600' : status === 'expiring' ? 'text-amber-600' : 'text-[#0a0f1e]'}`}>
                            {new Date(prof.croExpiry + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      {prof.availability && (
                        <div>
                          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-0.5">Jornada</p>
                          <p className="text-[#0a0f1e]">{prof.availability.start} – {prof.availability.end}</p>
                          <div className="flex gap-0.5 mt-1">
                            {DAYS.map((d, i) => (
                              <span key={i} className={`text-[9px] font-bold px-1 py-0.5 rounded ${prof.availability?.workDays.includes(i) ? 'bg-[#0284c7] text-white' : 'bg-[#f0f9ff] text-[#94a3b8]'}`}>{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Delete confirm inline */}
                {deleteConfirmId === prof.id && (
                  <div className="border-t border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between rounded-b-xl">
                    <p className="text-sm text-red-700 font-medium">Confirmar exclusão de <strong>{prof.name}</strong>?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 text-sm text-[#64748b] bg-white border border-[#e0f2fe] rounded-lg hover:bg-[#f0f9ff]">
                        Cancelar
                      </button>
                      <button onClick={() => handleDelete(prof.id)}
                        className="px-3 py-1.5 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600">
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-[#e0f2fe] px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0a0f1e]">{editingId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                <p className="text-xs text-[#64748b]">Preencha os dados do profissional</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-[#f0f9ff] text-[#64748b]">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identification */}
              <section>
                <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User size={13} /> Identificação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Nome completo *</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="Dr. João da Silva" autoFocus
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Cargo / Função</label>
                    <input value={form.role} onChange={e => set('role', e.target.value)}
                      placeholder="Cirurgião-dentista"
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Especialidade</label>
                    <select value={form.specialty} onChange={e => set('specialty', e.target.value)}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">CPF</label>
                    <input value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))}
                      placeholder="000.000.000-00" maxLength={14}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Data de nascimento</label>
                    <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                </div>
              </section>

              {/* CRO */}
              <section>
                <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Award size={13} /> Registro Profissional (CRO)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Nº do CRO</label>
                    <input value={form.cro} onChange={e => set('cro', e.target.value)}
                      placeholder="12345"
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Estado (UF)</label>
                    <select value={form.croState} onChange={e => set('croState', e.target.value)}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                      {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Validade do CRO</label>
                    <input type="date" value={form.croExpiry} onChange={e => set('croExpiry', e.target.value)}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                </div>
                {form.croExpiry && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg w-fit ${
                    croStatus(form.croExpiry) === 'expired' ? 'bg-red-50 text-red-700' :
                    croStatus(form.croExpiry) === 'expiring' ? 'bg-amber-50 text-amber-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    {croStatus(form.croExpiry) === 'valid' ? <ShieldCheck size={13} /> : <AlertCircle size={13} />}
                    {croStatus(form.croExpiry) === 'expired' ? 'CRO vencido' :
                     croStatus(form.croExpiry) === 'expiring' ? 'Vence em menos de 60 dias' :
                     'CRO dentro da validade'}
                  </div>
                )}
              </section>

              {/* Contact & HR */}
              <section>
                <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Phone size={13} /> Contato & RH
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Telefone / WhatsApp</label>
                    <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999" maxLength={15}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">E-mail</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="dentista@clinica.com.br"
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-1">Data de contratação</label>
                    <input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer w-full border border-[#e0f2fe] rounded-lg p-2.5">
                      <div
                        onClick={() => set('active', !form.active)}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.active ? 'bg-[#0284c7]' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-sm font-medium text-[#0a0f1e]">
                        {form.active ? 'Profissional ativo' : 'Profissional inativo'}
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Availability */}
              <section>
                <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={13} /> Jornada de Atendimento
                </h4>
                <div className="bg-[#f8fafc] rounded-xl border border-[#e0f2fe] p-4 space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#64748b] mb-1">Início</label>
                      <input type="time" value={form.availability?.start}
                        onChange={e => setForm(f => ({ ...f, availability: { ...f.availability!, start: e.target.value } }))}
                        className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#64748b] mb-1">Fim</label>
                      <input type="time" value={form.availability?.end}
                        onChange={e => setForm(f => ({ ...f, availability: { ...f.availability!, end: e.target.value } }))}
                        className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748b] mb-2">Dias de atendimento</label>
                    <div className="flex gap-2">
                      {DAYS.map((d, i) => {
                        const sel = form.availability?.workDays.includes(i) ?? false;
                        return (
                          <button key={i} type="button" onClick={() => toggleDay(i)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${sel ? 'bg-[#0284c7] text-white shadow' : 'bg-white text-[#64748b] border border-[#e0f2fe] hover:border-[#0284c7]'}`}>
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t border-[#e0f2fe] px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-[#64748b] hover:bg-[#f0f9ff] rounded-xl border border-[#e0f2fe] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: '#0284c7' }}
                onMouseEnter={e => { if (form.name.trim()) e.currentTarget.style.background = '#0369a1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0284c7'; }}>
                {editingId ? 'Salvar alterações' : 'Cadastrar Profissional'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Professionals;
