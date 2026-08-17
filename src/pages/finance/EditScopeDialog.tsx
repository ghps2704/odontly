import React from 'react';
import { EditScope } from '@/lib/installments';

interface EditScopeDialogProps {
  isOpen: boolean;
  actionLabel: string; // e.g. "excluir" or "salvar as alterações"
  installmentLabel?: string; // e.g. "3/12"
  onCancel: () => void;
  onConfirm: (scope: EditScope) => void;
}

const OPTIONS: { scope: EditScope; label: string; hint: string }[] = [
  { scope: 'ONLY_THIS', label: 'Somente esta parcela', hint: 'As demais parcelas continuam como estão.' },
  { scope: 'THIS_AND_FUTURE', label: 'Esta e as próximas parcelas', hint: 'Parcelas já pagas não são alteradas.' },
  { scope: 'ALL', label: 'Todas as parcelas', hint: 'Parcelas já pagas não são alteradas.' },
];

const EditScopeDialog: React.FC<EditScopeDialogProps> = ({ isOpen, actionLabel, installmentLabel, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-[#0a0f1e] text-lg mb-1">
          Lançamento parcelado{installmentLabel ? ` (${installmentLabel})` : ''}
        </h3>
        <p className="text-sm text-[#64748b] mb-5">
          Este lançamento faz parte de um parcelamento/recorrência. Como deseja {actionLabel}?
        </p>
        <div className="space-y-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.scope}
              onClick={() => onConfirm(opt.scope)}
              className="w-full text-left px-4 py-3 rounded-lg border border-[#e0f2fe] hover:bg-[#f0f9ff] transition-colors"
            >
              <span className="block font-medium text-[#0a0f1e]">{opt.label}</span>
              <span className="block text-xs text-[#64748b] mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full mt-4 text-center text-sm text-[#64748b] hover:text-[#0a0f1e] font-medium py-2">
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default EditScopeDialog;
