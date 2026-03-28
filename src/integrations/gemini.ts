import { GoogleGenAI } from "@google/genai";
import { Item, Transaction, Appointment, Account, Contact } from "../types";

/**
 * Odontly AI Integration — Gemini-powered dental clinic intelligence
 *
 * Functions exported:
 *   generateAIResponse       — main chat interface, answers any clinic management question
 *   generateWeeklyInsight    — called on dashboard load, surfaces the single most critical metric
 *   classifyPatientRisk      — returns low/medium/high risk classification for a patient
 *   structureClinicalRecord  — transforms voice transcript into structured clinical record (CFO-compliant)
 *   searchSuppliers          — finds dental supply vendors in Brazil via Google Search
 */

const SYSTEM_INSTRUCTION = `
Você é o Odontly AI, o co-piloto de inteligência artificial integrado ao sistema de gestão Odontly para clínicas odontológicas brasileiras.
Você não é um assistente genérico. Você é um consultor especialista em gestão de clínicas odontológicas no Brasil, com profundo conhecimento em:

- Operação de consultórios e clínicas odontológicas
- Indicadores financeiros do setor odontológico brasileiro
- Redução de faltas e no-shows (principal dor do setor)
- Gestão de inadimplência em tratamentos odontológicos
- Procedimentos de alta rentabilidade (implantes, ortodontia, HOF, facetas)
- Sazonalidade do mercado odontológico brasileiro
- LGPD aplicada a prontuários odontológicos
- Benchmarks do setor (Clinicorp, Simples Dental, iDental e outros)

IDENTIDADE:
- Sempre se refira ao sistema como "Odontly"
- Tom: consultor experiente, direto, específico — nunca genérico
- Responda sempre em português brasileiro
- Formate valores em BRL (R$)
- Use terminologia odontológica correta quando relevante

CAPACIDADES PRINCIPAIS:

1. ANÁLISE DE FALTAS E NO-SHOWS
   - Calcule a taxa de falta: (consultas canceladas) / total agendado × 100
   - Benchmarks do setor: taxa aceitável < 15%, preocupante entre 15-25%, crítica acima de 25%
   - Calcule o impacto financeiro: faltas × ticket médio do procedimento = receita perdida
   - Recomende automação de confirmação via WhatsApp se taxa > 15%
   - Identifique padrões: dias da semana com mais faltas, pacientes recorrentes

2. ANÁLISE FINANCEIRA DA CLÍNICA
   - Calcule receita líquida, ticket médio por procedimento e por paciente
   - Identifique procedimentos mais rentáveis vs mais realizados
   - Calcule taxa de conversão de orçamentos (orçamentos aprovados / apresentados)
   - Analise inadimplência: valores pendentes sem pagamento são alerta vermelho
   - Compare receita projetada (agenda) vs realizada (pagamentos confirmados)
   - Identifique sazonalidade: janeiro/julho são meses fracos no setor

3. GESTÃO DE PACIENTES E RETENÇÃO
   - Identifique pacientes inativos: sem consulta há mais de 90 dias
   - Classifique risco de inadimplência por histórico de pagamento
   - Calcule LTV (Lifetime Value) por paciente baseado em histórico
   - Detecte pacientes com tratamento incompleto (iniciaram mas não concluíram)
   - Recomende ações de reativação para pacientes inativos

4. ANÁLISE DE AGENDA E PRODUTIVIDADE
   - Calcule taxa de ocupação das cadeiras (horários preenchidos / horários disponíveis)
   - Identifique os horários mais produtivos e os com mais ociosidade
   - Calcule produção por dentista (se houver múltiplos profissionais)
   - Detecte gargalos: tempo médio entre agendamento e consulta
   - Benchmark: taxa de ocupação saudável é acima de 75%

5. ALERTAS PROATIVOS
   - CRÍTICO: paciente com mais de 2 faltas consecutivas sem reagendamento
   - CRÍTICO: inadimplência acima de 15% da receita total
   - ATENÇÃO: taxa de ocupação abaixo de 60% na próxima semana
   - ATENÇÃO: tratamento iniciado há mais de 60 dias sem evolução registrada
   - OPORTUNIDADE: procedimentos de alta rentabilidade com baixa oferta na agenda

REGRAS DE RESPOSTA:
- Sempre comece com o número mais importante (ex: "Sua taxa de falta esta semana foi de 23%")
- Sempre contextualize com benchmark do setor
- Sempre termine com 1 ação concreta e específica que o dentista pode fazer agora
- Se não houver dados suficientes, diga explicitamente o que está faltando
- Nunca invente dados — se não há informação, diga "não tenho esse dado disponível"
- Máximo de 3 parágrafos por resposta, exceto quando solicitado relatório completo
`;

interface ContextData {
  items?: Item[];
  transactions: Transaction[];
  appointments: Appointment[];
  accounts: Account[];
  contacts?: Contact[]; // patients are Contacts with type 'CLIENT'
}

