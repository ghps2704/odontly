import React from 'react';
import { Hexagon } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';

interface ReportHeaderProps {
    title: string;
    /** Either a competence month (legacy usage) or a ready-made period label (e.g. from resolvePeriodRange). */
    periodDate?: Date;
    periodLabel?: string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, periodDate, periodLabel }) => {
    const { settings } = useNexus();
    const label = periodLabel ?? (periodDate ? periodDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : '');
    return (
        <div className="bg-[#0284c7] text-white p-6 rounded-t-xl flex justify-between items-end mb-0">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Hexagon size={18} className="text-[#0284c7] fill-[#0284c7]" />
                    <span className="text-xs font-bold tracking-widest uppercase text-[#64748b]">Relatório Gerencial</span>
                </div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    {title} <span className="text-[#64748b] text-lg font-light">|</span> <span className="text-[#0284c7]">Odontly ERP</span>
                </h2>
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-[#64748b]">Empresa</p>
                <p className="font-bold text-lg leading-tight mb-2">{settings.companyName}</p>
                <div className="inline-block bg-white/10 px-3 py-1 rounded text-xs font-mono">
                    Competência: {label.toUpperCase()}
                </div>
            </div>
        </div>
    );
};

export default ReportHeader;
