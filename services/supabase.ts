
import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables
const getEnvVar = (key: string) => {
  // Try import.meta.env (Vite)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}

  // Try process.env (Node/Webpack)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate URL structure
const isValidUrl = (url: string) => {
    try {
        return url.startsWith('http');
    } catch {
        return false;
    }
}

// Fallback to prevent crash if keys are missing
const validUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseKey || 'placeholder-key';

if (!isValidUrl(supabaseUrl) || !supabaseKey) {
  console.warn("⚠️ Aviso: Chaves do Supabase não encontradas ou inválidas. O login real falhará.");
}

export const supabase = createClient(validUrl, validKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
