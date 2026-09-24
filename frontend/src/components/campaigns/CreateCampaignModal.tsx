'use client';

import React from 'react';
import { CampaignWizardModal } from './CampaignWizardModal';
import { Language } from '../../lib/translations';

interface CreateCampaignModalProps {
  lang: Language;
  groups: any[];
  accounts?: any[];
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (data: any) => Promise<any>;
  onSuccess?: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  lang,
  groups,
  accounts = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  return (
    <CampaignWizardModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess || onClose}
      groups={groups}
      accounts={accounts}
      lang={lang}
    />
  );
};
