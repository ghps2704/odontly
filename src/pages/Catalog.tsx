import React, { useState, useMemo } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { Item, ItemType, BOMItem } from '@/types';
import { Plus, Trash2, Edit2, Archive, DollarSign, Package, Layers, X, AlertTriangle, TrendingUp, TrendingDown, Search, ExternalLink, Calendar, Clock, BarChart3, ArrowDownToLine, ArrowUpDown, FileText, Settings2 } from 'lucide-react';
import { searchSuppliers } from '@/integrations/gemini';

const Catalog: React.FC = () => {
  const { items, addItem, deleteItem, updateItem, addStockEntry, settings } = useNexus();
  const [filter, setFilter] = useState<ItemType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'NAME' | 'MARGIN_DESC' | 'MARGIN_ASC' | 'STOCK_ASC'>('NAME');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'FISCAL'>('GENERAL');

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  
  // Procurement Modal State
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [procurementItem, setProcurementItem] = useState<string>('');
  const [procurementResult, setProcurementResult] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [editingItem, setEditingItem] = useState<Partial<Item>>({});
  const [bomList, setBomList] = useState<BOMItem[]>([]);

  // Entry State
  const [entryForm, setEntryForm] = useState({
      itemId: '',
      quantity: 0,
      price: 0,
      expiryDate: ''
  });

  // Suggested Price Calculation Logic
  const calculateSuggestedPrice = (cost: number, marginPercent: number) => {
    if (!marginPercent || marginPercent >= 100) return 0;
    const marginDecimal = marginPercent / 100;
    return cost / (1 - marginDecimal);
  };

  // ABC Analysis Logic
  const abcData = useMemo(() => {
    const stockItems = items.filter(i => i.type !== 'SERVICE');
    const totalInventoryValue = stockItems.reduce((acc, i) => acc + (i.cost * i.stock), 0);
    const sortedItems = [...stockItems].sort((a, b) => (b.cost * b.stock) - (a.cost * a.stock));
    
    let accumulatedValue = 0;
    const itemClasses: Record<string, 'A' | 'B' | 'C'> = {};
    const thresholds = settings.abcThresholds || { a: 70, b: 20, c: 10 };

    sortedItems.forEach(item => {
        const itemValue = item.cost * item.stock;
        accumulatedValue += itemValue;
        const percentage = (accumulatedValue / totalInventoryValue) * 100;

        if (percentage <= thresholds.a) itemClasses[item.id] = 'A';
        else if (percentage <= (thresholds.a + thresholds.b)) itemClasses[item.id] = 'B';
        else itemClasses[item.id] = 'C';
    });

    return itemClasses;
  }, [items, settings.abcThresholds]);

  const checkExpiry = (dateString?: string) => {
      if (!dateString) return false;
      const today = new Date();
      const expiry = new Date(dateString);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30; // 30 Days threshold
  };

  const handleOpenModal = (item?: Item) => {
    setActiveTab('GENERAL');
    if (item) {
      setEditingItem(item);
      setBomList(item.bom || []);
    } else {
      setEditingItem({ 
        type: 'PRODUCT', 
        name: '', 
        price: 0, 
        cost: 0, 
        stock: 0, 
        minStock: 0, 
        unit: 'UN',
        desiredMargin: 30, 
        ncm: '',
        cst_csosn: '', // Let user select based on regime
        origin: '0'
      });
      setBomList([]);
    }
    setIsModalOpen(true);
  };

  const handleOpenProcurement = async (item: Item) => {
      setProcurementItem(item.name);
      setIsProcurementOpen(true);
      setProcurementResult('');
      setIsSearching(true);
      
      const result = await searchSuppliers(item.name);
      setProcurementResult(result);
      setIsSearching(false);
  };

  const handleSave = () => {
    if (!editingItem.name) return;

    // NOTE: Removed Mandatory Fiscal Validation to allow flexibility.
    // Validation is now done at the moment of Invoice Emission (Fiscal Module).

    const hasBOM = editingItem.type === 'SERVICE' || (editingItem.type === 'PRODUCT' && bomList.length > 0);

    let finalCost = Number(editingItem.cost) || 0;
    if (hasBOM) {
        finalCost = bomList.reduce((acc, bom) => {
            const input = items.find(i => i.id === bom.itemId);
            return acc + (input ? input.cost * bom.quantity : 0);
        }, 0);
    }

    const newItem: Item = {
      // Basic Fields
      id: editingItem.id || Date.now().toString(),
      name: editingItem.name!,
      type: editingItem.type!,
      price: Number(editingItem.price) || 0,
      cost: finalCost,
      stock: Number(editingItem.stock) || 0,
      minStock: Number(editingItem.minStock) || 0,
      unit: editingItem.unit || 'UN',
      desiredMargin: Number(editingItem.desiredMargin) || 0,
      bom: hasBOM ? bomList : undefined,
      expiryDate: editingItem.expiryDate,
      costTrend: editingItem.costTrend,
      
      // Fiscal Fields (Saved if present, allowed to be empty)
      ncm: editingItem.ncm,
      cest: editingItem.cest,
      origin: editingItem.origin,
      gtin: editingItem.gtin,
      lc116: editingItem.lc116,
      municipalCode: editingItem.municipalCode,
      issRate: editingItem.issRate ? Number(editingItem.issRate) : undefined,
      cst_csosn: editingItem.cst_csosn
    };

    if (editingItem.id) {
      updateItem(newItem);
    } else {
      addItem(newItem);
    }
    setIsModalOpen(false);
  };

  const handleSaveEntry = () => {
      if (!entryForm.itemId || entryForm.quantity <= 0) return;
      
      addStockEntry(
          entryForm.itemId, 
          Number(entryForm.quantity), 
          Number(entryForm.price), 
          entryForm.expiryDate || undefined
      );
      
      setIsEntryModalOpen(false);
      setEntryForm({ itemId: '', quantity: 0, price: 0, expiryDate: '' });
  };

  const handleAddBOMItem = () => {
    setBomList([...bomList, { itemId: '', quantity: 1 }]);
  };

  // Logic to determine if company uses CSOSN or CST
  const isSimplesNacional = settings.taxRegime === 'MEI' || settings.taxRegime === 'SIMPLES';

  // FILTER & SORT LOGIC
  const processedItems = useMemo(() => {
    let result = items.filter(item => {
      // 1. Tab Filter
      const matchesType = filter === 'ALL' || item.type === filter;
      if (!matchesType) return false;

      // 2. Search Query Filter
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      
      // Check Name
      if (item.name.toLowerCase().includes(query)) return true;

      // Check Type (friendly names)
      const typeMap: Record<string, string> = { 'PRODUCT': 'produto', 'SERVICE': 'serviço', 'INPUT': 'insumo' };
      if (typeMap[item.type]?.includes(query)) return true;

      // Check BOM Components (Deep Search)
      if (item.bom && item.bom.length > 0) {
          const hasComponent = item.bom.some(bomItem => {
              const component = items.find(i => i.id === bomItem.itemId);
              return component?.name.toLowerCase().includes(query);
          });
          if (hasComponent) return true;
      }

      return false;
    });

    // 3. Sorting Logic
    return result.sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'STOCK_ASC') return a.stock - b.stock;
        
        // Margin Calculation
        const marginA = a.price > 0 ? ((a.price - a.cost) / a.price) : -1;
        const marginB = b.price > 0 ? ((b.price - b.cost) / b.price) : -1;

        if (sortBy === 'MARGIN_DESC') return marginB - marginA; // Highest first
        if (sortBy === 'MARGIN_ASC') return marginA - marginB; // Lowest first
        
        return 0;
    });

  }, [items, filter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a0f1e]">Catálogo Unificado</h2>
          <p className="text-[#64748b]">Gerencie produtos, serviços e insumos.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsEntryModalOpen(true)}
                className="bg-white text-[#0a0f1e] border border-[#e0f2fe] px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#f0f9ff] transition-colors"
            >
                <ArrowDownToLine size={18} />
                <span>Nova Entrada</span>
            </button>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                style={{ backgroundColor: settings.primaryColor }}
            >
                <Plus size={18} />
                <span>Novo Item</span>
            </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[#64748b]" />
            </div>
            <input
                type="text"
                placeholder="Buscar por nome, tipo ou componente da ficha técnica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-[#e0f2fe] rounded-xl leading-5 bg-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm sm:text-sm text-[#0a0f1e]"
            />
        </div>

        {/* Sort Dropdown */}
        <div className="relative w-full md:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-[#64748b]" />
            </div>
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="block w-full pl-10 pr-3 py-3 border border-[#e0f2fe] rounded-xl leading-5 bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm sm:text-sm appearance-none cursor-pointer"
            >
                <option value="NAME">Nome (A-Z)</option>
                <option value="MARGIN_DESC">Maior Rentabilidade</option>
                <option value="MARGIN_ASC">Menor Rentabilidade</option>
                <option value="STOCK_ASC">Menor Estoque</option>
            </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#e0f2fe]">
        {['ALL', 'PRODUCT', 'SERVICE', 'INPUT'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as any)}
            className={`px-4 py-2 text-sm font-medium ${
              filter === type 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-[#64748b] hover:text-[#0a0f1e]'
            }`}
          >
            {type === 'ALL' ? 'Todos' : type === 'PRODUCT' ? 'Produtos' : type === 'SERVICE' ? 'Serviços' : 'Insumos'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
        {processedItems.length === 0 ? (
            <div className="p-12 text-center text-[#64748b]">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum item encontrado para sua busca.</p>
            </div>
        ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f0f9ff] text-[#64748b] border-b border-[#e0f2fe]">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Custo / Tendência</th>
              <th className="px-6 py-4">Rentabilidade (Margem)</th>
              <th className="px-6 py-4">Preço Venda</th>
              <th className="px-6 py-4">Estoque / ABC</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0f2fe]">
            {processedItems.map(item => {
                const suggestedPrice = calculateSuggestedPrice(item.cost, item.desiredMargin || 0);
                const isMarginErosion = item.type !== 'INPUT' && item.price < suggestedPrice;
                const abcClass = abcData[item.id];
                const isExpiring = checkExpiry(item.expiryDate);
                
                // Margin Calculation
                const contributionMargin = item.price - item.cost;
                const marginPercent = item.price > 0 ? (contributionMargin / item.price) * 100 : 0;

                return (
              <tr key={item.id} className="hover:bg-[#f0f9ff]">
                <td className="px-6 py-4">
                    <div className="font-medium text-[#0a0f1e]">{item.name}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                            item.type === 'SERVICE' ? 'bg-[#e0f2fe] text-[#0284c7]' :
                            item.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' :
                            'bg-[#f0f9ff] text-[#0a0f1e]'
                        }`}>
                            {item.type}
                        </span>
                        {item.ncm && <span className="text-[10px] text-[#64748b] px-1 border border-[#e0f2fe] rounded">NCM: {item.ncm}</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-[#64748b]">
                    <div className="flex items-center gap-2">
                        <span>R$ {item.cost.toFixed(2)}</span>
                        {item.costTrend === 'UP' && (
                            <span title="Custo aumentou na última compra">
                                <TrendingUp size={14} className="text-red-500" />
                            </span>
                        )}
                        {item.costTrend === 'DOWN' && (
                            <span title="Custo baixou na última compra">
                                <TrendingDown size={14} className="text-green-500" />
                            </span>
                        )}
                    </div>
                    {item.bom && item.bom.length > 0 && <span className="text-[10px] text-[#64748b] block mt-1">(Custo via BOM)</span>}
                </td>
                <td className="px-6 py-4">
                    {item.type !== 'INPUT' ? (
                        <div className="flex flex-col">
                            <span className="text-[#0a0f1e] font-medium">R$ {contributionMargin.toFixed(2)}</span>
                            <span className={`text-xs font-bold ${marginPercent >= (item.desiredMargin || 30) ? 'text-green-600' : 'text-[#0284c7]'}`}>
                                {marginPercent.toFixed(1)}%
                            </span>
                        </div>
                    ) : (
                        <span className="text-[#64748b] text-xs">-</span>
                    )}
                </td>
                <td className="px-6 py-4">
                   {item.type !== 'INPUT' ? (
                       <div className="flex flex-col">
                           <span className={isMarginErosion ? 'text-red-600 font-bold flex items-center gap-1' : 'text-[#0a0f1e] font-medium'}>
                               R$ {item.price.toFixed(2)}
                               {isMarginErosion && <AlertTriangle size={12} />}
                           </span>
                           <span className="text-xs text-[#64748b]" title={`Baseado na Margem de ${item.desiredMargin}%`}>
                               Sug: R$ {suggestedPrice.toFixed(2)}
                           </span>
                       </div>
                   ) : '-'}
                </td>
                <td className="px-6 py-4">
                    {item.type !== 'SERVICE' ? (
                         <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                 <span className={item.stock <= item.minStock ? 'text-red-600 font-bold' : 'text-[#64748b]'}>
                                     {item.stock} {item.unit}
                                 </span>
                                 {abcClass && (
                                     <span title={`Curva ABC: Classe ${abcClass}`} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                         abcClass === 'A' ? 'bg-green-100 text-green-700' : 
                                         abcClass === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-[#f0f9ff] text-[#64748b]'
                                     }`}>
                                         {abcClass}
                                     </span>
                                 )}
                             </div>
                             {isExpiring && (
                                <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1">
                                    <Clock size={10} /> Val: {new Date(item.expiryDate!).toLocaleDateString()}
                                </span>
                             )}
                         </div>
                    ) : (
                        <span className="text-[#64748b] italic">N/A</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                  {item.type === 'INPUT' && (
                      <button 
                        onClick={() => handleOpenProcurement(item)}
                        title="Cotar Preços (AI)"
                        className="text-blue-500 hover:text-blue-700 p-1"
                      >
                          <Search size={18} />
                      </button>
                  )}
                  <button onClick={() => handleOpenModal(item)} className="text-[#64748b] hover:text-blue-600 p-1"><Edit2 size={18} /></button>
                  <button onClick={() => deleteItem(item.id)} className="text-[#64748b] hover:text-red-600 p-1"><Trash2 size={18} /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        )}
      </div>

      {/* New/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e0f2fe] flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingItem.id ? 'Editar Item' : 'Novo Item'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-[#64748b]" /></button>
            </div>
            
            <div className="flex border-b border-[#e0f2fe]">
                <button 
                    onClick={() => setActiveTab('GENERAL')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'GENERAL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}
                >
                    <Package size={16} /> Dados Gerais
                </button>
                <button 
                    onClick={() => setActiveTab('FISCAL')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'FISCAL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}
                >
                    <FileText size={16} /> Fiscal / Tributário (Opcional)
                </button>
            </div>

            <div className="p-6 space-y-4">
              {/* TAB: GENERAL */}
              {activeTab === 'GENERAL' && (
              <>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Tipo</label>
                    <select 
                      value={editingItem.type} 
                      onChange={e => setEditingItem({...editingItem, type: e.target.value as ItemType})}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                    >
                      <option value="PRODUCT">Produto (Revenda/Kit)</option>
                      <option value="SERVICE">Serviço</option>
                      <option value="INPUT">Insumo/Matéria-prima</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Nome</label>
                    <input 
                      type="text" 
                      value={editingItem.name} 
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                   <label className="block text-sm font-medium text-[#0a0f1e] mb-1">
                       {editingItem.id ? 'Custo Atual (R$)' : 'Custo Inicial (R$)'}
                       {(editingItem.type === 'SERVICE' || (editingItem.type === 'PRODUCT' && bomList.length > 0)) && 
                        <span className="text-[10px] font-normal text-blue-600 ml-1">(Calculado via BOM)</span>
                       }
                   </label>
                   <input 
                      type="number" 
                      value={editingItem.cost} 
                      disabled={editingItem.type === 'SERVICE' || (editingItem.type === 'PRODUCT' && bomList.length > 0)} 
                      onChange={e => setEditingItem({...editingItem, cost: parseFloat(e.target.value)})}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2 disabled:bg-[#f0f9ff] disabled:text-[#64748b] bg-white text-[#0a0f1e]"
                    />
                </div>
                <div>
                   <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Preço Venda (R$)</label>
                   <input 
                      type="number" 
                      disabled={editingItem.type === 'INPUT'}
                      value={editingItem.price} 
                      onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2 disabled:bg-[#f0f9ff] bg-white text-[#0a0f1e]"
                    />
                </div>
                <div>
                   <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Unidade Com. (UN/KG)</label>
                   <input 
                      type="text" 
                      value={editingItem.unit} 
                      onChange={e => setEditingItem({...editingItem, unit: e.target.value.toUpperCase()})}
                      className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] uppercase"
                      placeholder="UN"
                    />
                </div>
              </div>

              {/* Traceability Section (Inputs/Products) */}
              {editingItem.type !== 'SERVICE' && (
                  <div className="grid grid-cols-1 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <div>
                          <label className="block text-sm font-medium text-yellow-800 mb-1 flex items-center gap-1">
                              <Calendar size={14} /> Validade (Mais próxima)
                          </label>
                          <input 
                              type="date" 
                              value={editingItem.expiryDate || ''} 
                              onChange={e => setEditingItem({...editingItem, expiryDate: e.target.value})}
                              className="w-full border border-yellow-200 rounded-lg p-2 text-sm bg-white text-[#0a0f1e]"
                          />
                      </div>
                  </div>
              )}

              {/* Pricing Simulator */}
              {editingItem.type !== 'INPUT' && (
                  <div className="bg-[#e0f2fe] p-4 rounded-lg border border-[#e0f2fe]">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-[#0284c7] flex items-center gap-2">
                            <TrendingUp size={16} /> Precificação Inteligente
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-[#0284c7] mb-1">Margem Desejada (%)</label>
                            <input 
                                type="number" 
                                value={editingItem.desiredMargin} 
                                onChange={e => setEditingItem({...editingItem, desiredMargin: parseFloat(e.target.value)})}
                                className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e]"
                                placeholder="Ex: 30"
                            />
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-[#0284c7] mb-1">Preço Sugerido</label>
                             <div className="text-lg font-bold text-[#0369a1]">
                                 R$ {calculateSuggestedPrice(editingItem.cost || 0, editingItem.desiredMargin || 0).toFixed(2)}
                             </div>
                             <p className="text-[10px] text-[#64748b]">Custo / (1 - Margem)</p>
                          </div>
                      </div>
                  </div>
              )}

              {editingItem.type !== 'SERVICE' && (
                  <div className="grid grid-cols-2 gap-4 bg-[#f0f9ff] p-4 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">{editingItem.id ? 'Estoque Atual' : 'Estoque Inicial'}</label>
                        <input 
                            type="number" 
                            value={editingItem.stock} 
                            onChange={e => setEditingItem({...editingItem, stock: parseFloat(e.target.value)})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Estoque Mínimo</label>
                        <input 
                            type="number" 
                            value={editingItem.minStock} 
                            onChange={e => setEditingItem({...editingItem, minStock: parseFloat(e.target.value)})}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            />
                    </div>
                  </div>
              )}

              {/* BOM Section */}
              {(editingItem.type === 'SERVICE' || editingItem.type === 'PRODUCT') && (
                  <div className="border border-[#e0f2fe] rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-[#0a0f1e] flex items-center">
                              <Layers size={18} className="mr-2" /> 
                              {editingItem.type === 'SERVICE' ? 'Ficha Técnica (Insumos)' : 'Composição do Produto (Kit/Manufatura)'}
                          </h4>
                          <button onClick={handleAddBOMItem} className="text-xs bg-[#e0f2fe] px-2 py-1 rounded hover:bg-[#e0f2fe]">
                             + Item
                          </button>
                      </div>
                      <div className="space-y-2">
                        {bomList.map((bom, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <select 
                                    className="flex-1 border border-[#e0f2fe] rounded p-1 text-sm bg-white text-[#0a0f1e]"
                                    value={bom.itemId}
                                    onChange={e => {
                                        const newList = [...bomList];
                                        newList[index].itemId = e.target.value;
                                        setBomList(newList);
                                    }}
                                >
                                    <option value="">Selecione um Item</option>
                                    {items.filter(i => i.id !== editingItem.id && i.type !== 'SERVICE').map(i => (
                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                    ))}
                                </select>
                                <input 
                                    type="number" 
                                    className="w-20 border border-[#e0f2fe] rounded p-1 text-sm bg-white text-[#0a0f1e]"
                                    placeholder="Qtd"
                                    value={bom.quantity}
                                    onChange={e => {
                                        const newList = [...bomList];
                                        newList[index].quantity = parseFloat(e.target.value);
                                        setBomList(newList);
                                    }}
                                />
                                <button 
                                    onClick={() => setBomList(bomList.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {bomList.length === 0 && (
                            <p className="text-sm text-[#64748b] italic">
                                {editingItem.type === 'SERVICE' ? 'Nenhum insumo vinculado.' : 'Produto sem composição (Preço de custo manual).'}
                            </p>
                        )}
                        
                        {bomList.length > 0 && (
                            <div className="mt-4 pt-2 border-t border-[#e0f2fe] flex justify-between items-center">
                                <span className="text-sm font-medium text-[#64748b]">Custo Total da Composição:</span>
                                <span className="font-bold text-[#0a0f1e]">R$ {
                                    bomList.reduce((acc, bom) => {
                                        const input = items.find(i => i.id === bom.itemId);
                                        return acc + (input ? input.cost * bom.quantity : 0);
                                    }, 0).toFixed(2)
                                }</span>
                            </div>
                        )}
                      </div>
                  </div>
              )}
              </>
              )}

              {/* TAB: FISCAL (OPTIONAL) */}
              {activeTab === 'FISCAL' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 border border-blue-100 mb-4 flex items-start gap-2">
                          <Settings2 size={18} className="mt-0.5" />
                          <div>
                              <p className="font-bold">Cadastro Flexível</p>
                              <p>Os campos abaixo são <strong>opcionais</strong> para cadastro, mas podem ser necessários para emissão de Nota Fiscal no futuro.</p>
                          </div>
                      </div>

                      {/* Common Fields */}
                      <div>
                          <label className="block text-sm font-medium text-[#0a0f1e] mb-1">
                              Situação Tributária ({isSimplesNacional ? 'CSOSN' : 'CST'})
                          </label>
                          <select 
                              value={editingItem.cst_csosn || (isSimplesNacional ? '102' : '00')} 
                              onChange={e => setEditingItem({...editingItem, cst_csosn: e.target.value})}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                          >
                              {isSimplesNacional ? (
                                  <optgroup label="Simples Nacional (CSOSN)">
                                      <option value="101">101 - Tributada com permissão de crédito</option>
                                      <option value="102">102 - Tributada sem permissão de crédito</option>
                                      <option value="103">103 - Isenção do ICMS no SN</option>
                                      <option value="300">300 - Imune</option>
                                      <option value="400">400 - Não tributada pelo SN</option>
                                      <option value="500">500 - ICMS cobrado anteriormente (ST)</option>
                                      <option value="900">900 - Outros</option>
                                  </optgroup>
                              ) : (
                                  <optgroup label="Regime Normal (CST)">
                                      <option value="00">00 - Tributada integralmente</option>
                                      <option value="20">20 - Com redução de base de cálculo</option>
                                      <option value="40">40 - Isenta</option>
                                      <option value="60">60 - Cobrado anteriormente (ST)</option>
                                  </optgroup>
                              )}
                          </select>
                      </div>

                      {/* PRODUCT SPECIFIC FIELDS */}
                      {(editingItem.type === 'PRODUCT' || editingItem.type === 'INPUT') && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">NCM (8 dígitos)</label>
                                    <input 
                                        type="text" 
                                        maxLength={8}
                                        placeholder="Ex: 33049990"
                                        value={editingItem.ncm || ''} 
                                        onChange={e => setEditingItem({...editingItem, ncm: e.target.value.replace(/\D/g,'')})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] font-mono"
                                    />
                                    <p className="text-xs text-[#64748b] mt-1">Nomenclatura Comum do Mercosul</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">CEST</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 2002900"
                                        value={editingItem.cest || ''} 
                                        onChange={e => setEditingItem({...editingItem, cest: e.target.value.replace(/\D/g,'')})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Origem da Mercadoria</label>
                                    <select 
                                        value={editingItem.origin || '0'} 
                                        onChange={e => setEditingItem({...editingItem, origin: e.target.value})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                                    >
                                        <option value="0">0 - Nacional</option>
                                        <option value="1">1 - Estrangeira (Imp. direta)</option>
                                        <option value="2">2 - Estrangeira (Adq. mercado interno)</option>
                                        <option value="3">3 - Nacional (Conteúdo Imp. &gt; 40%)</option>
                                        <option value="5">5 - Nacional (Conteúdo Imp. &lt;= 40%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">GTIN / EAN (Código de Barras)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 789..."
                                        value={editingItem.gtin || ''} 
                                        onChange={e => setEditingItem({...editingItem, gtin: e.target.value.replace(/\D/g,'')})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] font-mono"
                                    />
                                </div>
                            </div>
                          </>
                      )}

                      {/* SERVICE SPECIFIC FIELDS */}
                      {editingItem.type === 'SERVICE' && (
                          <>
                             <div>
                                <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Código do Serviço (LC 116/03)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: 06.01 - Barbearia..."
                                    value={editingItem.lc116 || ''} 
                                    onChange={e => setEditingItem({...editingItem, lc116: e.target.value})}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Cód. Tributação Municipal</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 12345"
                                        value={editingItem.municipalCode || ''} 
                                        onChange={e => setEditingItem({...editingItem, municipalCode: e.target.value})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Alíquota ISS (%)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: 5"
                                        value={editingItem.issRate ?? ''} 
                                        onChange={e => setEditingItem({...editingItem, issRate: parseFloat(e.target.value)})}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                                    />
                                </div>
                             </div>
                          </>
                      )}
                  </div>
              )}
            </div>

            <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
              <button 
                onClick={handleSave} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Salvar Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Entry Modal */}
      {isEntryModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                  <div className="p-6 border-b border-[#e0f2fe] flex justify-between items-center">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                          <ArrowDownToLine className="text-green-600" />
                          Nova Entrada de Estoque
                      </h3>
                      <button onClick={() => setIsEntryModalOpen(false)}><X size={24} className="text-[#64748b]" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Item</label>
                          <select
                              value={entryForm.itemId}
                              onChange={e => setEntryForm({...entryForm, itemId: e.target.value})}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                          >
                              <option value="">Selecione um item...</option>
                              {items.filter(i => i.type !== 'SERVICE').map(i => (
                                  <option key={i.id} value={i.id}>{i.name} (Atual: {i.stock} {i.unit})</option>
                              ))}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Quantidade Comprada</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  value={entryForm.quantity}
                                  onChange={e => setEntryForm({...entryForm, quantity: parseFloat(e.target.value)})}
                                  className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Preço Unit. Compra</label>
                              <input 
                                  type="number" 
                                  min="0"
                                  value={entryForm.price}
                                  onChange={e => setEntryForm({...entryForm, price: parseFloat(e.target.value)})}
                                  className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Nova Validade (Opcional)</label>
                          <input 
                              type="date"
                              value={entryForm.expiryDate}
                              onChange={e => setEntryForm({...entryForm, expiryDate: e.target.value})}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                          />
                          <p className="text-xs text-[#64748b] mt-1">O sistema manterá a data mais próxima se a atual for menor.</p>
                      </div>

                      {entryForm.itemId && entryForm.quantity > 0 && (
                          <div className="bg-[#f0f9ff] p-3 rounded text-sm text-[#64748b] border border-[#e0f2fe]">
                              <p>Custo Atual: <strong>R$ {items.find(i => i.id === entryForm.itemId)?.cost.toFixed(2)}</strong></p>
                              <p>Novo Custo Médio (Previsto): <strong>R$ {
                                  (() => {
                                      const item = items.find(i => i.id === entryForm.itemId);
                                      if(!item) return 0;
                                      const oldVal = item.stock * item.cost;
                                      const newVal = entryForm.quantity * entryForm.price;
                                      return ((oldVal + newVal) / (item.stock + entryForm.quantity)).toFixed(2);
                                  })()
                              }</strong></p>
                          </div>
                      )}
                  </div>
                  <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3">
                      <button onClick={() => setIsEntryModalOpen(false)} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                      <button 
                          onClick={handleSaveEntry} 
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/20"
                      >
                          Confirmar Entrada
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Procurement Modal (AI Search) */}
      {isProcurementOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-xl text-white flex justify-between items-center">
                   <h3 className="font-bold flex items-center gap-2">
                       <Search size={20} /> Otimizador de Compras
                   </h3>
                   <button onClick={() => setIsProcurementOpen(false)} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <p className="text-[#64748b] mb-4">
                        Buscando fornecedores online para: <strong className="text-[#0a0f1e]">{procurementItem}</strong>
                    </p>
                    
                    {isSearching ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                             <p className="text-sm text-[#64748b] animate-pulse">A IA está consultando o mercado...</p>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-sm prose-blue max-w-none bg-[#f0f9ff] p-4 rounded-lg border border-[#e0f2fe]"
                            dangerouslySetInnerHTML={{ __html: procurementResult }}
                        />
                    )}
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Catalog;