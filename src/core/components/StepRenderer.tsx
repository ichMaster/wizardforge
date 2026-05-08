import { useWizard } from '../hooks/useWizard';
import { StepTypeRegistry } from '../registry/StepTypeRegistry';
import type { StepProps } from '../types';

export function StepRenderer() {
  const wizard = useWizard();
  const { currentStep } = wizard;

  if (!currentStep) {
    return <div className="wf-step-empty">No step configured.</div>;
  }

  const plugin = StepTypeRegistry.get(currentStep.config.type);
  if (!plugin) {
    return (
      <div className="wf-step-error">
        Unknown step type: <code>{currentStep.config.type}</code>
      </div>
    );
  }

  const Component = plugin.component;

  const stepProps: StepProps = {
    stepId: currentStep.id,
    stepConfig: currentStep.config,
    isActive: true,
    context: wizard.state.context as Record<string, unknown>,
    setContext: wizard.setContext,
    getContext: wizard.getContext,
    artifacts: wizard.state.artifacts,
    addArtifact: wizard.addArtifact,
    removeArtifact: wizard.removeArtifact,
    setStepValid: wizard.setStepValid,
    addError: wizard.addError,
    clearErrors: wizard.clearErrors,
    resolveExpression: wizard.resolveExpression,
  };

  return <Component {...stepProps} />;
}
