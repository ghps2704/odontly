import React, { useState, useMemo } from 'react';
import { useNexus } from '../store/NexusContext';
import { Contact, ContactType } from '../types';
import { Plus, Search, MapPin, Phone, Mail, FileText, Edit2, Trash2, X, Users, Truck, Loader2, History, Calendar, User, Package, ClipboardList } from 'lucide-react';

const Contacts: React.FC = () => {
  const { contacts, addContact, updateContact, deleteContact, settings, appointments, items, professionals } = useNexus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Contact | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'ALL'>('ALL');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [editingContact, setEditingContact] = useState<Partial<Contact>>({
      type: 'CLIENT',
      address: { city: '', neighborhood: '', number: '', state: '', street: '', zipCode: '' }
  });

  const handleOpenModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      setEditingContact({
        type: 'CLIENT',
        address: { city: '', neighborhood: '', number: '', state: '', street: '', zipCode: '' }
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenHistory = (contact: Contact) => {
      setHistoryClient(contact);
      setIsHistoryOpen(true);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Update state immediately so user can type
      setEditingContact(prev => ({
          ...prev, 
          address: { ...prev.address!, zipCode: rawValue }
      }));

      const cleanCep = rawValue.replace(/\D/g, '');

      // Trigger fetch only when valid length
      if (cleanCep.length === 8) {
          setIsLoadingCep(true);
          try {
              const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
              const data = await response.json();
              
              if (!data.erro) {
                  setEditingContact(prev => ({
                      ...prev,
                      address: {
                          ...prev.address!,
                          zipCode: rawValue,
                          street: data.logradouro,
                          neighborhood: data.bairro,
                          city: data.localidade,
                          state: data.uf
                      }
                  }));
              } 
          } catch (error) {
              console.error("Erro ao buscar CEP:", error);
          } finally {
              setIsLoadingCep(false);
          }
      }
  };

  const handleSave = () => {
    if (!editingContact.name || !editingContact.document) {
        alert("Nome e Documento são obrigatórios.");
        return;
    }

    // --- DUPLICATE CHECK ---
    const cleanDoc = editingContact.document.replace(/\D/g, '');
    const duplicate = contacts.find(c => {
        const existingDoc = c.document.replace(/\D/g, '');
        // Check if doc matches AND it's not the same contact being edited
        return existingDoc === cleanDoc && c.id !== editingContact.id;
    });

    if (duplicate) {
        alert(`Impossível salvar: O documento informado já pertence ao contato "${duplicate.name}".`);
        return;
    }

    const contactData: Contact = {
      id: editingContact.id || Date.now().toString(),
      name: editingContact.name!,
      type: editingContact.type || 'CLIENT',
      document: editingContact.document!,
      email: editingContact.email || '',
      phone: editingContact.phone || '',
      stateRegistration: editingContact.stateRegistration || '',
      address: {
          zipCode: editingContact.address?.zipCode || '',
          street: editingContact.address?.street || '',
          number: editingContact.address?.number || '',
          neighborhood: editingContact.address?.neighborhood || '',
          city: editingContact.address?.city || '',
          state: editingContact.address?.state || ''
      }
    };

    if (editingContact.id) {
      updateContact(contactData);
    } else {
      addContact(contactData);
    }
    setIsModalOpen(false);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.document.includes(searchQuery);
    const matchesType = filterType === 'ALL' || c.type === filterType || c.type === 'BOTH';
    return matchesSearch && matchesType;
  });

  // Calculate History Data
  const clientHistory = useMemo(() => {
      if (!historyClient) return [];
      return appointments
        .filter(app => app.clientId === historyClient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyClient, appointments]);

  const getTypeLabel = (type: ContactType) => {
      if (type === 'CLIENT') return { label: 'Cliente', color: 'bg-blue-100 text-blue-700' };
      if (type === 'SUPPLIER') return { label: 'Fornecedor', color: 'bg-purple-100 text-purple-700' };
      return { label: 'Ambos', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contatos Unificados</h2>
          <p className="text-slate-500">Gestão de Clientes e Fornecedores.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={18} />
          <span>Novo Contato</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                      type="text" 
                      placeholder="Buscar por nome ou Documento..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
                  <button onClick={() => setFilterType('CLIENT')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${filterType === 'CLIENT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Users size={16}/> Clientes</button>
                  <button onClick={() => setFilterType('SUPPLIER')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${filterType === 'SUPPLIER' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Truck size={16}/> Fornecedores</button>
              </div>
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                     <tr>
                         <th className="px-6 py-3">Nome / Razão Social</th>
                         <th className="px-6 py-3">Tipo</th>
                         <th className="px-6 py-3">Documento</th>
                         <th className="px-6 py-3">Contato</th>
                         <th className="px-6 py-3">Localização</th>
                         <th className="px-6 py-3 text-right">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredContacts.map(contact => {
                         const typeInfo = getTypeLabel(contact.type);
                         return (
                         <tr key={contact.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 font-medium text-slate-800">{contact.name}</td>
                             <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded-full text-xs font-bold ${typeInfo.color}`}>
                                     {typeInfo.label}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-slate-600">{contact.document}</td>
                             <td className="px-6 py-4">
                                 <div className="flex flex-col text-xs text-slate-500">
                                     {contact.email && <span className="flex items-center gap-1"><Mail size={12}/> {contact.email}</span>}
                                     {contact.phone && <span className="flex items-center gap-1"><Phone size={12}/> {contact.phone}</span>}
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-slate-600 text-xs">
                                 {contact.address.city}/{contact.address.state}
                             </td>
                             <td className="px-6 py-4 text-right flex justify-end gap-2">
                                 <button 
                                    onClick={() => handleOpenHistory(contact)} 
                                    className="text-slate-400 hover:text-indigo-600 p-1"
                                    title="Histórico de Atendimentos"
                                 >
                                     <History size={18} />
                                 </button>
                                 <button onClick={() => handleOpenModal(contact)} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={18} /></button>
                                 <button onClick={() => deleteContact(contact.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
                             </td>
                         </tr>
                     )})}
                     {filteredContacts.length === 0 && (
                         <tr>
                             <td colSpan={6} className="text-center py-8 text-slate-400">Nenhum contato encontrado.</td>
                         </tr>
                     )}
                 </tbody>
             </table>
          </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" /> 
                  {editingContact.id ? 'Editar Contato' : 'Cadastrar Contato'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Dados Básicos */}
                <div>
                    <h4 className="font-semibold text-slate-700 mb-3 border-b pb-1">Dados Cadastrais</h4>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Contato</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <input type="radio" name="contactType" checked={editingContact.type === 'CLIENT'} onChange={() => setEditingContact({...editingContact, type: 'CLIENT'})} />
                                <span>Cliente</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="contactType" checked={editingContact.type === 'SUPPLIER'} onChange={() => setEditingContact({...editingContact, type: 'SUPPLIER'})} />
                                <span>Fornecedor</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="contactType" checked={editingContact.type === 'BOTH'} onChange={() => setEditingContact({...editingContact, type: 'BOTH'})} />
                                <span>Ambos</span>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo / Razão Social</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.name || ''}
                                onChange={e => setEditingContact({...editingContact, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.document || ''}
                                onChange={e => setEditingContact({...editingContact, document: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                            <input 
                                type="email" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.email || ''}
                                onChange={e => setEditingContact({...editingContact, email: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone/Celular</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.phone || ''}
                                onChange={e => setEditingContact({...editingContact, phone: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div>
                    <h4 className="font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                        <MapPin size={16} /> Endereço Fiscal
                    </h4>
                    <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2 relative">
                             <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                             <div className="relative">
                                <input 
                                    type="text" 
                                    maxLength={9}
                                    placeholder="00000-000"
                                    className="w-full border border-slate-300 rounded-lg p-2 pr-8 bg-white text-slate-900"
                                    value={editingContact.address?.zipCode || ''}
                                    onChange={handleCepChange}
                                />
                                {isLoadingCep && (
                                    <div className="absolute right-2 top-2.5">
                                        <Loader2 size={16} className="animate-spin text-blue-500" />
                                    </div>
                                )}
                             </div>
                        </div>
                        <div className="col-span-3">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.address?.street || ''}
                                onChange={e => setEditingContact({...editingContact, address: {...editingContact.address!, street: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.address?.number || ''}
                                onChange={e => setEditingContact({...editingContact, address: {...editingContact.address!, number: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.address?.neighborhood || ''}
                                onChange={e => setEditingContact({...editingContact, address: {...editingContact.address!, neighborhood: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingContact.address?.city || ''}
                                onChange={e => setEditingContact({...editingContact, address: {...editingContact.address!, city: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                             <input 
                                type="text" 
                                maxLength={2}
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900 uppercase"
                                value={editingContact.address?.state || ''}
                                onChange={e => setEditingContact({...editingContact, address: {...editingContact.address!, state: e.target.value}})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button 
                onClick={handleSave} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Salvar Contato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && historyClient && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                  <div className="p-6 bg-slate-800 text-white rounded-t-xl flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <History size={24} /> Histórico do Cliente
                          </h3>
                          <p className="opacity-80 text-sm mt-1">{historyClient.name}</p>
                      </div>
                      <button onClick={() => setIsHistoryOpen(false)} className="hover:bg-white/20 p-1 rounded"><X size={24} /></button>
                  </div>

                  <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                      {clientHistory.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                              <p>Nenhum histórico de atendimento encontrado para este cliente.</p>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              {clientHistory.map(appt => {
                                  const profName = professionals.find(p => p.id === appt.professionalId)?.name || 'Profissional N/D';
                                  
                                  return (
                                      <div key={appt.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 relative">
                                          <div className="absolute top-4 right-4">
                                              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                                  appt.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                  appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                  'bg-blue-50 text-blue-700 border-blue-200'
                                              }`}>
                                                  {appt.status === 'COMPLETED' ? 'CONCLUÍDO' : appt.status === 'CANCELLED' ? 'CANCELADO' : 'AGENDADO'}
                                              </span>
                                          </div>

                                          <div className="flex items-center gap-3 mb-3">
                                              <div className="bg-slate-100 p-2 rounded text-slate-600">
                                                  <Calendar size={20} />
                                              </div>
                                              <div>
                                                  <p className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString()}</p>
                                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                                      <User size={12} /> {profName}
                                                  </p>
                                              </div>
                                          </div>

                                          {/* Notes / Prescriptions / Complaints */}
                                          {appt.notes && (
                                              <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-slate-700">
                                                  <p className="font-bold text-yellow-800 text-xs mb-1 flex items-center gap-1">
                                                      <ClipboardList size={12} /> Queixa / Receita / Observações:
                                                  </p>
                                                  <p>{appt.notes}</p>
                                              </div>
                                          )}

                                          {/* Items / Services Done */}
                                          <div className="space-y-2">
                                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Serviços & Produtos</p>
                                              {appt.items?.map((item, idx) => {
                                                  const itemDef = items.find(i => i.id === item.itemId);
                                                  return (
                                                      <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-1 last:border-0">
                                                          <div className="flex items-center gap-2">
                                                              <Package size={14} className="text-slate-400" />
                                                              <span className="text-slate-700">{itemDef?.name || 'Item desconhecido'}</span>
                                                          </div>
                                                          <span className="text-slate-500 text-xs">{item.quantity} {itemDef?.unit}</span>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Contacts;