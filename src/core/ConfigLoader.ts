import { parse } from 'yaml';
import type { WizardConfig } from './types';

export function loadConfigFromYaml(yamlString: string): WizardConfig {
  const raw = parse(yamlString) as Record<string, unknown>;

  if (!raw['wizard']) {
    throw new Error('Invalid wizard config: missing "wizard" key');
  }

  const wizard = raw['wizard'] as Record<string, unknown>;

  if (!wizard['id'] || !wizard['title'] || !wizard['phases']) {
    throw new Error('Invalid wizard config: missing required fields (id, title, phases)');
  }

  if (!raw['steps'] || typeof raw['steps'] !== 'object') {
    throw new Error('Invalid wizard config: missing "steps" key');
  }

  const phases = wizard['phases'] as Array<Record<string, unknown>>;
  const steps = raw['steps'] as Record<string, Record<string, unknown>>;

  for (const phase of phases) {
    const stepIds = phase['steps'] as string[];
    for (const stepId of stepIds) {
      if (!steps[stepId]) {
        throw new Error(`Step "${stepId}" referenced in phase "${phase['id']}" but not defined in steps`);
      }
    }
  }

  return raw as unknown as WizardConfig;
}
