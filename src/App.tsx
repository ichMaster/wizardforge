import { useState, useEffect } from 'react';
import { WizardProvider, WizardShell, loadConfigFromYaml } from './core';
import type { WizardConfig } from './core';
import configYaml from './wizards/file-converter.yaml?raw';

export function App() {
  const [config, setConfig] = useState<WizardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = loadConfigFromYaml(configYaml);
      setConfig(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wizard config');
    }
  }, []);

  if (error) {
    return (
      <div className="wf-app-error">
        <h1>Configuration Error</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!config) {
    return <div className="wf-app-loading">Loading wizard...</div>;
  }

  return (
    <div className="wf-app">
      <header className="wf-app-header">
        <h1 className="wf-app-title">{config.wizard.title}</h1>
        {config.wizard.description && (
          <p className="wf-app-desc">{config.wizard.description}</p>
        )}
      </header>
      <WizardProvider config={config}>
        <WizardShell />
      </WizardProvider>
    </div>
  );
}
