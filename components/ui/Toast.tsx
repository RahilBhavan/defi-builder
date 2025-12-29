import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast } from '../../hooks/useToast';

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-success-green/10 border-success-green text-success-green',
  error: 'bg-alert-red/10 border-alert-red text-alert-red',
  warning: 'bg-orange/10 border-orange text-orange',
  info: 'bg-blue-50 border-blue-500 text-blue-700',
};

export const ToastComponent: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const Icon = toastIcons[toast.type];
  const styleClass = toastStyles[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 p-4 border-2 rounded-lg shadow-lg bg-white ${styleClass} min-w-[320px] max-w-[480px]`}
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-sans">
        <p className="leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

