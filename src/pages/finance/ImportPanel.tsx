import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction } from '@/types';
import { useSlidePanel } from './useSlidePanel';
import { formatCurrency } from './financeUtils';
import { parseOFX } from '@/lib/ofxParser';
import { ImportRow, MatchResult, matchImportRows } from '@/lib/importMatcher';
import { ColumnMapping, guessColumnMapping, parseSpreadsheetFile, rowsToImportRows } from '@/lib/spreadsheetParser';

interface ImportPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

type WizardStep = 'UPLOAD' | 'MAPPING' | 'REVIEW' | 'DONE';

interface ReviewRow extends MatchResult {
    include: boolean;
    createNew: boolean; // when a match exists but the user chooses to ignore it
}

const ImportPanel: React.FC<ImportPanelProps> = ({ isOpen, onClose }) => {
    const { mounted, visible } = useSlidePanel(isOpen);
    const { accounts, transactions, addTransaction, updateTransaction } = useNexus();

    const [step, setStep] = useState<WizardStep>('UPLOAD');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
    const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
    const [result, setResult] = useState<{ reconciled: number; created: number } | null>(null);

    const resetWizard = () => {
        setStep('UPLOAD');
        setSelectedAccountId('');
        setFileName('');
        setError('');
        setHeaders([]);
        setRawRows([]);
        setMapping({});
        setReviewRows([]);
        setResult(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    if (!mounted) return null;

    const goToReview = (importRows: ImportRow[], accountId: string) => {
        if (importRows.length === 0) {
            setError('Nenhum lançamento válido foi encontrado nesse arquivo.');
            return;
        }
        const candidates = transactions.filter(t => t.accountId === accountId && t.status === 'PENDING');
        const matched = matchImportRows(importRows, candidates);
        setReviewRows(matched.map(m => ({ ...m, include: true, createNew: false })));
        setStep('REVIEW');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedAccountId) return;
        setError('');
        setFileName(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase();

        try {
            if (ext === 'ofx') {
                const text = await file.text();
                const ofxTxs = parseOFX(text);
                const importRows: ImportRow[] = ofxTxs.map(t => ({
                    date: t.date,
                    amount: Math.abs(t.amount),
                    description: t.description,
                    type: t.type === 'CREDIT' ? 'INCOME' : 'EXPENSE',
                    sourceId: t.fitId
                }));
                goToReview(importRows, selectedAccountId);
            } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
                const { headers: h, rows } = await parseSpreadsheetFile(file);
                if (rows.length === 0) {
                    setError('A planilha está vazia ou não pôde ser lida.');
                    return;
                }
                const guessed = guessColumnMapping(h);
                setHeaders(h);
                setRawRows(rows);
                if (guessed.date && guessed.description && guessed.amount) {
                    goToReview(rowsToImportRows(rows, guessed as ColumnMapping), selectedAccountId);
                } else {
                    setMapping(guessed);
                    setStep('MAPPING');
                }
            } else {
                setError('Formato não suportado. Envie um arquivo .ofx, .csv ou .xlsx.');
            }
        } catch {
            setError('Não foi possível ler esse arquivo. Verifique se ele não está corrompido.');
        } finally {
            e.target.value = '';
        }
    };

    const confirmMapping = () => {
        if (!mapping.date || !mapping.description || !mapping.amount) {
            setError('Selecione as três colunas antes de continuar.');
            return;
        }
        setError('');
        goToReview(rowsToImportRows(rawRows, mapping as ColumnMapping), selectedAccountId);
    };

    const toggleInclude = (idx: number) => {
        setReviewRows(prev => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r));
    };

    const toggleCreateNew = (idx: number) => {
        setReviewRows(prev => prev.map((r, i) => i === idx ? { ...r, createNew: !r.createNew } : r));
    };

    const handleConfirmImport = () => {
        let reconciled = 0, created = 0;
        reviewRows.forEach(rr => {
            if (!rr.include) return;
            if (rr.match && !rr.createNew) {
                updateTransaction({ ...rr.match, isReconciled: true, status: 'PAID', paidAt: rr.row.date }, 'ONLY_THIS');
                reconciled++;
            } else {
                const tx: Transaction = {
                    id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    date: rr.row.date,
                    paidAt: rr.row.date,
                    description: rr.row.description,
                    amount: rr.row.amount,
                    type: rr.row.type,
                    // No item/category picked during import — shows up in the DRE
                    // only via the legacy header-category fallback, not the
                    // item-based breakdown. Acceptable for a first cut; revisit
                    // if imported transactions need full DRE classification.
                    category: 'Importado (Extrato)',
                    categoryId: 'import',
                    items: [],
                    accountId: selectedAccountId,
                    paymentMethod: 'OTHER',
                    contactId: 'system',
                    status: 'PAID',
                    isReconciled: true,
                };
                addTransaction(tx);
                created++;
            }
        });
        setResult({ reconciled, created });
        setStep('DONE');
    };

    const includedCount = reviewRows.filter(r => r.include).length;
    const accountName = accounts.find(a => a.id === selectedAccountId)?.name ?? '';

    return (
        <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="px-6 py-4 border-b border-[#e0f2fe] flex justify-between items-center shrink-0 bg-[#f0f9ff]">
                <div>
                    <h3 className="text-xl font-bold text-[#0a0f1e]">Importar Extrato</h3>
                    <p className="text-xs text-[#64748b]">Planilha (.csv, .xlsx) ou arquivo OFX do banco</p>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-white/60 rounded-lg">
                    <X size={22} className="text-[#64748b]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-6 space-y-4">

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                        </div>
                    )}

                    {step === 'UPLOAD' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Conta *</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={e => setSelectedAccountId(e.target.value)}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e]"
                                >
                                    <option value="">Selecione a conta do extrato...</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Arquivo *</label>
                                <label
                                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-10 text-center transition-colors ${selectedAccountId ? 'border-[#bae6fd] hover:border-[#0284c7] cursor-pointer bg-[#f8fafc]' : 'border-[#e0f2fe] bg-[#f8fafc] opacity-50 cursor-not-allowed'}`}
                                >
                                    <Upload size={28} className="text-[#0284c7]" />
                                    <span className="text-sm font-medium text-[#0a0f1e]">
                                        {fileName || 'Clique para escolher um arquivo .ofx, .csv ou .xlsx'}
                                    </span>
                                    <span className="text-xs text-[#64748b]">Selecione a conta primeiro</span>
                                    <input
                                        type="file"
                                        accept=".ofx,.csv,.xlsx,.xls"
                                        disabled={!selectedAccountId}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'MAPPING' && (
                        <div className="space-y-4">
                            <button onClick={() => setStep('UPLOAD')} className="flex items-center gap-1 text-sm text-[#0284c7] hover:underline">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                            <p className="text-sm text-[#64748b]">
                                Não conseguimos identificar as colunas automaticamente. Selecione qual coluna representa cada campo.
                            </p>
                            {(['date', 'description', 'amount'] as const).map(field => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-[#64748b] mb-1">
                                        {field === 'date' ? 'Coluna de Data' : field === 'description' ? 'Coluna de Descrição' : 'Coluna de Valor'} *
                                    </label>
                                    <select
                                        value={mapping[field] ?? ''}
                                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white text-[#0a0f1e]"
                                    >
                                        <option value="">Selecione...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={confirmMapping} className="w-full px-4 py-2.5 bg-[#0284c7] text-white rounded-lg font-bold hover:bg-[#0369a1]">
                                Continuar
                            </button>
                        </div>
                    )}

                    {step === 'REVIEW' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-sm text-[#64748b]">
                                    <strong className="text-[#0a0f1e]">{accountName}</strong> — {reviewRows.length} lançamento{reviewRows.length !== 1 ? 's' : ''} encontrado{reviewRows.length !== 1 ? 's' : ''}, {includedCount} selecionado{includedCount !== 1 ? 's' : ''}
                                </p>
                                <button onClick={resetWizard} className="text-xs text-[#0284c7] hover:underline">Importar outro arquivo</button>
                            </div>

                            <div className="border border-[#e0f2fe] rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide">
                                            <tr>
                                                <th className="px-3 py-2 text-left w-8"></th>
                                                <th className="px-3 py-2 text-left">Data</th>
                                                <th className="px-3 py-2 text-left">Descrição</th>
                                                <th className="px-3 py-2 text-right">Valor</th>
                                                <th className="px-3 py-2 text-left">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f9ff]">
                                            {reviewRows.map((rr, idx) => (
                                                <tr key={idx} className={!rr.include ? 'opacity-40' : ''}>
                                                    <td className="px-3 py-2">
                                                        <input type="checkbox" checked={rr.include} onChange={() => toggleInclude(idx)} />
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-[#64748b]">
                                                        {new Date(rr.row.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-3 py-2 text-[#0a0f1e]">{rr.row.description}</td>
                                                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${rr.row.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {rr.row.type === 'INCOME' ? '+' : '-'}{formatCurrency(rr.row.amount)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {rr.match && !rr.createNew ? (
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                                <span className="text-emerald-700">Concilia com "{rr.match.description}"</span>
                                                                <button onClick={() => toggleCreateNew(idx)} className="text-[#64748b] hover:underline ml-1">criar novo em vez disso</button>
                                                            </div>
                                                        ) : rr.match && rr.createNew ? (
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <span className="text-[#64748b]">Criar nova transação</span>
                                                                <button onClick={() => toggleCreateNew(idx)} className="text-[#0284c7] hover:underline ml-1">usar sugestão</button>
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
                                                                <FileText size={14} className="shrink-0" /> Criar nova transação (conciliada)
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'DONE' && result && (
                        <div className="flex flex-col items-center text-center gap-3 py-10">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                            <h4 className="text-lg font-bold text-[#0a0f1e]">Importação concluída</h4>
                            <p className="text-sm text-[#64748b]">
                                {result.reconciled} lançamento{result.reconciled !== 1 ? 's' : ''} conciliado{result.reconciled !== 1 ? 's' : ''} e {result.created} nova{result.created !== 1 ? 's' : ''} transação{result.created !== 1 ? 'ões' : ''} criada{result.created !== 1 ? 's' : ''}.
                            </p>
                            <button onClick={resetWizard} className="mt-2 px-4 py-2 text-sm font-bold text-[#0284c7] border border-[#0284c7] rounded-lg hover:bg-[#f0f9ff]">
                                Importar outro arquivo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {step === 'REVIEW' && (
                <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3 shrink-0">
                    <button onClick={handleClose} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={includedCount === 0}
                        className="px-4 py-2 bg-[#0284c7] text-white rounded-lg font-bold hover:bg-[#0369a1] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Confirmar Importação ({includedCount})
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImportPanel;
