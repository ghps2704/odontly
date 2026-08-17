
import { createClient } from '@supabase/supabase-js';

// Função para ler variáveis de ambiente de forma segura no Vite
const getEnvVar = (key: string): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // Fallback para ambientes que usam process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Log de diagnóstico — só em dev, nunca no build de produção
if (import.meta.env.DEV) {
  console.log('Supabase Connection:', {
    configured: !!(supabaseUrl && supabaseKey),
    url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Missing'
  });
}

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO DE CONFIGURAÇÃO: As variáveis 'VITE_SUPABASE_URL' e 'VITE_SUPABASE_ANON_KEY' são obrigatórias.");
}

// Cliente Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);
