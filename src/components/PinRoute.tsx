import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useNexus } from '@/contexts';

const PIN_SESSION_KEY = 'odontly_pin_verified';

const PinRoute: React.FC = () => {
  const { verifyPin } = useNexus();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(
    () => sessionStorage.getItem(PIN_SESSION_KEY) === 'true'
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  if (isVerified) return <Outlet />;

  const handleSubmit = () => {
    if (verifyPin(pinInput)) {
      sessionStorage.setItem(PIN_SESSION_KEY, 'true');
      setIsVerified(true);
    } else {
      setPinError(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 360,
        padding: 28, textAlign: 'center',
        border: '0.5px solid #e0f2fe', boxShadow: '0 20px 60px rgba(10,15,30,0.15)',
      }}>
        <div style={{
          width: 44, height: 44, background: '#e0f2fe', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: '#0284c7',
        }}>
          <Lock size={20} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0a0f1e', marginBottom: 6 }}>Área Restrita</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
          Digite o PIN do administrador para continuar.
        </p>

        <input
          type="password"
          style={{
            width: '100%', textAlign: 'center', fontSize: 22, letterSpacing: '0.3em',
            border: pinError ? '1.5px solid #dc2626' : '1.5px solid #e0f2fe',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            fontFamily: 'monospace', outline: 'none', color: '#0a0f1e',
            background: '#f0f9ff', boxSizing: 'border-box',
            boxShadow: pinError ? '0 0 0 3px rgba(220,38,38,0.15)' : undefined,
          }}
          maxLength={4}
          value={pinInput}
          autoFocus
          placeholder="0000"
          onChange={e => { setPinInput(e.target.value); setPinError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        {pinError && (
          <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 500, marginBottom: 12 }}>PIN incorreto.</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
              color: '#64748b', background: 'transparent',
              border: '1.5px solid #e0f2fe', borderRadius: 8, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
              color: '#ffffff', background: '#0284c7',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0369a1')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0284c7')}
          >
            Acessar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinRoute;
