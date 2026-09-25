import React from 'react';

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut?: boolean;
  user?: any;
}

declare const LogoutConfirmModal: React.FC<LogoutConfirmModalProps>;
export default LogoutConfirmModal;
