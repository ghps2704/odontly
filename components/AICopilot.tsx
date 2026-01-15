
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { useNexus } from '../store/NexusContext';
import { generateAIResponse } from '../services/geminiService';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const AICopilot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { items, transactions, appointments, accounts, settings } = useNexus();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: `Olá! Eu sou o Sozio AI. Como posso ajudar a gerir a ${settings.companyName} hoje?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context (Sanitized to avoid circular structures or too much data)
    const contextData = { 
        items: items.map(i => ({ name: i.name, stock: i.stock, cost: i.cost, price: i.price, margin: i.desiredMargin })),
        transactions: transactions.slice(0, 50).map(t => ({ date: t.date, amount: t.amount, type: t.type, category: t.category })),
        appointments: appointments.slice(0, 20).map(a => ({ 
            client: a.clientName, 
            date: a.date, 
            itemsCount: a.items?.length || 0,
            status: a.status 
        })),
        accounts: accounts.map(a => ({ name: a.name, balance: a.balance })) 
    };
    
    // Call Gemini
    const responseText = await generateAIResponse(userMsg.text, contextData as any);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: responseText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-slate-200 font-sans">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-xl flex justify-between items-center text-white">
        <div className="flex items-center space-x-2">
            <Bot size={20} className="text-amber-400" />
            <span className="font-semibold">Sozio AI</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={18} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.sender === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 rounded-tl-none">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-slate-900"
            placeholder="Pergunte sobre estoque, finanças..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">IA pode cometer erros. Verifique os dados.</p>
      </div>
    </div>
  );
};

export default AICopilot;
