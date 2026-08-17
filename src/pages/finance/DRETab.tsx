import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReportHeader from './ReportHeader';
import { formatCurrency, handleMonthChange } from './financeUtils';
import { DRECategoryType } from '@/types';

interface DRETabProps {
    dreMonth: Date;
    setDreMonth: React.Dispatch<React.SetStateAction<Date>>;
    dreReport: Record<DRECategoryType, { total: number; details: Record<string, number> }> & {
        netRevenue: number; grossMargin: number; contributionMargin: number;
        ebitda: number; operationalResult: number; netResult: number;
    };
}

const DRETab: React.FC<DRETabProps> = ({ dreMonth, setDreMonth, dreReport }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] max-w-4xl mx-auto overflow-hidden">
            <ReportHeader title="Demonstrativo de Resultados (DRE)" periodDate={dreMonth} />
            <div className="p-8">
                <div className="flex flex-col items-center mb-8 gap-2">
                    <div className="flex items-center gap-2 bg-[#f0f9ff] rounded-lg p-1">
                        <button onClick={() => handleMonthChange(dreMonth, setDreMonth, 'prev')} className="p-2 hover:bg-white rounded shadow-sm text-[#64748b]"><ChevronLeft size={18} /></button>
                        <span className="font-bold text-[#0a0f1e] w-40 text-center capitalize">{dreMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => handleMonthChange(dreMonth, setDreMonth, 'next')} className="p-2 hover:bg-white rounded shadow-sm text-[#64748b]"><ChevronRight size={18} /></button>
                    </div>
                </div>
                <div className="space-y-1">
                    {/* 1. GROSS REVENUE */}
                    <div className="flex justify-between py-2 bg-blue-600 text-white px-4 rounded font-bold">
                        <span>(+) Receita de Vendas</span>
                        <span>{formatCurrency(dreReport.GROSS_REVENUE.total)}</span>
                    </div>
                    {Object.entries(dreReport.GROSS_REVENUE.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 2. DEDUCTIONS */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 border-t border-[#e0f2fe] mt-2 bg-red-50 rounded">
                        <span>(-) Deduções e Impostos</span>
                        <span>{formatCurrency(dreReport.DEDUCTIONS.total)}</span>
                    </div>
                    {Object.entries(dreReport.DEDUCTIONS.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 3. NET REVENUE */}
                    <div className="flex justify-between py-3 bg-[#f0f9ff] px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                        <span>(=) Receita Líquida</span>
                        <span>{formatCurrency(dreReport.netRevenue)}</span>
                    </div>

                    {/* 4. VARIABLE COSTS */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                        <span>(-) Custo Variável (CPV ou CMV)</span>
                        <span>{formatCurrency(dreReport.VARIABLE_COST.total)}</span>
                    </div>
                    {Object.entries(dreReport.VARIABLE_COST.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 5. GROSS MARGIN */}
                    <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                        <span>(=) Margem Bruta</span>
                        <span>{formatCurrency(dreReport.grossMargin)}</span>
                    </div>

                    {/* 6. VARIABLE EXPENSES */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                        <span>(-) Despesas Variáveis</span>
                        <span>{formatCurrency(dreReport.VARIABLE_EXPENSE.total)}</span>
                    </div>
                    {Object.entries(dreReport.VARIABLE_EXPENSE.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 7. CONTRIBUTION MARGIN */}
                    <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border-2 border-[#e0f2fe]">
                        <span>(=) Margem de Contribuição</span>
                        <span>{formatCurrency(dreReport.contributionMargin)}</span>
                    </div>

                    {/* 8. PERSONNEL */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                        <span>(-) Gastos com Pessoal</span>
                        <span>{formatCurrency(dreReport.PERSONNEL.total)}</span>
                    </div>
                    {Object.entries(dreReport.PERSONNEL.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 9. OPERATIONAL EXPENSES */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-1 bg-red-50 rounded">
                        <span>(-) Despesas Operacionais</span>
                        <span>{formatCurrency(dreReport.OPERATIONAL_EXPENSE.total)}</span>
                    </div>
                    {Object.entries(dreReport.OPERATIONAL_EXPENSE.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 10. EBITDA */}
                    <div className="flex justify-between py-3 bg-[#f0f9ff] px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                        <span>(=) EBITDA</span>
                        <span>{formatCurrency(dreReport.ebitda)}</span>
                    </div>

                    {/* 11. DEPRECIATION */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                        <span>(-) Depreciação, Amortização e Exaustão</span>
                        <span>{formatCurrency(dreReport.DEPRECIATION.total)}</span>
                    </div>
                    {Object.entries(dreReport.DEPRECIATION.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 12. OTHER RESULTS */}
                    <div className="flex justify-between py-2 text-[#64748b] text-sm pl-4 mt-1 bg-[#f0f9ff] rounded border border-[#e0f2fe]">
                        <span>(+/-) Outras Receitas e Despesas</span>
                        <span className={dreReport.OTHER_RESULT.total >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(dreReport.OTHER_RESULT.total)}</span>
                    </div>
                    {Object.entries(dreReport.OTHER_RESULT.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 13. OPERATIONAL RESULT */}
                    <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                        <span>(=) Resultado Operacional</span>
                        <span>{formatCurrency(dreReport.operationalResult)}</span>
                    </div>

                    {/* 14. TAXES */}
                    <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                        <span>(-) Tributos (IRPJ e CSLL)</span>
                        <span>{formatCurrency(dreReport.INCOME_TAX.total)}</span>
                    </div>
                    {Object.entries(dreReport.INCOME_TAX.details).map(([catName, val]) => (
                        <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                    ))}

                    {/* 15. NET RESULT */}
                    <div className="flex justify-between py-4 bg-[#0284c7] px-4 rounded-lg font-bold text-white mt-4 shadow-lg text-lg">
                        <span>(=) Resultado Líquido</span>
                        <span className={dreReport.netResult >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(dreReport.netResult)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DRETab;
