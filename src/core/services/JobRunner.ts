import type { JobConfig, JobAction } from '../types';
import { BackendService } from './BackendService';
import { ExpressionEngine } from '../ExpressionEngine';

interface JobRunnerOptions {
  stepId: string;
  jobConfig: JobConfig;
  context: Record<string, unknown>;
  variables: Record<string, unknown>;
  backend: BackendService;
  dispatch: (action: JobAction) => void;
  onComplete: (result: unknown) => void;
  onFail: (error: string) => void;
}

export class JobRunner {
  private aborted = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private engine: ExpressionEngine;

  private stepId: string;
  private config: JobConfig;
  private context: Record<string, unknown>;
  private backend: BackendService;
  private dispatch: (action: JobAction) => void;
  private onComplete: (result: unknown) => void;
  private onFail: (error: string) => void;

  constructor(opts: JobRunnerOptions) {
    this.stepId = opts.stepId;
    this.config = opts.jobConfig;
    this.context = opts.context;
    this.backend = opts.backend;
    this.dispatch = opts.dispatch;
    this.onComplete = opts.onComplete;
    this.onFail = opts.onFail;
    this.engine = new ExpressionEngine(opts.variables, {});
  }

  async start(): Promise<void> {
    if (this.isMockEnabled()) {
      return this.runMock();
    }
    return this.runReal();
  }

  cancel(): void {
    this.aborted = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
  }

  private isMockEnabled(): boolean {
    const mock = this.config.mock;
    if (!mock) return false;
    if (typeof mock.enabled === 'boolean') return mock.enabled;
    const resolved = this.engine.resolve(mock.enabled, this.context);
    return resolved === true || resolved === 'true';
  }

  private async runMock(): Promise<void> {
    const mock = this.config.mock!;
    const latency = mock.latencyMs ?? 3000;
    const steps = mock.progressSteps ?? [
      { at: 0, message: 'Starting...' },
      { at: 100, message: 'Complete' },
    ];

    const mockJobId = `mock-${Date.now()}`;
    this.dispatch({ type: 'JOB_START', stepId: this.stepId, jobId: mockJobId });

    const sorted = [...steps].sort((a, b) => a.at - b.at);
    let prevAt = 0;

    for (const step of sorted) {
      if (this.aborted) return;
      const incrementalDelay = ((step.at - prevAt) / 100) * latency;
      if (incrementalDelay > 0) await this.delay(incrementalDelay);
      prevAt = step.at;
      if (this.aborted) return;

      if (step.at < 100) {
        this.dispatch({
          type: 'JOB_PROGRESS',
          stepId: this.stepId,
          progress: step.at,
          message: step.message,
        });
      }
    }

    if (this.aborted) return;
    const result = mock.result ?? {};
    this.dispatch({ type: 'JOB_COMPLETE', stepId: this.stepId, result });
    this.onComplete(result);
  }

  private async runReal(): Promise<void> {
    const endpoint = String(this.engine.resolve(this.config.endpoint, this.context) ?? '');
    const method = this.config.method ?? 'POST';
    const body = this.resolveBodyMapping(this.config.bodyMapping ?? {});

    this.dispatch({ type: 'JOB_START', stepId: this.stepId, jobId: '' });

    try {
      const submitResponse = await this.backend.request<Record<string, unknown>>(
        endpoint,
        { method, body: JSON.stringify(body) },
        0,
      );

      const jobId = String(submitResponse['jobId'] ?? '');
      if (!jobId) throw new Error('Backend did not return a jobId');

      this.dispatch({ type: 'JOB_START', stepId: this.stepId, jobId });
      this.context = { ...this.context, jobId };

      if (this.config.async !== false) {
        await this.poll(jobId);
      } else {
        this.dispatch({ type: 'JOB_COMPLETE', stepId: this.stepId, result: submitResponse });
        this.onComplete(submitResponse);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.dispatch({ type: 'JOB_FAIL', stepId: this.stepId, error: msg });
      this.onFail(msg);
    }
  }

  private async poll(jobId: string): Promise<void> {
    const pollingEndpoint = String(
      this.engine.resolve(this.config.pollingEndpoint ?? '', this.context) ?? '',
    );
    if (!pollingEndpoint) throw new Error('No pollingEndpoint configured');

    const interval = this.config.pollingIntervalMs ?? 2000;
    const timeout = this.config.timeoutMs ?? 600000;
    const mapping = this.config.progressMapping ?? {};

    const startTime = Date.now();

    if (timeout > 0) {
      this.timeoutTimer = setTimeout(() => {
        this.aborted = true;
        this.dispatch({ type: 'JOB_FAIL', stepId: this.stepId, error: 'Job timed out' });
        this.onFail('Job timed out');
      }, timeout);
    }

    const doPoll = async (): Promise<void> => {
      if (this.aborted) return;

      try {
        const statusResp = await this.backend.get<Record<string, unknown>>(pollingEndpoint);
        const status = String(statusResp['status'] ?? '');

        if (status === 'running' || status === 'pending') {
          const progress = this.extractField(statusResp, mapping.percent);
          const message = this.extractField(statusResp, mapping.message);
          const currentFile = this.extractField(statusResp, mapping.currentFile);
          const phase = this.extractField(statusResp, mapping.phase);

          this.dispatch({
            type: 'JOB_PROGRESS',
            stepId: this.stepId,
            progress: typeof progress === 'number' ? progress : Number(progress) || 0,
            message: message != null ? String(message) : undefined,
            currentFile: currentFile != null ? String(currentFile) : undefined,
            phase: phase != null ? String(phase) : undefined,
          });

          if (!this.aborted) {
            await this.delay(interval);
            return doPoll();
          }
          return;
        }

        if (status === 'completed') {
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          const resultKey = this.config.resultKey;
          const result = statusResp['result'] ?? statusResp['data'] ?? statusResp;
          this.dispatch({ type: 'JOB_COMPLETE', stepId: this.stepId, result });
          if (resultKey) {
            this.onComplete(result);
          } else {
            this.onComplete(result);
          }
          return;
        }

        if (status === 'failed' || status === 'cancelled') {
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          const errorMsg = String(statusResp['error'] ?? statusResp['message'] ?? `Job ${status}`);
          this.dispatch({ type: 'JOB_FAIL', stepId: this.stepId, error: errorMsg });
          this.onFail(errorMsg);
          return;
        }

        if (Date.now() - startTime > timeout) {
          if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
          this.dispatch({ type: 'JOB_FAIL', stepId: this.stepId, error: 'Job timed out' });
          this.onFail('Job timed out');
          return;
        }

        await this.delay(interval);
        return doPoll();
      } catch (err) {
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
        const msg = err instanceof Error ? err.message : String(err);
        this.dispatch({ type: 'JOB_FAIL', stepId: this.stepId, error: msg });
        this.onFail(msg);
      }
    };

    await doPoll();
  }

  private resolveBodyMapping(mapping: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mapping)) {
      if (typeof value === 'string') {
        result[key] = this.engine.resolve(value, this.context);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.resolveBodyMapping(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private extractField(obj: Record<string, unknown>, path?: string): unknown {
    if (!path) return undefined;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pollTimer = setTimeout(resolve, ms);
    });
  }
}
