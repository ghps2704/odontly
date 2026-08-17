import React, { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { DRE_STRUCTURE_LABELS } from './financeUtils';
import { CostCenter, DRECategoryType, FinancialCategory } from '@/types';

interface ConfigTabProps {
    dreGroupedCategories: Record<string, FinancialCategory[]>;
    openCategoryModal: (prefillDreClass?: DRECategoryType) => void;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ dreGroupedCategories, openCategoryModal }) => {
    const { deleteCategory, costCenters, addCostCenter, deleteCostCenter } = useNexus();
    const [newCostCenterName, setNewCostCenterName] = useState('');

    const handleAddCostCenter = () => {
        const name = newCostCenterName.trim();
        if (!name) return;
        const newCostCenter: CostCenter = { id: Date.now().toString(), name };
        addCostCenter(newCostCenter);
        setNewCostCenterName('');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe]">
                <div className="flex justify-between items-center mb-6">
                    <div><h3 className="text-lg font-bold text-[#0a0f1e]">Plano de Contas Unificado</h3><p className="text-sm text-[#64748b]">Categorias de Caixa alinhadas à DRE.</p></div>
                    <button onClick={() => openCategoryModal()} className="bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0284c7] flex items-center gap-2"><Plus size={16} /> Nova Categoria</button>
                </div>
                <div className="space-y-6 mb-8">
                    {(Object.keys(DRE_STRUCTURE_LABELS) as DRECategoryType[]).map(dreKey => (
                        <div key={dreKey} className="border border-[#e0f2fe] rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 bg-[#f0f9ff] border-b border-[#e0f2fe]"><span className={`font-bold text-sm uppercase tracking-wide ${DRE_STRUCTURE_LABELS[dreKey].color}`}>{DRE_STRUCTURE_LABELS[dreKey].label}</span><button onClick={() => openCategoryModal(dreKey)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"><Plus size={12} /> Adicionar Item</button></div>
                            <div className="p-0">
                                {dreGroupedCategories[dreKey].length === 0 ? <div className="p-4 text-center text-xs text-[#64748b] italic">Nenhuma categoria.</div> :
                                    <div className="divide-y divide-[#e0f2fe]">{dreGroupedCategories[dreKey].map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center p-3 hover:bg-[#f0f9ff]"><span className="text-sm text-[#0a0f1e] font-medium">{cat.name}</span>{!cat.isSystem && <button onClick={() => deleteCategory(cat.id)} className="text-[#64748b] hover:text-red-500 p-1"><Trash2 size={14} /></button>}</div>
                                    ))}</div>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe]">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-[#0a0f1e] flex items-center gap-2"><Building2 size={18} /> Centros de Custo</h3>
                        <p className="text-sm text-[#64748b]">Separa as áreas de custo da empresa — ex: Marketing, Produtos.</p>
                    </div>
                </div>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Nome do centro de custo (ex: Marketing)"
                        value={newCostCenterName}
                        onChange={e => setNewCostCenterName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCostCenter()}
                        className="flex-1 border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                    />
                    <button onClick={handleAddCostCenter} className="bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0369a1] flex items-center gap-2">
                        <Plus size={16} /> Adicionar
                    </button>
                </div>
                <div className="border border-[#e0f2fe] rounded-lg overflow-hidden">
                    {costCenters.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#64748b] italic">Nenhum centro de custo cadastrado.</div>
                    ) : (
                        <div className="divide-y divide-[#e0f2fe]">
                            {costCenters.map(cc => (
                                <div key={cc.id} className="flex justify-between items-center p-3 hover:bg-[#f0f9ff]">
                                    <span className="text-sm text-[#0a0f1e] font-medium">{cc.name}</span>
                                    <button onClick={() => deleteCostCenter(cc.id)} className="text-[#64748b] hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfigTab;
