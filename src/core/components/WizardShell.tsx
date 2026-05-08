import { useWizard } from '../hooks/useWizard';
import { WizardNav } from './WizardNav';
import { WizardFooter } from './WizardFooter';
import { StepRenderer } from './StepRenderer';

export function WizardShell() {
  const { config, currentStep } = useWizard();
  const theme = config.wizard.theme;

  const cssVars = theme?.colors
    ? Object.fromEntries(
        Object.entries(theme.colors).map(([k, v]) => [
          `--wf-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
          v,
        ]),
      )
    : {};

  if (theme?.borderRadius) {
    (cssVars as Record<string, string>)['--wf-radius'] = theme.borderRadius;
  }
  if (theme?.fontFamily) {
    (cssVars as Record<string, string>)['--wf-font'] = theme.fontFamily;
  }

  return (
    <div className="wf-wizard" style={cssVars as React.CSSProperties}>
      <WizardNav />
      <main className="wf-content">
        <header className="wf-step-header">
          <h2 className="wf-step-title">{currentStep?.config.title}</h2>
          {currentStep?.config.subtitle && (
            <p className="wf-step-subtitle">{currentStep.config.subtitle}</p>
          )}
        </header>
        <div className="wf-step-body">
          <StepRenderer />
        </div>
      </main>
      <WizardFooter />
    </div>
  );
}
