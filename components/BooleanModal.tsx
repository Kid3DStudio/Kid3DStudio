import React from 'react';
import { Loader2, AlertTriangle, Check, X } from 'lucide-react';

export type BooleanStatus = 'idle' | 'processing' | 'preview' | 'error';

interface BooleanModalProps {
  isOpen: boolean;
  status: BooleanStatus;
  operationType: string;
  errorMessage: string;
  onApply: () => void;
  onCancel: () => void;
}

const BooleanModal: React.FC<BooleanModalProps> = ({
  isOpen,
  status,
  operationType,
  errorMessage,
  onApply,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-[90%] flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
        
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Processing...</h3>
            <p className="text-sm text-slate-500">Calculating boolean {operationType} geometry.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Operation Failed</h3>
            <p className="text-sm text-slate-500 mb-6">{errorMessage}</p>
            <button 
              onClick={onCancel}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </>
        )}

        {status === 'preview' && (
          <>
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Check size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Preview Result</h3>
            <p className="text-sm text-slate-500 mb-6">
              The operation was successful. Review the result in the scene before applying changes.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={onCancel}
                className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={onApply}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BooleanModal;