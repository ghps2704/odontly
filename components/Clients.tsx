import React, { useState } from 'react';
import { useNexus } from '../store/NexusContext';
import { Contact } from '../types';
import { Plus, Search, MapPin, Phone, Mail, FileText, Edit2, Trash2, X } from 'lucide-react';

const Clients: React.FC = () => {
  const { contacts, addContact, updateContact, deleteContact, settings } = useNexus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Partial<Contact>>({
      type: 'CLIENT',
      address: { city: '', neighborhood: '', number: '', state: '', street: '', zipCode: '' }
  });

  const handleOpenModal = (client?: Contact) => {
    if (client) {
      setEditingClient(client);
    } else {
      setEditingClient({
        type: 'CLIENT',
        address: { city: '', neighborhood: '', number: '', state: '', street: '', zipCode: '' }
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingClient.name || !editingClient.document) {
        alert("Nome e CPF/CNPJ são obrigatórios.");
        return;
    }

    const clientData: Contact = {
      id: editingClient.id || Date.now().toString(),
      name: editingClient.name!,
      type: editingClient.type || 'CLIENT',
      document: editingClient.document!,
      email: editingClient.email || '',
      phone: editingClient.phone || '',
      stateRegistration: editingClient.stateRegistration || '',
      address: {
          zipCode: editingClient.address?.zipCode || '',
          street: editingClient.address?.street || '',
          number: editingClient.address?.number || '',
          neighborhood: editingClient.address?.neighborhood || '',
          city: editingClient.address?.city || '',
          state: editingClient.address?.state || ''
      }
    };

    if (editingClient.id) {
      updateContact(clientData);
    } else {
      addContact(clientData);
    }
    setIsModalOpen(false);
  };

  const filteredClients = contacts.filter(c => 
    (c.type === 'CLIENT' || c.type === 'BOTH') &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.document.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Base fiscal e contatos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                  type="text" 
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                     <tr>
                         <th className="px-6 py-3">Cliente</th>
                         <th className="px-6 py-3">Documento (CPF/CNPJ)</th>
                         <th className="px-6 py-3">Contato</th>
                         <th className="px-6 py-3">Localização</th>
                         <th className="px-6 py-3 text-right">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredClients.map(client => (
                         <tr key={client.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 font-medium text-slate-800">{client.name}</td>
                             <td className="px-6 py-4 text-slate-600">{client.document}</td>
                             <td className="px-6 py-4">
                                 <div className="flex flex-col text-xs text-slate-500">
                                     {client.email && <span className="flex items-center gap-1"><Mail size={12}/> {client.email}</span>}
                                     {client.phone && <span className="flex items-center gap-1"><Phone size={12}/> {client.phone}</span>}
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-slate-600 text-xs">
                                 {client.address.city}/{client.address.state}
                             </td>
                             <td className="px-6 py-4 text-right flex justify-end gap-2">
                                 <button onClick={() => handleOpenModal(client)} className="text-slate-400 hover:text-blue-600"><Edit2 size={18} /></button>
                                 <button onClick={() => deleteContact(client.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                             </td>
                         </tr>
                     ))}
                     {filteredClients.length === 0 && (
                         <tr>
                             <td colSpan={5} className="text-center py-8 text-slate-400">Nenhum cliente encontrado.</td>
                         </tr>
                     )}
                 </tbody>
             </table>
          </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" /> 
                  {editingClient.id ? 'Editar Cliente' : 'Cadastrar Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Dados Básicos */}
                <div>
                    <h4 className="font-semibold text-slate-700 mb-3 border-b pb-1">Dados Cadastrais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo / Razão Social</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.name || ''}
                                onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.document || ''}
                                onChange={e => setEditingClient({...editingClient, document: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                            <input 
                                type="email" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.email || ''}
                                onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.stateRegistration || ''}
                                onChange={e => setEditingClient({...editingClient, stateRegistration: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone/Celular</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.phone || ''}
                                onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
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
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.address?.zipCode || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, zipCode: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro (Rua/Av)</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.address?.street || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, street: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.address?.number || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, number: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.address?.neighborhood || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, neighborhood: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                                value={editingClient.address?.city || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, city: e.target.value}})}
                            />
                        </div>
                        <div className="col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                             <input 
                                type="text" 
                                maxLength={2}
                                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900 uppercase"
                                value={editingClient.address?.state || ''}
                                onChange={e => setEditingClient({...editingClient, address: {...editingClient.address!, state: e.target.value}})}
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
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;