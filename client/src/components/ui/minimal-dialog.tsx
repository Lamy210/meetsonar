import { useEffect, useRef } from 'react';
import type { ComponentChildren } from 'preact';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
  className?: string;
}

export function Dialog({ open, onClose, children, className = "" }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);
  
  return (
    <dialog 
      ref={dialogRef}
      className={`backdrop:bg-black/50 rounded-lg p-6 max-w-md border shadow-lg ${className}`}
      onClick={(e) => {
        // クリックした要素がdialog自体（背景）の場合は閉じる
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}

interface DialogContentProps {
  children: ComponentChildren;
  className?: string;
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: ComponentChildren;
  className?: string;
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: ComponentChildren;
  className?: string;
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: ComponentChildren;
  className?: string;
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: ComponentChildren;
  className?: string;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`flex justify-end space-x-2 pt-4 ${className}`}>
      {children}
    </div>
  );
}
