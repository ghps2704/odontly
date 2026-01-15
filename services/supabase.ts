
import { createClient } from '@supabase/supabase-js';

// Em projetos Vite, é crucial acessar as variáveis de ambiente explicitamente (ex: import.meta.env.VITE_KEY)
// e não dinamicamente (ex: import.meta.env[key]), pois o bundler faz substituição estática de strings.

const getSupabaseUrl = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_URL;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) {
      return process.env.VITE_SUPABASE_URL;
    }
  } catch (e) {}

  return '';
};

const getSupabaseKey = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
      return process.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch (e) {}

  return '';
};

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

// Diagnóstico Seguro
console.log('Supabase Init:', {
  urlDefined: !!supabaseUrl,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 12) + '...' : 'N/A',
  keyDefined: !!supabaseKey
});

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO CRÍTICO: Variáveis do Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) não encontradas.");
}

// Fallback para evitar crash total da UI, embora requisições falhem
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseKey || 'placeholder-key';

export const supabase = createClient(validUrl, validKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
