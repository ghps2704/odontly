
// import { initializeApp } from 'firebase/app';
// import { getAuth, Auth } from 'firebase/auth';
// import { getFirestore, Firestore } from 'firebase/firestore';

// --- PASSO A PASSO DE CONFIGURAÇÃO ---
// 1. Copie o objeto 'firebaseConfig' do console do Firebase (Project Settings > General > Your Apps)
// 2. Cole os valores abaixo substituindo os textos entre aspas.

const firebaseConfig = {
  // Exemplo: "AIzaSyD..."
  apiKey: "COLE_SUA_API_KEY_AQUI",
  
  // Exemplo: "sozio-erp.firebaseapp.com"
  authDomain: "COLE_SEU_AUTH_DOMAIN_AQUI",
  
  // Exemplo: "sozio-erp"
  projectId: "COLE_SEU_PROJECT_ID_AQUI",
  
  // Exemplo: "sozio-erp.appspot.com"
  storageBucket: "COLE_SEU_STORAGE_BUCKET_AQUI",
  
  // Exemplo: "123456789"
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  
  // Exemplo: "1:123456:web:abcdef"
  appId: "COLE_SEU_APP_ID_AQUI"
};

// Detecção simples para ver se o usuário configurou as chaves
const isConfigured = false; 
// firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI" && !firebaseConfig.apiKey.includes("SUA_API_KEY");

let app;
let auth: any = undefined;
let db: any = undefined;

/*
if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("🔥 Firebase conectado com sucesso!");
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
    }
} else {
    console.warn("⚠️ Firebase não configurado. O app está rodando em modo Local (Demo).");
}
*/
console.warn("⚠️ Firebase não configurado (Imports desativados). O app está rodando em modo Local (Demo).");

export { auth, db, isConfigured };
