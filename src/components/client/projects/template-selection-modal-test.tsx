'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, templateName: string) => void;
  onCreateBlank: () => void;
}

export default function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateBlank
}: TemplateSelectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] p-4">
        <DialogHeader>
          <DialogTitle>Test Modal</DialogTitle>
          <DialogDescription>This is a test modal</DialogDescription>
        </DialogHeader>
        <div>Test content</div>
      </DialogContent>
    </Dialog>
  );
}
