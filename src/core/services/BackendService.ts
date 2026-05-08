import type { AuthConfig, RetryPolicy } from '../types';

const DEFAULT_RETRY_POLICY: Required<RetryPolicy> = {
  maxRetries: 3,
  backoffMs: [1000, 3000, 10000],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class BackendService {
  private auth?: AuthConfig;
  private retryPolicy: Required<RetryPolicy>;

  constructor(auth?: AuthConfig, retryPolicy?: RetryPolicy) {
    this.auth = auth;
    this.retryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...retryPolicy,
    };
  }

  async request<T = unknown>(
    url: string,
    options: RequestInit = {},
    overrideRetries?: number,
  ): Promise<T> {
    const maxRetries = overrideRetries ?? this.retryPolicy.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = new Headers(options.headers);
        this.injectAuth(headers);
        if (options.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
          const isRetryable = this.retryPolicy.retryableStatusCodes.includes(response.status);
          if (isRetryable && attempt < maxRetries) {
            await this.backoff(attempt);
            continue;
          }
          const body = await response.text().catch(() => '');
          throw new BackendError(
            `Request failed: ${response.status} ${response.statusText}`,
            response.status,
            body,
            isRetryable,
          );
        }

        return (await response.json()) as T;
      } catch (err) {
        if (err instanceof BackendError) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await this.backoff(attempt);
          continue;
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  async post<T = unknown>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async get<T = unknown>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  private injectAuth(headers: Headers): void {
    if (!this.auth) return;

    switch (this.auth.type) {
      case 'bearer': {
        const token = this.readToken();
        if (token) {
          const prefix = this.auth.headerPrefix ?? 'Bearer';
          const headerName = this.auth.headerName ?? 'Authorization';
          headers.set(headerName, `${prefix} ${token}`);
        }
        break;
      }
      case 'api-key': {
        const token = this.readToken();
        if (token) {
          const headerName = this.auth.headerName ?? 'X-API-Key';
          headers.set(headerName, token);
        }
        break;
      }
      case 'cookie':
        break;
    }
  }

  private readToken(): string | null {
    if (!this.auth?.tokenKey) return null;
    const source = this.auth.tokenSource ?? 'localStorage';

    switch (source) {
      case 'localStorage':
        return localStorage.getItem(this.auth.tokenKey);
      case 'sessionStorage':
        return sessionStorage.getItem(this.auth.tokenKey);
      case 'cookie': {
        const match = document.cookie
          .split('; ')
          .find((c) => c.startsWith(`${this.auth!.tokenKey}=`));
        return match ? match.split('=').slice(1).join('=') : null;
      }
      default:
        return null;
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const delays = this.retryPolicy.backoffMs;
    const ms = delays[Math.min(attempt, delays.length - 1)]!;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class BackendError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}
