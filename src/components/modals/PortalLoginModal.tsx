/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PortalLoginModule } from '../modules/PortalLoginModule';
import { X } from 'lucide-react';

export const PortalLoginModal: React.FC = () => {
  const { isPortalLoginModalOpen, setIsPortalLoginModalOpen, setLoginTargetRole } = useApp();

  if (!isPortalLoginModalOpen) return null;

  const handleClose = () => {
    setIsPortalLoginModalOpen(false);
    setLoginTargetRole(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative max-w-4xl w-full">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          title="Xir (Close)"
        >
          <X className="w-5 h-5" />
        </button>

        <PortalLoginModule
          isModal={true}
          onSuccess={handleClose}
        />
      </div>
    </div>
  );
};
