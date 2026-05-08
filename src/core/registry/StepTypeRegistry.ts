import type { StepTypePlugin } from '../types';

class StepTypeRegistryImpl {
  private plugins = new Map<string, StepTypePlugin>();

  register(plugin: StepTypePlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  unregister(type: string): void {
    this.plugins.delete(type);
  }

  get(type: string): StepTypePlugin | undefined {
    return this.plugins.get(type);
  }

  has(type: string): boolean {
    return this.plugins.has(type);
  }

  getAll(): StepTypePlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const StepTypeRegistry = new StepTypeRegistryImpl();
