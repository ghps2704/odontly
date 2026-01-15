import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables
const getEnvVar = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] || '';
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Fallback to prevent crash if keys are missing (Login will fail gracefully instead of White Screen)
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseKey || 'placeholder-key';

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Aviso: Chaves do Supabase não encontradas. O login não funcionará.");
}

export const supabase = createClient(validUrl, validKey);