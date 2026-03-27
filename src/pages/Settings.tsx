
import React, { useState } from 'react';
import { useNexus } from '../contexts/NexusContext';
import { Save, Lock, Palette, Building, Briefcase, FileBadge, Scale, BarChart3, Target } from 'lucide-react';
import { TaxRegime } from '../types';

const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useNexus();
  const [form, setForm] = useState(settings);

  const handleSave = () => {
    // Validate ABC
    const total = (form.abcThresholds?.a || 70) + (form.abcThresholds?.b || 20) + (form.abcThresholds?.c || 10);
    if (Math.abs(total - 100) > 1) {
        alert("A soma das porcentagens da Curva ABC deve ser 100%.");
        return;
    }

    updateSettings(form);
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#0a0f1e]">Configurações</h2>
        <p className="text-[#64748b]">Personalize o Odontly ERP para sua empresa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Branding & Analytics Column */}
        <div className="space-y-8">
             <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e0f2fe] space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0a0f1e] border-b border-[#e0f2fe] pb-2">
                    <Palette size={20} /> Identidade Visual
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Nome Fantasia</label>
                        <input 
                            type="text" 
                            value={form.companyName}
                            onChange={e => setForm({...form, companyName: e.target.value})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Cor Primária (Tema)</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="color" 
                                value={form.primaryColor}
                                onChange={e => setForm({...form, primaryColor: e.target.value})}
                                className="h-10 w-20 p-1 rounded border border-[#e0f2fe] cursor-pointer bg-white"
                            />
                            <span className="text-sm text-[#64748b]">{form.primaryColor}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e0f2fe] space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0a0f1e] border-b border-[#e0f2fe] pb-2">
                    <BarChart3 size={20} /> Parâmetros de Inteligência (ABC)
                </h3>
                <p className="text-sm text-[#64748b]">Defina os percentuais de valor acumulado para classificação de estoque.</p>
                
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-green-600 mb-1">Classe A (%)</label>
                        <input 
                            type="number" 
                            value={form.abcThresholds?.a ?? 70}
                            onChange={e => setForm({...form, abcThresholds: { ...form.abcThresholds!, a: Number(e.target.value) }})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#0284c7] mb-1">Classe B (%)</label>
                        <input 
                            type="number" 
                            value={form.abcThresholds?.b ?? 20}
                            onChange={e => setForm({...form, abcThresholds: { ...form.abcThresholds!, b: Number(e.target.value) }})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Classe C (%)</label>
                        <input 
                            type="number" 
                            value={form.abcThresholds?.c ?? 10}
                            onChange={e => setForm({...form, abcThresholds: { ...form.abcThresholds!, c: Number(e.target.value) }})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e0f2fe] space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0a0f1e] border-b border-[#e0f2fe] pb-2">
                    <Lock size={20} /> Segurança & Sistema
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">PIN Admin</label>
                        <input 
                            type="password" 
                            maxLength={4}
                            value={form.adminPin}
                            onChange={e => setForm({...form, adminPin: e.target.value})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 font-mono tracking-widest bg-white text-[#0a0f1e]"
                        />
                        <p className="text-xs text-[#64748b] mt-1">Acesso Financeiro/Config.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Moeda</label>
                        <select 
                             value={form.currency}
                             onChange={e => setForm({...form, currency: e.target.value})}
                             className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        >
                            <option value="BRL">Real Brasileiro (BRL)</option>
                            <option value="USD">Dólar Americano (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Fiscal Profile Column */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e0f2fe] space-y-6 h-fit">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-[#0a0f1e] border-b border-[#e0f2fe] pb-2">
                <Building size={20} /> Perfil Fiscal da Empresa
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Scale size={16} /> Regime Tributário
                </label>
                <select 
                    value={form.taxRegime}
                    onChange={e => setForm({...form, taxRegime: e.target.value as TaxRegime})}
                    className="w-full border border-blue-200 rounded-lg p-2 bg-white text-[#0a0f1e] focus:ring-2 focus:ring-[#0284c7] outline-none"
                >
                    <option value="MEI">Microempreendedor Individual (MEI)</option>
                    <option value="SIMPLES">Simples Nacional</option>
                    <option value="PRESUMIDO">Lucro Presumido</option>
                    <option value="REAL">Lucro Real</option>
                </select>
                <p className="text-xs text-blue-600 mt-2">
                    * Define se o sistema usará <strong>CSOSN</strong> (Simples/MEI) ou <strong>CST</strong> (Normal) nos cadastros.
                </p>
            </div>

            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-[#64748b] mb-1 flex items-center gap-2">
                        <Target size={16} className="text-[#0284c7]" /> Meta de Faturamento Mensal (Teto)
                    </label>
                    <input 
                        type="number" 
                        value={form.monthlyFiscalGoal || ''}
                        onChange={e => setForm({...form, monthlyFiscalGoal: parseFloat(e.target.value)})}
                        placeholder="Ex: 6750.00 (Limite MEI)"
                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] font-bold"
                    />
                    <p className="text-xs text-[#64748b] mt-1">
                        Utilizado para o termômetro de emissão fiscal. Ex: R$ 6.750/mês para MEI (aprox).
                    </p>
                </div>

                <div className="border-t border-[#e0f2fe] my-4"></div>

                <div>
                    <label className="block text-sm font-medium text-[#64748b] mb-1">Razão Social</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 text-[#64748b]" size={16} />
                        <input 
                            type="text" 
                            value={form.legalName || ''}
                            onChange={e => setForm({...form, legalName: e.target.value})}
                            placeholder="Nome Oficial da Empresa"
                            className="w-full pl-9 pr-3 py-2 border border-[#e0f2fe] rounded-lg bg-white text-[#0a0f1e]"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#64748b] mb-1">CNPJ</label>
                    <div className="relative">
                        <FileBadge className="absolute left-3 top-2.5 text-[#64748b]" size={16} />
                        <input 
                            type="text" 
                            value={form.cnpj || ''}
                            onChange={e => setForm({...form, cnpj: e.target.value})}
                            placeholder="00.000.000/0001-00"
                            className="w-full pl-9 pr-3 py-2 border border-[#e0f2fe] rounded-lg bg-white text-[#0a0f1e] font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Inscrição Estadual</label>
                        <input 
                            type="text" 
                            value={form.stateRegistration || ''}
                            onChange={e => setForm({...form, stateRegistration: e.target.value})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#64748b] mb-1">Inscrição Municipal</label>
                        <input 
                            type="text" 
                            value={form.municipalRegistration || ''}
                            onChange={e => setForm({...form, municipalRegistration: e.target.value})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
           <button 
              onClick={handleSave}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-bold"
              style={{ backgroundColor: settings.primaryColor }}
           >
              <Save size={20} />
              <span>Salvar Configurações</span>
           </button>
      </div>
    </div>
  );
};

export default SettingsView;
