import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PeriodFilterValue, resolvePeriodRange } from './financeUtils';

interface PeriodFilterProps {
    value: PeriodFilterValue;
    onChange: (value: PeriodFilterValue) => void;
}

/**
 * Two modes, always resolving to a concrete [start, end] range (see
 * resolvePeriodRange): "Mês" keeps today's prev/next-month behavior, and
 * "Período" lets the user pick an arbitrary start/end date range.
 */
const PeriodFilter: React.FC<PeriodFilterProps> = ({ value, onChange }) => {
    const resolved = resolvePeriodRange(value);

    const handleMonthNav = (direction: 'prev' | 'next') => {
        const anchor = value.mode === 'MONTH' ? value.anchor : new Date(value.start + 'T12:00:00');
        const next = new Date(anchor);
        next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1));
        onChange({ mode: 'MONTH', anchor: next });
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-[#e0f2fe] overflow-hidden text-xs shrink-0">
                <button
                    onClick={() => onChange({ mode: 'MONTH', anchor: value.mode === 'MONTH' ? value.anchor : new Date(value.start + 'T12:00:00') })}
                    className={`px-3 py-1.5 font-bold transition-colors ${value.mode === 'MONTH' ? 'bg-[#0284c7] text-white' : 'bg-white text-[#64748b] hover:bg-[#f0f9ff]'}`}
                >
                    Mês
                </button>
                <button
                    onClick={() => onChange({ mode: 'RANGE', start: resolved.start, end: resolved.end })}
                    className={`px-3 py-1.5 font-bold transition-colors ${value.mode === 'RANGE' ? 'bg-[#0284c7] text-white' : 'bg-white text-[#64748b] hover:bg-[#f0f9ff]'}`}
                >
                    Período
                </button>
            </div>

            {value.mode === 'MONTH' ? (
                <div className="flex items-center gap-1 bg-[#f0f9ff] rounded-lg p-1">
                    <button onClick={() => handleMonthNav('prev')} className="p-1.5 hover:bg-[#e0f2fe] rounded"><ChevronLeft size={18} /></button>
                    <span className="font-bold text-[#0a0f1e] w-36 text-center capitalize text-sm">{resolved.label}</span>
                    <button onClick={() => handleMonthNav('next')} className="p-1.5 hover:bg-[#e0f2fe] rounded"><ChevronRight size={18} /></button>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-[#f0f9ff] rounded-lg p-1 px-2">
                    <input
                        type="date"
                        value={value.start}
                        onChange={e => onChange({ mode: 'RANGE', start: e.target.value, end: value.end })}
                        className="border border-[#e0f2fe] rounded px-2 py-1 text-sm bg-white text-[#0a0f1e]"
                    />
                    <span className="text-[#64748b] text-sm">até</span>
                    <input
                        type="date"
                        value={value.end}
                        onChange={e => onChange({ mode: 'RANGE', start: value.start, end: e.target.value })}
                        className="border border-[#e0f2fe] rounded px-2 py-1 text-sm bg-white text-[#0a0f1e]"
                    />
                </div>
            )}
        </div>
    );
};

export default PeriodFilter;
