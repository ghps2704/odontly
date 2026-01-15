
import { GoogleGenAI } from "@google/genai";
import { Item, Transaction, Appointment, Account } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o Sozio AI, um Co-piloto de ERP inteligente e sofisticado para Pequenas e Médias Empresas.
Você tem acesso aos dados financeiros, de estoque e agenda da empresa.

CAPACIDADES:
1. **Análise Financeira:** Calcular Lucro (Receita - Despesas), Margens e Previsões.
2. **Gestão de Estoque:** Identificar estoque baixo.
3. **Proteção de Margem:** Você conhece a 'desiredMargin' (margem desejada) dos itens. Se (Preço - Custo)/Preço < DesiredMargin, avise o usuário sobre "Erosão de Margem".
4. **Compras (Procurement):** Quando solicitado a pesquisar preços, use a ferramenta Google Search para encontrar fornecedores reais e preços de insumos.

Regras:
- Seja conciso, profissional e utilize um tom de consultor de negócios experiente.
- Sempre se refira ao sistema como "Sozio ERP".
- Formate valores monetários em BRL (R$).
- Ao procurar fornecedores, liste 3 opções com preços, se disponível.
`;

interface ContextData {
  items: Item[];
  transactions: Transaction[];
  appointments: Appointment[];
  accounts: Account[];
}

// Helper safely access env vars in browser or node
const getApiKey = () => {
    try {
        return process.env.API_KEY;
    } catch (e) {
        return undefined;
    }
}

export const generateAIResponse = async (query: string, data: ContextData): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "Erro: Chave de API (Gemini) não configurada no ambiente.";
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  // Identify Margin Erosion for Context
  const erodingItems = data.items.filter(i => {
      if (!i.desiredMargin || i.price === 0) return false;
      const currentMargin = ((i.price - i.cost) / i.price) * 100;
      return currentMargin < i.desiredMargin;
  }).map(i => i.name);

  const contextSummary = JSON.stringify({
    inventorySummary: data.items.map(i => ({ 
        name: i.name, 
        stock: i.stock, 
        cost: i.cost, 
        price: i.price, 
        marginTarget: i.desiredMargin,
        status: erodingItems.includes(i.name) ? "MARGIN_EROSION" : "OK"
    })),
    financialSummary: {
        totalBalance: data.accounts.reduce((acc, curr) => acc + curr.balance, 0),
        recentTransactions: data.transactions.slice(0, 5),
    },
    erodingItems: erodingItems
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contexto: ${contextSummary}\n\nUsuário: ${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });
    
    // Process grounding chunks if available (to extract URLs nicely if needed, but text is usually sufficient)
    return response.text || "Não consegui analisar os dados no ecossistema Sozio no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação com a IA do Sozio.";
  }
};

// Specialized function for the Procurement Modal
export const searchSuppliers = async (itemName: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Erro: API Key ausente.";

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Encontre fornecedores e preços atuais no Brasil para o insumo: "${itemName}". Liste 3 opções com nome da loja, preço aproximado e se há frete grátis. Formate como uma lista HTML simples <ul><li>...</li></ul>.`,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "Você é um assistente de compras do Sozio ERP. Retorne apenas a lista HTML de fornecedores encontrados via busca."
            }
        });
        return response.text || "Nenhum fornecedor encontrado no momento.";
    } catch (e) {
        return "Erro ao buscar fornecedores.";
    }
}
