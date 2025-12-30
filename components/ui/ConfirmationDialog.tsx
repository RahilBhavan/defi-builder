import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import type React from 'react';
import { Button } from './Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border-2 border-ink p-6 max-w-md w-full"
      >
        <div className="flex items-start gap-4 mb-4">
          {variant === 'danger' && (
            <AlertTriangle className="text-alert-red shrink-0 mt-1" size={24} />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold font-mono uppercase mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

