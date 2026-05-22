import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { createPortal } from 'react-dom';

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onSecondaryConfirm?: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar mesmo assim',
  secondaryConfirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onSecondaryConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[6px] pointer-events-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}
          onClick={e => e.stopPropagation()}
          style={{ transformOrigin: 'center center' }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6"
        >
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={onConfirm}>
              {confirmLabel}
            </Button>
            {secondaryConfirmLabel && onSecondaryConfirm && (
              <Button variant="secondary" type="button" onClick={onSecondaryConfirm}>
                {secondaryConfirmLabel}
              </Button>
            )}
            <Button variant="outline" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
