'use client';

import * as React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Подтверждение действия",
  children,
  confirmText = "Да",
  cancelText = "Отмена",
  isDanger = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <div className="bg-background rounded-large shadow-large border border-divider">
        <div className="p-6">
          <ModalHeader className="font-bold text-foreground">{title}</ModalHeader>
          <ModalBody className="text-muted-foreground text-sm">{children}</ModalBody>
          <ModalFooter className="flex justify-end gap-2 pt-4">
            <Button intent="outline" onClick={onClose} className="min-h-[44px]">
              {cancelText}
            </Button>
            <Button intent={isDanger ? "destructive" : "primary"} onClick={onConfirm} className="min-h-[44px]">
              {confirmText}
            </Button>
          </ModalFooter>
        </div>
      </div>
    </Modal>
  );
}
