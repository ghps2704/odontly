
import React, { useState, useRef, useEffect } from 'react';
import { useNexus } from '../store/NexusContext';
import { Appointment, AppointmentStatus, BOMItem, PaymentMethod, SaleItem } from '../types';
import { Plus, CheckCircle, XCircle, Clock, Calendar as CalendarIcon, User, Search, ChevronDown, UserCog, AlertTriangle, Trash2, AlertOctagon, FileText, Wallet, ShoppingBag, CreditCard, Box, Tag, Percent, ThumbsUp, Star, Briefcase } from 'lucide-react';

const DAYS_OF_WEEK = [
    { id: 0, label: 'D', name: 'Domingo' },
    { id: 1, label: 'S', name: 'Segunda' },
    { id: 2, label: 'T', name: 'Terça' },
    { id: 3, label: 'Q', name: 'Quarta' },
    { id: 4, label: 'Q', name: 'Quinta' },
    { id: 5, label: 'S', name: 'Sexta' },
    { id: 6, label: 'S', name: 'Sábado' },
];

const Calendar: React.FC = () => {
  const { appointments, addAppointment, updateAppointmentStatus, completeAppointment, items, contacts, professionals, addProfessional, deleteProfessional, accounts, settings } = useNexus();
  
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  
  // Completion Flow State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [completionBOM, setCompletionBOM] = useState<BOMItem[]>([]);
  const [newMaterialId, setNewMaterialId] = useState('');
  
  // RF032 - NPS
  const [npsScore, setNpsScore] = useState<number>(0);
  
  // Discount State
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  // Financial Completion Details
  const [completionPayment, setCompletionPayment] = useState<{ accountId: string, method: PaymentMethod, installments: number }>({
      accountId: accounts[0]?.id || '',
      method: 'PIX',
      installments: 1
  });

  // Form State
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    durationMinutes: 60,
    status: 'SCHEDULED',
    clientId: '',
    professionalId: '',
    notes: '',
    items: [] // Unified List
  });
  
  // Item Adder State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemQty, setSelectedItemQty] = useState(1);

  // Professional Form State
  const [newProfName, setNewProfName] = useState('');
  const [newProfRole, setNewProfRole] = useState('');
  const [newProfStart, setNewProfStart] = useState('09:00');
  const [newProfEnd, setNewProfEnd] = useState('18:00');
  const [newProfDays, setNewProfDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri

  // Client Autocomplete State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkSchedulingConflict = (appt: Partial<Appointment>): string | null => {
      if (!appt.date || !appt.startTime || !appt.durationMinutes || !appt.professionalId || !appt.clientId) return null;

      const newStart = new Date(`${appt.date}T${appt.startTime}`);
      const newEnd = new Date(newStart.getTime() + appt.durationMinutes * 60000);

      // RF030 - Availability Scale Check
      const prof = professionals.find(p => p.id === appt.professionalId);
      if (prof && prof.availability) {
          const dayOfWeek = newStart.getDay(); // 0=Sun
          if (!prof.availability.workDays.includes(dayOfWeek)) {
              return `${prof.name} não atende neste dia da semana.`;
          }

          const shiftStart = new Date(`${appt.date}T${prof.availability.start}`);
          const shiftEnd = new Date(`${appt.date}T${prof.availability.end}`);
          
          if (newStart < shiftStart || newEnd > shiftEnd) {
              return `Horário fora do expediente de ${prof.name} (${prof.availability.start} - ${prof.availability.end}).`;
          }
      }

      const conflict = appointments.find(existing => {
          if (existing.status === 'CANCELLED') return false;

          const existingStart = new Date(`${existing.date}T${existing.startTime}`);
          const existingEnd = new Date(existingStart.getTime() + existing.durationMinutes * 60000);

          const isTimeOverlap = newStart < existingEnd && newEnd > existingStart;
          if (!isTimeOverlap) return false;

          if (existing.professionalId === appt.professionalId) return 'PROFESSIONAL';
          if (existing.clientId === appt.clientId) return 'CLIENT';
          return false;
      });

      if (conflict) {
          const conflictType = conflict.professionalId === appt.professionalId ? 'PROFESSIONAL' : 'CLIENT';
          if (conflictType === 'PROFESSIONAL') {
              const profName = professionals.find(p => p.id === conflict.professionalId)?.name;
              return `O profissional ${profName} já possui um agendamento neste horário (Cliente: ${conflict.clientName}).`;
          } else {
              return `O cliente ${conflict.clientName} já possui outro agendamento neste horário.`;
          }
      }
      return null;
  };

  const handleSaveAppt = () => {
    if (!newAppt.clientId || !newAppt.professionalId || !newAppt.items || newAppt.items.length === 0) return;

    const conflictMessage = checkSchedulingConflict(newAppt);
    if (conflictMessage) {
        setConflictError(conflictMessage);
        return;
    }

    const contact = contacts.find(c => c.id === newAppt.clientId);
    if (!contact) return;

    addAppointment({
        id: Date.now().toString(),
        clientId: contact.id,
        clientName: contact.name,
        professionalId: newAppt.professionalId,
        items: newAppt.items,
        date: newAppt.date!,
        startTime: newAppt.startTime!,
        durationMinutes: newAppt.durationMinutes || 60,
        status: 'SCHEDULED',
        notes: newAppt.notes,
    });
    closeApptModal();
  };

  const handleAddItem = () => {
      if(!selectedItemId) return;
      const itemDef = items.find(i => i.id === selectedItemId);
      if(!itemDef) return;

      const currentItems = newAppt.items || [];
      const existingIdx = currentItems.findIndex(i => i.itemId === selectedItemId);

      if (existingIdx > -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingIdx].quantity += selectedItemQty;
          setNewAppt({...newAppt, items: updatedItems});
      } else {
          setNewAppt({
              ...newAppt, 
              items: [...currentItems, { itemId: itemDef.id, quantity: selectedItemQty, unitPrice: itemDef.price }]
          });
      }
      setSelectedItemId('');
      setSelectedItemQty(1);
  };

  const handleRemoveItem = (itemId: string) => {
      setNewAppt({
          ...newAppt,
          items: (newAppt.items || []).filter(i => i.itemId !== itemId)
      });
  };

  const toggleDay = (dayId: number) => {
      if (newProfDays.includes(dayId)) {
          setNewProfDays(newProfDays.filter(d => d !== dayId));
      } else {
          setNewProfDays([...newProfDays, dayId].sort());
      }
  };

  const handleAddProfessional = () => {
      if(newProfName) {
          addProfessional({
              id: Date.now().toString(),
              name: newProfName,
              role: newProfRole || 'Especialista',
              active: true,
              availability: { 
                  start: newProfStart, 
                  end: newProfEnd, 
                  workDays: newProfDays 
              }
          });
          // Reset Form
          setNewProfName('');
          setNewProfRole('');
          setNewProfStart('09:00');
          setNewProfEnd('18:00');
          setNewProfDays([1, 2, 3, 4, 5]);
          setIsProfModalOpen(false);
      }
  };

  const closeApptModal = () => {
      setIsApptModalOpen(false);
      setConflictError(null);
      setNewAppt({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        durationMinutes: 60,
        status: 'SCHEDULED',
        clientId: '',
        professionalId: '',
        notes: '',
        items: []
      });
      setSelectedItemId('');
      setClientSearchTerm('');
      setShowClientList(false);
  };

  const handleSelectClient = (contact: typeof contacts[0]) => {
      setNewAppt({ ...newAppt, clientId: contact.id });
      setClientSearchTerm(contact.name);
      setShowClientList(false);
      setConflictError(null); 
  };

  const initiateCompletion = (appt: Appointment) => {
      setCompletingAppt(appt);
      // Reset discount state
      setDiscountType('FIXED');
      setDiscountValue(0);
      setNpsScore(0);
      
      // Calculate BOM for all Service items in the appointment
      const aggregatedBOM: Record<string, number> = {};
      
      if (appt.items) {
          appt.items.forEach(saleItem => {
              const itemDef = items.find(i => i.id === saleItem.itemId);
              if (itemDef && itemDef.type === 'SERVICE' && itemDef.bom) {
                  itemDef.bom.forEach(b => {
                      aggregatedBOM[b.itemId] = (aggregatedBOM[b.itemId] || 0) + (b.quantity * saleItem.quantity);
                  });
              }
          });
      }

      const bomList = Object.entries(aggregatedBOM).map(([itemId, quantity]) => ({ itemId, quantity }));
      setCompletionBOM(bomList);
      
      // Default to first account
      if(accounts.length > 0) {
          setCompletionPayment(prev => ({ ...prev, accountId: accounts[0].id, installments: 1 }));
      }
      setIsCompletionModalOpen(true);
  };

  // Helper to calculate total for display
  const calculateTotal = (appt: Appointment | null) => {
      if (!appt || !appt.items) return 0;
      return appt.items.reduce((acc, curr) => acc + (curr.unitPrice * curr.quantity), 0);
  };

  const handleConfirmCompletion = () => {
      if (completingAppt) {
          const subtotal = calculateTotal(completingAppt);
          let finalDiscount = 0;
          
          if (discountType === 'PERCENTAGE') {
              finalDiscount = subtotal * (discountValue / 100);
          } else {
              finalDiscount = discountValue;
          }

          // Pass NPS Score
          completeAppointment(completingAppt.id, completionBOM, completionPayment, finalDiscount, npsScore);
          
          setIsCompletionModalOpen(false);
          setCompletingAppt(null);
          setCompletionBOM([]);
          setDiscountValue(0);
          setNpsScore(0);
      }
  };

  const handleAddMaterialToCompletion = () => {
      if(!newMaterialId) return;
      const existingIdx = completionBOM.findIndex(b => b.itemId === newMaterialId);
      if (existingIdx > -1) {
          const newBOM = [...completionBOM];
          newBOM[existingIdx].quantity += 1;
          setCompletionBOM(newBOM);
      } else {
          setCompletionBOM([...completionBOM, { itemId: newMaterialId, quantity: 1 }]);
      }
      setNewMaterialId('');
  };

  const filteredContacts = contacts.filter(c => 
      (c.type === 'CLIENT' || c.type === 'BOTH') &&
      (c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.document.includes(clientSearchTerm))
  );

  const getProfessional = (id: string) => professionals.find(p => p.id === id);

  const statusColors: Record<AppointmentStatus, string> = {
    'SCHEDULED': 'bg-blue-100 text-blue-700 border-blue-200',
    'IN_PROGRESS': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'COMPLETED': 'bg-green-100 text-green-700 border-green-200',
    'CANCELLED': 'bg-[#f0f9ff] text-[#64748b] border-[#e0f2fe]',
  };

  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a0f1e]">Agenda Operacional</h2>
          <p className="text-[#64748b]">Controle atendimentos e baixa automática de estoque.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setIsProfModalOpen(true)}
                className="bg-white border border-[#e0f2fe] text-[#64748b] px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#f0f9ff] transition-colors"
            >
                <UserCog size={18} />
                <span>Profissionais</span>
            </button>
            <button 
                onClick={() => setIsApptModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
                style={{ backgroundColor: settings.primaryColor }}
            >
                <Plus size={18} />
                <span>Novo Agendamento/Venda</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-4">
            {sortedAppointments.length === 0 && (
                <div className="bg-white p-12 rounded-xl text-center text-[#64748b] border border-[#e0f2fe] border-dashed">
                    <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhum agendamento encontrado.</p>
                </div>
            )}
            {sortedAppointments.map(appt => {
                const professional = getProfessional(appt.professionalId);
                const firstItem = appt.items && appt.items.length > 0 ? items.find(i => i.id === appt.items[0].itemId) : null;
                const totalItems = appt.items ? appt.items.length : 0;
                
                // Determine icon based on mix
                const hasServices = appt.items?.some(i => items.find(k => k.id === i.itemId)?.type === 'SERVICE');
                const hasProducts = appt.items?.some(i => items.find(k => k.id === i.itemId)?.type === 'PRODUCT');

                const rawTotal = calculateTotal(appt);
                const displayTotal = appt.finalAmount !== undefined ? appt.finalAmount : rawTotal;
                const hasDiscount = appt.finalAmount !== undefined && appt.finalAmount < rawTotal;

                return (
                    <div key={appt.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#e0f2fe] flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex items-start gap-4 flex-1">
                            <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border shrink-0 ${!hasServices && hasProducts ? 'bg-[#e0f2fe] border-[#e0f2fe]' : 'bg-[#f0f9ff] border-[#e0f2fe]'}`}>
                                {!hasServices && hasProducts ? <ShoppingBag size={24} className="text-[#0284c7]" /> : (
                                    <>
                                        <span className="text-xs font-bold text-[#64748b]">{new Date(appt.date).getDate()}</span>
                                        <span className="text-xs text-[#64748b] uppercase">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-sm font-bold text-[#0a0f1e] mt-1">{appt.startTime}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-[#0a0f1e]">{appt.clientName}</h3>
                                <div className="flex flex-col text-sm text-[#64748b]">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {/* Show First Item Name */}
                                        <span className="font-medium text-[#0a0f1e]">{firstItem?.name || 'Venda Diversa'}</span>
                                        
                                        {/* Badges for Multi-item */}
                                        {totalItems > 1 && (
                                            <span className="bg-[#f0f9ff] text-[#64748b] text-[10px] px-1.5 py-0.5 rounded font-bold border border-[#e0f2fe]">
                                                +{totalItems - 1} itens
                                            </span>
                                        )}
                                        {hasProducts && <span className="text-[10px] px-1.5 py-0.5 bg-[#e0f2fe] text-[#0369a1] rounded border border-[#e0f2fe]">Produto</span>}
                                        {hasServices && <span className="text-[10px] px-1.5 py-0.5 bg-[#e0f2fe] text-[#0284c7] rounded border border-[#e0f2fe]">Serviço</span>}
                                    </div>
                                    <span className="text-xs text-[#64748b] flex items-center gap-1">
                                        <User size={12} /> {professional?.name || 'Profissional N/D'}
                                    </span>
                                </div>
                                {appt.notes && (
                                    <div className="mt-2 text-xs text-[#64748b] bg-[#f0f9ff] p-2 rounded border border-[#e0f2fe] flex gap-2 items-start">
                                        <FileText size={14} className="mt-0.5 shrink-0 text-[#64748b]" />
                                        <span className="italic">{appt.notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="text-right mr-4 hidden md:block">
                                 <div className="text-xs text-[#64748b]">Total {hasDiscount ? '(Liq.)' : ''}</div>
                                 <div className={`font-bold ${hasDiscount ? 'text-green-600' : 'text-[#0a0f1e]'}`}>
                                     R$ {displayTotal.toFixed(2)}
                                 </div>
                                 {appt.npsScore && (
                                     <div className="text-[10px] text-[#0284c7] font-bold flex items-center justify-end gap-1 mt-1">
                                         <Star size={10} fill="currentColor" /> NPS: {appt.npsScore}
                                     </div>
                                 )}
                             </div>

                             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[appt.status]}`}>
                                {appt.status === 'SCHEDULED' && 'AGENDADO'}
                                {appt.status === 'IN_PROGRESS' && 'EM ANDAMENTO'}
                                {appt.status === 'COMPLETED' && 'CONCLUÍDO'}
                                {appt.status === 'CANCELLED' && 'CANCELADO'}
                             </span>

                             {appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                                 <div className="flex space-x-2">
                                     <button 
                                        onClick={() => initiateCompletion(appt)}
                                        title="Concluir e Baixar Estoque"
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                     >
                                         <CheckCircle size={24} />
                                     </button>
                                     <button 
                                        onClick={() => updateAppointmentStatus(appt.id, 'CANCELLED')}
                                        title="Cancelar"
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                                     >
                                         <XCircle size={24} />
                                     </button>
                                 </div>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

       {/* Appointment/Sales Modal */}
       {isApptModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-visible max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e0f2fe] flex justify-between items-center">
              <h3 className="text-xl font-bold">Novo Agendamento / Venda</h3>
              <button onClick={closeApptModal}><XCircle size={24} className="text-[#64748b]" /></button>
            </div>
            
            <div className="p-6 space-y-4">
                {conflictError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                        <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-red-700">Conflito de Agenda</h4>
                            <p className="text-xs text-red-600 mt-1">{conflictError}</p>
                        </div>
                    </div>
                )}

                {/* Top Row: Client & Professional */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Cliente</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Buscar Cliente..."
                                className="w-full pl-10 pr-4 py-2 border border-[#e0f2fe] rounded-lg bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                                value={clientSearchTerm}
                                onChange={(e) => {
                                    setClientSearchTerm(e.target.value);
                                    setShowClientList(true);
                                    setConflictError(null);
                                    if (!e.target.value) setNewAppt({ ...newAppt, clientId: '' });
                                }}
                                onFocus={() => setShowClientList(true)}
                            />
                            <Search className="absolute left-3 top-2.5 text-[#64748b]" size={18} />
                        </div>

                        {showClientList && clientSearchTerm && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-[#e0f2fe] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredContacts.length > 0 ? (
                                    filteredContacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            className="w-full text-left px-4 py-2 hover:bg-[#f0f9ff] flex flex-col border-b border-[#e0f2fe] last:border-0"
                                            onClick={() => handleSelectClient(contact)}
                                        >
                                            <span className="font-medium text-[#0a0f1e]">{contact.name}</span>
                                            <span className="text-xs text-[#64748b]">Doc: {contact.document}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-sm text-[#64748b]">Nenhum cliente encontrado.</div>
                                )}
                            </div>
                        )}
                        {newAppt.clientId && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} /> Cliente selecionado
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Profissional / Vendedor</label>
                        <select 
                        value={newAppt.professionalId || ''} 
                        onChange={e => {
                            setNewAppt({...newAppt, professionalId: e.target.value});
                            setConflictError(null);
                        }}
                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        >
                            <option value="">Selecione...</option>
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {/* Unified Items Section */}
                <div className="bg-[#f0f9ff] p-4 rounded-lg border border-[#e0f2fe]">
                    <label className="block text-sm font-bold text-[#0a0f1e] mb-3 flex items-center gap-2">
                        <Box size={16} /> Itens da Venda / Serviço
                    </label>
                    
                    <div className="flex gap-2 mb-3">
                        <select 
                            className="flex-1 text-sm border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                        >
                            <option value="">Selecione um Produto ou Serviço...</option>
                            <optgroup label="Serviços">
                                {items.filter(i => i.type === 'SERVICE').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} - R$ {i.price}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Produtos">
                                {items.filter(i => i.type === 'PRODUCT').map(i => (
                                    <option key={i.id} value={i.id}>{i.name} - R$ {i.price}</option>
                                ))}
                            </optgroup>
                        </select>
                        <input 
                            type="number" 
                            min="1"
                            className="w-20 text-sm border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            value={selectedItemQty}
                            onChange={e => setSelectedItemQty(parseInt(e.target.value) || 1)}
                        />
                        <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700">
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {(!newAppt.items || newAppt.items.length === 0) ? (
                            <p className="text-center text-sm text-[#64748b] py-2 italic">Nenhum item adicionado.</p>
                        ) : (
                            newAppt.items.map((item, idx) => {
                                const def = items.find(i => i.id === item.itemId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-[#e0f2fe] shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[#0a0f1e]">{def?.name}</span>
                                            <span className="text-[10px] text-[#64748b] uppercase">{def?.type === 'SERVICE' ? 'Serviço' : 'Produto'}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span>{item.quantity} x R$ {item.unitPrice.toFixed(2)}</span>
                                            <span className="font-bold min-w-[80px] text-right">R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => handleRemoveItem(item.itemId)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {newAppt.items && newAppt.items.length > 0 && (
                        <div className="flex justify-end pt-2 border-t border-[#e0f2fe] mt-2">
                            <span className="text-sm font-bold text-[#0a0f1e]">Total: R$ {newAppt.items.reduce((a, b) => a + (b.unitPrice * b.quantity), 0).toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Data</label>
                        <input 
                            type="date" 
                            value={newAppt.date} 
                            onChange={e => {
                                setNewAppt({...newAppt, date: e.target.value});
                                setConflictError(null);
                            }}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Hora</label>
                        <input 
                            type="time" 
                            value={newAppt.startTime} 
                            onChange={e => {
                                setNewAppt({...newAppt, startTime: e.target.value});
                                setConflictError(null);
                            }}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#0a0f1e] mb-1">Observações (Opcional)</label>
                    <textarea 
                        rows={2}
                        placeholder="Detalhes adicionais..."
                        value={newAppt.notes || ''}
                        onChange={e => setNewAppt({...newAppt, notes: e.target.value})}
                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3">
              <button onClick={closeApptModal} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
              <button 
                onClick={handleSaveAppt} 
                disabled={!newAppt.clientId || !newAppt.items || newAppt.items.length === 0 || !newAppt.professionalId || !!conflictError}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-[#e0f2fe] disabled:cursor-not-allowed"
                style={{ backgroundColor: (newAppt.clientId && newAppt.items?.length && newAppt.professionalId && !conflictError) ? settings.primaryColor : undefined }}
              >
                Agendar / Vender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal (BOM Adjustment + Payment + NPS) */}
      {isCompletionModalOpen && completingAppt && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                 <div className="p-6 bg-green-600 rounded-t-xl text-white">
                     <h3 className="text-xl font-bold flex items-center gap-2">
                         <CheckCircle size={24} /> Concluir & Receber
                     </h3>
                     <p className="opacity-80 text-sm mt-1">Confirme consumo de materiais e dados de pagamento.</p>
                 </div>
                 
                 <div className="p-6 space-y-6">
                     {/* RF032 - NPS Section */}
                     <div className="bg-[#e0f2fe] p-4 rounded-lg border border-[#e0f2fe] text-center">
                         <label className="block text-sm font-bold text-[#0284c7] mb-2 flex items-center justify-center gap-2">
                             <ThumbsUp size={16} /> Pesquisa de Satisfação (NPS)
                         </label>
                         <p className="text-xs text-[#0369a1] mb-3">De 0 a 10, qual a nota do cliente?</p>
                         <div className="flex justify-center gap-1">
                             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                 <button
                                     key={score}
                                     onClick={() => setNpsScore(score)}
                                     className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                         npsScore === score 
                                            ? 'bg-[#0284c7] text-white scale-110 shadow-lg' 
                                            : 'bg-white border border-[#e0f2fe] text-[#0284c7] hover:bg-[#e0f2fe]'
                                     }`}
                                 >
                                     {score}
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* Stock Section */}
                     {/* Only show BOM adjustments if there are services involved */}
                     {completingAppt.items && completingAppt.items.some(i => items.find(k => k.id === i.itemId)?.type === 'SERVICE') && (
                         <div>
                             <h4 className="font-bold text-[#0a0f1e] mb-2 flex items-center gap-2">
                                 <AlertTriangle size={16} className="text-[#0284c7]" /> Materiais Consumidos (Serviços)
                             </h4>
                             <div className="space-y-2 mb-4">
                                 {completionBOM.map((bomItem, idx) => {
                                     const itemDef = items.find(i => i.id === bomItem.itemId);
                                     return (
                                         <div key={idx} className="flex items-center justify-between p-2 bg-white border border-[#e0f2fe] rounded-lg">
                                             <span className="text-sm text-[#0a0f1e] font-medium truncate flex-1">{itemDef?.name || 'Item Removido'}</span>
                                             <div className="flex items-center gap-2">
                                                 <input 
                                                    type="number"
                                                    className="w-16 p-1 border border-[#e0f2fe] rounded text-center text-sm"
                                                    value={bomItem.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        const newBOM = [...completionBOM];
                                                        newBOM[idx].quantity = val;
                                                        setCompletionBOM(newBOM);
                                                    }}
                                                 />
                                                 <span className="text-xs text-[#64748b] w-8">{itemDef?.unit}</span>
                                                 <button 
                                                    onClick={() => setCompletionBOM(completionBOM.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-600 p-1"
                                                 >
                                                     <Trash2 size={16} />
                                                 </button>
                                             </div>
                                         </div>
                                     )
                                 })}
                                 <div className="flex gap-2">
                                     <select 
                                        value={newMaterialId}
                                        onChange={(e) => setNewMaterialId(e.target.value)}
                                        className="flex-1 p-2 border border-[#e0f2fe] rounded-lg text-sm bg-white text-[#0a0f1e]"
                                     >
                                         <option value="">Adicionar Material Extra...</option>
                                         {items.filter(i => i.type !== 'SERVICE').map(i => (
                                             <option key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit})</option>
                                         ))}
                                     </select>
                                     <button onClick={handleAddMaterialToCompletion} disabled={!newMaterialId} className="bg-[#e0f2fe] text-[#0a0f1e] px-3 py-2 rounded-lg font-bold hover:bg-[#e0f2fe] disabled:opacity-50"><Plus size={18}/></button>
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* Finance Section (New) */}
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                         <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                             <Wallet size={18} /> Recebimento (Financeiro)
                         </h4>
                         
                         <div className="mb-4">
                             {/* Pricing Breakdown */}
                             <div className="flex justify-between items-center text-sm text-blue-600 mb-1">
                                 <span>Subtotal:</span>
                                 <span>R$ {calculateTotal(completingAppt).toFixed(2)}</span>
                             </div>
                             
                             <div className="flex items-center gap-2 mb-2">
                                 <label className="text-sm font-medium text-blue-800 flex items-center gap-1 min-w-[80px]">
                                     <Tag size={14} /> Desconto:
                                 </label>
                                 <div className="flex-1 flex gap-2">
                                     <div className="flex border border-blue-200 rounded overflow-hidden bg-white shrink-0">
                                         <button 
                                            onClick={() => setDiscountType('FIXED')}
                                            className={`px-3 py-1 text-xs font-bold ${discountType === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'text-[#64748b] hover:bg-[#f0f9ff]'}`}
                                         >
                                             R$
                                         </button>
                                         <button 
                                            onClick={() => setDiscountType('PERCENTAGE')}
                                            className={`px-3 py-1 text-xs font-bold border-l border-blue-100 ${discountType === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'text-[#64748b] hover:bg-[#f0f9ff]'}`}
                                         >
                                             %
                                         </button>
                                     </div>
                                     <input 
                                         type="number" 
                                         min="0"
                                         step="0.01"
                                         className="flex-1 p-1 border border-blue-200 rounded text-right text-sm font-medium text-red-600 bg-white"
                                         placeholder={discountType === 'PERCENTAGE' ? '0%' : '0.00'}
                                         value={discountValue || ''}
                                         onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                     />
                                 </div>
                             </div>
                             
                             {/* Calculated Discount Display */}
                             {discountType === 'PERCENTAGE' && discountValue > 0 && (
                                 <div className="flex justify-end mb-2">
                                     <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                         - R$ {(calculateTotal(completingAppt) * (discountValue / 100)).toFixed(2)}
                                     </span>
                                 </div>
                             )}

                             <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                                 <span className="text-blue-800 font-bold uppercase text-xs">Total Final</span>
                                 <span className="text-2xl font-bold text-blue-900">
                                     R$ {
                                         (() => {
                                             const subtotal = calculateTotal(completingAppt);
                                             const discountAmt = discountType === 'PERCENTAGE' ? subtotal * (discountValue / 100) : discountValue;
                                             return Math.max(0, subtotal - discountAmt).toFixed(2);
                                         })()
                                     }
                                 </span>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-blue-700 mb-1">Meio de Pagamento</label>
                                 <select 
                                    className="w-full p-2 rounded border border-blue-200 text-sm bg-white"
                                    value={completionPayment.method}
                                    onChange={e => setCompletionPayment({...completionPayment, method: e.target.value as PaymentMethod})}
                                 >
                                     <option value="PIX">Pix</option>
                                     <option value="CREDIT_CARD">Cartão Crédito</option>
                                     <option value="DEBIT_CARD">Cartão Débito</option>
                                     <option value="CASH">Dinheiro</option>
                                     <option value="BOLETO">Boleto</option>
                                     <option value="OTHER">Outro</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-blue-700 mb-1">Conta de Destino</label>
                                 <select 
                                    className="w-full p-2 rounded border border-blue-200 text-sm bg-white"
                                    value={completionPayment.accountId}
                                    onChange={e => setCompletionPayment({...completionPayment, accountId: e.target.value})}
                                 >
                                     {accounts.map(acc => (
                                         <option key={acc.id} value={acc.id}>{acc.name}</option>
                                     ))}
                                 </select>
                             </div>
                         </div>

                         {/* Installments Logic */}
                         {(completionPayment.method === 'CREDIT_CARD' || completionPayment.method === 'BOLETO') && (
                             <div className="mt-4 pt-4 border-t border-blue-200">
                                 <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                                     <CreditCard size={14} /> Parcelamento
                                 </label>
                                 <div className="flex items-center gap-2">
                                     <select 
                                         className="flex-1 p-2 rounded border border-blue-200 text-sm bg-white"
                                         value={completionPayment.installments}
                                         onChange={e => setCompletionPayment({...completionPayment, installments: parseInt(e.target.value)})}
                                     >
                                         <option value={1}>À Vista (1x)</option>
                                         {[2,3,4,5,6,10,12].map(i => {
                                             const subtotal = calculateTotal(completingAppt);
                                             const discountAmt = discountType === 'PERCENTAGE' ? subtotal * (discountValue / 100) : discountValue;
                                             const finalVal = Math.max(0, subtotal - discountAmt);
                                             return (
                                                 <option key={i} value={i}>{i}x de R$ {(finalVal/i).toFixed(2)}</option>
                                             );
                                         })}
                                     </select>
                                 </div>
                                 <p className="text-[10px] text-blue-500 mt-1">
                                     O sistema gerará lançamentos futuros (Contas a Receber) automaticamente.
                                 </p>
                             </div>
                         )}
                     </div>
                 </div>

                 <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3">
                     <button onClick={() => setIsCompletionModalOpen(false)} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                     <button onClick={handleConfirmCompletion} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-500/20">Confirmar Tudo</button>
                 </div>
             </div>
          </div>
      )}

      {/* Professionals Modal (Enhanced) */}
      {isProfModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                  <div className="p-6 border-b border-[#e0f2fe] flex justify-between items-center">
                      <h3 className="text-xl font-bold">Gerenciar Profissionais</h3>
                      <button onClick={() => setIsProfModalOpen(false)}><XCircle size={24} className="text-[#64748b]" /></button>
                  </div>
                  <div className="p-6">
                      <div className="space-y-4 mb-6 p-4 bg-[#f0f9ff] rounded-lg border border-[#e0f2fe]">
                          <h4 className="font-bold text-[#0a0f1e] text-sm flex items-center gap-2">
                              <Briefcase size={16} /> Adicionar Novo Profissional
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                  type="text" 
                                  placeholder="Nome"
                                  className="p-2 border border-[#e0f2fe] rounded-lg bg-white text-[#0a0f1e] text-sm"
                                  value={newProfName}
                                  onChange={e => setNewProfName(e.target.value)}
                              />
                              <input 
                                  type="text" 
                                  placeholder="Cargo/Espec."
                                  className="p-2 border border-[#e0f2fe] rounded-lg bg-white text-[#0a0f1e] text-sm"
                                  value={newProfRole}
                                  onChange={e => setNewProfRole(e.target.value)}
                              />
                          </div>
                          
                          {/* Availability Config */}
                          <div className="bg-white p-3 rounded border border-[#e0f2fe]">
                              <label className="block text-xs font-bold text-[#64748b] mb-2 uppercase tracking-wide">Jornada de Trabalho (Padrão)</label>
                              
                              <div className="flex gap-2 items-center mb-3">
                                  <div className="flex-1">
                                      <span className="text-xs text-[#64748b] block mb-1">Início</span>
                                      <input 
                                          type="time" 
                                          className="w-full p-1 border border-[#e0f2fe] rounded text-sm text-center"
                                          value={newProfStart}
                                          onChange={e => setNewProfStart(e.target.value)}
                                      />
                                  </div>
                                  <span className="text-[#64748b] mt-4">-</span>
                                  <div className="flex-1">
                                      <span className="text-xs text-[#64748b] block mb-1">Fim</span>
                                      <input 
                                          type="time" 
                                          className="w-full p-1 border border-[#e0f2fe] rounded text-sm text-center"
                                          value={newProfEnd}
                                          onChange={e => setNewProfEnd(e.target.value)}
                                      />
                                  </div>
                              </div>

                              <div>
                                  <span className="text-xs text-[#64748b] block mb-2">Dias de Atendimento</span>
                                  <div className="flex justify-between gap-1">
                                      {DAYS_OF_WEEK.map((day) => {
                                          const isSelected = newProfDays.includes(day.id);
                                          return (
                                              <button
                                                  key={day.id}
                                                  onClick={() => toggleDay(day.id)}
                                                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                                      isSelected 
                                                        ? 'bg-blue-600 text-white shadow-md' 
                                                        : 'bg-[#f0f9ff] text-[#64748b] hover:bg-[#e0f2fe]'
                                                  }`}
                                                  title={day.name}
                                              >
                                                  {day.label}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>

                          <button 
                              onClick={handleAddProfessional}
                              className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 disabled:bg-[#e0f2fe] disabled:shadow-none"
                              disabled={!newProfName}
                          >
                              Cadastrar Profissional
                          </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                          <h4 className="font-bold text-[#0a0f1e] text-sm mb-2">Equipe Cadastrada</h4>
                          {professionals.map(prof => (
                              <div key={prof.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-[#e0f2fe] shadow-sm">
                                  <div>
                                      <p className="font-bold text-[#0a0f1e]">{prof.name}</p>
                                      <p className="text-xs text-[#64748b]">{prof.role}</p>
                                      {prof.availability && (
                                          <div className="mt-1 flex flex-col gap-0.5">
                                              <p className="text-[10px] text-[#64748b] flex items-center gap-1">
                                                  <Clock size={10} /> {prof.availability.start} - {prof.availability.end}
                                              </p>
                                              <div className="flex gap-0.5">
                                                  {DAYS_OF_WEEK.map(d => (
                                                      <div 
                                                        key={d.id} 
                                                        className={`w-1.5 h-1.5 rounded-full ${prof.availability?.workDays.includes(d.id) ? 'bg-green-400' : 'bg-[#e0f2fe]'}`}
                                                        title={d.name}
                                                      />
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  <button onClick={() => deleteProfessional(prof.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-full">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))}
                          {professionals.length === 0 && <p className="text-center text-[#64748b] py-4 text-sm">Nenhum profissional cadastrado.</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Calendar;