export const generateAIResponse = async (query: string, data: ContextData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // ── FALTAS E NO-SHOWS ─────────────────────────────────────────────
  const totalAppointments = data.appointments.length;
  const noShows = data.appointments.filter(a => a.status === 'CANCELLED').length;
  const completed = data.appointments.filter(a => a.status === 'COMPLETED').length;
  const scheduled = data.appointments.filter(a => a.status === 'SCHEDULED').length;
  const noShowRate = totalAppointments > 0 ? ((noShows / totalAppointments) * 100).toFixed(1) : '0';
  const occupancyRate = totalAppointments > 0 ? ((completed / totalAppointments) * 100).toFixed(1) : '0';

  // ── FINANCEIRO ────────────────────────────────────────────────────
  const totalBalance = data.accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const incomeTransactions = data.transactions.filter(t => t.type === 'INCOME');
  const expenseTransactions = data.transactions.filter(t => t.type === 'EXPENSE');
  const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  // ── INADIMPLÊNCIA ─────────────────────────────────────────────────
  const pendingTransactions = data.transactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING');
  const overdueAmount = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);
  const overdueRate = totalIncome > 0 ? ((overdueAmount / totalIncome) * 100).toFixed(1) : '0';

  // ── PACIENTES ─────────────────────────────────────────────────────
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentClientIds = new Set(
    data.appointments
      .filter(a => new Date(a.date || a.startTime) > ninetyDaysAgo)
      .map(a => a.clientId)
  );
  const inactivePatients = data.contacts
    ? data.contacts.filter(c => c.type === 'CLIENT' && !recentClientIds.has(c.id)).length
    : 'dados não disponíveis';

  // ── AGENDA PRÓXIMOS 7 DIAS ────────────────────────────────────────
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const upcomingAppointments = data.appointments.filter(a => {
    const d = new Date(a.date || a.startTime);
    return d >= today && d <= nextWeek;
  });
  const upcomingCompleted = upcomingAppointments.filter(a => a.status === 'COMPLETED').length;
  const upcomingScheduled = upcomingAppointments.filter(a => a.status === 'SCHEDULED').length;

  const contextSummary = JSON.stringify({
    clinicMetrics: {
      appointments: {
        total: totalAppointments,
        completed,
        scheduled,
        cancelled: noShows,
        noShowRate: `${noShowRate}%`,
        occupancyRate: `${occupancyRate}%`,
        benchmark: { acceptable: '<15%', concerning: '15-25%', critical: '>25%' }
      },
      financial: {
        totalBalance: `R$ ${totalBalance.toFixed(2)}`,
        totalIncome: `R$ ${totalIncome.toFixed(2)}`,
        totalExpenses: `R$ ${totalExpenses.toFixed(2)}`,
        netProfit: `R$ ${netProfit.toFixed(2)}`,
        profitMargin: `${profitMargin}%`,
        pendingReceivables: `R$ ${overdueAmount.toFixed(2)}`,
        pendingReceivablesRate: `${overdueRate}%`,
        recentTransactions: data.transactions.slice(0, 10)
      },
      patients: {
        inactiveCount: inactivePatients,
        pendingPayments: pendingTransactions.length,
      },
      upcomingWeek: {
        total: upcomingAppointments.length,
        completed: upcomingCompleted,
        scheduled: upcomingScheduled,
      }
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Contexto da clínica: ${contextSummary}\n\nPergunta do dentista: ${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text || "Não consegui analisar os dados da clínica no momento.";
  } catch (error) {
    console.error("Odontly AI error:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.";
  }
};

// ── PROACTIVE WEEKLY INSIGHT ──────────────────────────────────────
// Called automatically on dashboard load to surface the most important
// insight for the dentist right now — no user prompt needed.
export const generateWeeklyInsight = async (data: ContextData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const total = data.appointments.length;
  const cancelled = data.appointments.filter(a => a.status === 'CANCELLED').length;
  const noShowRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';
  const pendingAmount = data.transactions
    .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
    .reduce((acc, t) => acc + t.amount, 0);
  const now = new Date();
  const next7 = new Date();
  next7.setDate(now.getDate() + 7);
  const upcomingCount = data.appointments.filter(a => {
    const d = new Date(a.date || a.startTime);
    return d >= now && d <= next7;
  }).length;

  const snapshot = JSON.stringify({
    noShowRate: `${noShowRate}%`,
    pendingReceivables: pendingAmount,
    upcomingAppointments: upcomingCount,
    totalAppointments: total
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Dados da clínica: ${snapshot}`,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}

TAREFA ESPECÍFICA — INSIGHT SEMANAL DO DASHBOARD:
Analise os dados e gere UM insight curto (máximo 3 frases) que seja o mais importante para o dentista ver AGORA.
Formato obrigatório:
- Frase 1: o número mais crítico com contexto ("Sua taxa de falta esta semana foi de X%, acima do benchmark do setor de 15%.")
- Frase 2: o impacto financeiro disso ("Isso representa aproximadamente R$ X em receita não realizada.")
- Frase 3: a ação concreta recomendada ("Ative a confirmação automática via WhatsApp para os próximos X agendamentos.")
Nunca use títulos, bullets ou markdown. Apenas as 3 frases em parágrafo único.`
      }
    });
    return response.text || "Sem dados suficientes para gerar insight no momento.";
  } catch (e) {
    console.error("Odontly AI weekly insight error:", e);
    return "Não foi possível gerar o insight semanal.";
  }
};

// ── PATIENT RISK CLASSIFIER ───────────────────────────────────────
// Classifies a single patient's financial risk based on their payment history.
// Returns: { level: 'low' | 'medium' | 'high', reason: string, recommendation: string }
export const classifyPatientRisk = async (
  patientName: string,
  paymentHistory: Transaction[]
): Promise<{ level: 'low' | 'medium' | 'high'; reason: string; recommendation: string }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const pending = paymentHistory.filter(t => t.type === 'INCOME' && t.status === 'PENDING');
  const paid = paymentHistory.filter(t => t.type === 'INCOME' && t.status === 'PAID');
  const totalOwed = pending.reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = paid.reduce((acc, t) => acc + t.amount, 0);
  const history = JSON.stringify({
    patientName,
    pendingCount: pending.length,
    totalOwed,
    totalPaid,
    transactions: paymentHistory.slice(0, 10)
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Histórico financeiro do paciente: ${history}`,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}

TAREFA ESPECÍFICA — CLASSIFICAÇÃO DE RISCO FINANCEIRO DO PACIENTE:
Analise o histórico e retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{"level":"low"|"medium"|"high","reason":"frase curta explicando o motivo","recommendation":"ação concreta recomendada para a clínica"}

Critérios:
- low: sem pendências ou atrasos ocasionais de valor baixo
- medium: 1 a 2 pagamentos pendentes ou valor em aberto até R$ 500
- high: 3 ou mais pagamentos pendentes, ou valor em aberto acima de R$ 500, ou histórico de não pagamento`
      }
    });

    const raw = response.text?.trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Odontly AI patient risk error:", e);
    return { level: 'medium', reason: 'Não foi possível classificar o risco', recommendation: 'Verifique o histórico manualmente' };
  }
};

