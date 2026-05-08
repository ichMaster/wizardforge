import { useContext } from 'react';
import { WizardContext } from '../WizardProvider';
import type { WizardContextValue } from '../types';

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard must be used within a <WizardProvider>');
  }
  return ctx;
}
