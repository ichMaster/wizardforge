export { WizardProvider } from './WizardProvider';
export { WizardShell } from './components/WizardShell';
export { WizardNav } from './components/WizardNav';
export { WizardFooter } from './components/WizardFooter';
export { StepRenderer } from './components/StepRenderer';

export { useWizard } from './hooks/useWizard';

export { StepTypeRegistry } from './registry/StepTypeRegistry';
export { ExpressionEngine } from './ExpressionEngine';
export { loadConfigFromYaml } from './ConfigLoader';

export { UploadStep } from './steps/UploadStep';
export { FormStep } from './steps/FormStep';
export { InfoStep } from './steps/InfoStep';
export { ReviewStep } from './steps/ReviewStep';
export { DownloadStep } from './steps/DownloadStep';
export { JobStep } from './steps/JobStep';

export { BackendService, BackendError } from './services/BackendService';
export { JobRunner } from './services/JobRunner';

export type {
  WizardConfig,
  WizardState,
  WizardContextValue,
  StepConfig,
  StepProps,
  StepTypePlugin,
  FlatStep,
  Artifact,
  PhaseConfig,
  ThemeConfig,
  ValidationResult,
  JobConfig,
  JobState,
  JobStatus,
  JobAction,
  MockConfig,
  RetryPolicy,
  AuthConfig,
} from './types';

import { StepTypeRegistry } from './registry/StepTypeRegistry';
import { UploadStep } from './steps/UploadStep';
import { FormStep } from './steps/FormStep';
import { InfoStep } from './steps/InfoStep';
import { ReviewStep } from './steps/ReviewStep';
import { DownloadStep } from './steps/DownloadStep';
import { JobStep } from './steps/JobStep';

export function registerBuiltInSteps(): void {
  StepTypeRegistry.register({ type: 'upload', component: UploadStep });
  StepTypeRegistry.register({ type: 'form', component: FormStep });
  StepTypeRegistry.register({ type: 'info', component: InfoStep });
  StepTypeRegistry.register({ type: 'review', component: ReviewStep });
  StepTypeRegistry.register({ type: 'download', component: DownloadStep });
  StepTypeRegistry.register({ type: 'job', component: JobStep });
}