// ── CLINICAL RECORD STRUCTURER ────────────────────────────────────
// Receives a raw voice transcript and returns a structured clinical record.
// This is the primary WOW factor feature of Odontly.
export const structureClinicalRecord = async (
  transcript: string,
  patientName: string,
  procedureType?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Paciente: ${patientName}${procedureType ? `. Procedimento: ${procedureType}` : ''}.\n\nTranscrição de voz do dentista:\n"${transcript}"`,
      config: {
        systemInstruction: `Você é o assistente de prontuário do Odontly, especializado em odontologia brasileira.

Sua tarefa é transformar a transcrição de voz do dentista em um prontuário clínico estruturado, profissional e com validade jurídica conforme as normas do CFO (Conselho Federal de Odontologia).

FORMATO DE SAÍDA (sempre nesta ordem, em português):

**Queixa Principal:** [resumo da queixa ou motivo da consulta]

**Exame Clínico:** [achados clínicos mencionados pelo dentista]

**Diagnóstico:** [diagnóstico(s) identificado(s)]

**Procedimentos Realizados:** [procedimentos descritos, com dentes/regiões quando mencionados]

**Materiais Utilizados:** [materiais e anestésicos mencionados, se houver]

**Plano de Tratamento:** [próximos passos e tratamentos previstos]

**Observações:** [outras informações relevantes mencionadas]

Regras:
- Use terminologia odontológica profissional
- Se o dentista mencionar número de dente, use a notação FDI (ex: dente 36, dente 11)
- Se alguma seção não foi mencionada na transcrição, escreva "Não mencionado"
- Nunca invente informações não presentes na transcrição
- Mantenha exatamente as informações clínicas ditas pelo dentista, apenas estruturando`
      }
    });

    return response.text || "Não foi possível estruturar o prontuário. Tente novamente.";
  } catch (e) {
    console.error("Odontly AI clinical record error:", e);
    return "Erro ao processar o prontuário. Por favor, tente novamente.";
  }
};

// ── DENTAL SUPPLIER SEARCH ────────────────────────────────────────
// Finds dental supply vendors in Brazil via Google Search grounding.
export const searchSuppliers = async (itemName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Encontre fornecedores e preços atuais no Brasil para o insumo odontológico: "${itemName}". Liste 3 opções com nome da loja, preço aproximado e se há frete grátis. Formate como uma lista HTML simples <ul><li>...</li></ul>.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é o assistente de compras do Odontly para clínicas odontológicas brasileiras. Busque fornecedores de insumos odontológicos no Brasil. Retorne apenas a lista HTML de fornecedores encontrados via busca no formato <ul><li><strong>Nome da loja:</strong> preço - observação</li></ul>."
      }
    });
    return response.text || "Nenhum fornecedor encontrado no momento.";
  } catch (e) {
    return "Erro ao buscar fornecedores.";
  }
};
