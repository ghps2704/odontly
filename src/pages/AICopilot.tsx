
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { generateAIResponse } from '@/integrations/gemini';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const AICopilot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { items, transactions, appointments, accounts, contacts, settings } = useNexus();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: `Olá! Sou o Odontly AI, seu co-piloto odontológico. Posso analisar faltas, inadimplência, procedimentos mais rentáveis e muito mais. O que deseja saber sobre a ${settings.companyName} hoje?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const contextData = {
      items,
      transactions: transactions.slice(0, 100),
      appointments,
      accounts,
      contacts,
    };
    const responseText = await generateAIResponse(userMsg.text, contextData);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: responseText, timestamp: new Date() }]);
    setIsLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16,
      width: 380, height: 580,
      background: '#ffffff', borderRadius: 14,
      boxShadow: '0 20px 60px rgba(10,15,30,0.15)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, border: '0.5px solid #bae6fd',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: '#0a0f1e',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* AI badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, background: '#0284c7', borderRadius: 7,
          }}>
            <Sparkles size={14} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f9ff', lineHeight: 1.2 }}>Odontly AI</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>Assistente inteligente</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0f9ff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f0f9ff' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-end' }}>
            {msg.sender === 'ai' && (
              <div style={{ width: 22, height: 22, background: '#0284c7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                <Sparkles size={11} style={{ color: '#ffffff' }} />
              </div>
            )}
            <div style={{
              maxWidth: '78%', padding: '9px 12px',
              borderRadius: msg.sender === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              fontSize: 12, lineHeight: 1.6,
              background: msg.sender === 'user' ? '#0284c7' : '#ffffff',
              color: msg.sender === 'user' ? '#ffffff' : '#374151',
              border: msg.sender === 'ai' ? '0.5px solid #e0f2fe' : 'none',
              boxShadow: msg.sender === 'ai' ? '0 1px 3px rgba(10,15,30,0.05)' : 'none',
            }}>
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div style={{ width: 22, height: 22, background: '#e0f2fe', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                <User size={11} style={{ color: '#0284c7' }} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ width: 22, height: 22, background: '#0284c7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={11} style={{ color: '#ffffff' }} />
            </div>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px 10px 10px 2px', border: '0.5px solid #e0f2fe' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, background: '#bae6fd', borderRadius: '50%', animation: `bounce 1.2s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Insight card (pinned above input) */}
      <div style={{
        margin: '0 12px', marginBottom: 0, padding: '8px 12px',
        background: '#f0f9ff', border: '0.5px solid #bae6fd',
        borderRadius: '10px 10px 0 0', borderLeft: '2px solid #0284c7',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 16, height: 16, background: '#0284c7', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={9} style={{ color: '#ffffff' }} />
        </div>
        <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, flex: 1 }}>
          <span style={{ fontWeight: 600, color: '#0284c7' }}>Sugestões:</span>{' '}
          "Qual taxa de faltas esta semana?" · "Quais pacientes inativos?" · "Serviço mais rentável?"
        </p>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px 12px', background: '#ffffff', borderTop: '0.5px solid #e0f2fe' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            style={{
              flex: 1, border: '1.5px solid #e0f2fe', borderRadius: 8,
              padding: '8px 12px', fontSize: 12, outline: 'none',
              color: '#0a0f1e', background: '#ffffff', fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            placeholder="Quais pacientes em risco de abandono? Qual serviço mais rentável?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            onFocus={e => { e.target.style.borderColor = '#0284c7'; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.25)'; }}
            onBlur={e => { e.target.style.borderColor = '#e0f2fe'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            style={{
              background: isLoading ? '#bae6fd' : '#0284c7', color: '#ffffff',
              border: 'none', borderRadius: 8, padding: '8px 12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#0369a1'; }}
            onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#0284c7'; }}
          >
            <Send size={15} />
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#64748b', marginTop: 6, textAlign: 'center', letterSpacing: '0.04em' }}>
          IA pode cometer erros — verifique os dados.
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default AICopilot;
