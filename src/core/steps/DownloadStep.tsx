import { useEffect } from 'react';
import type { StepProps } from '../types';

interface DownloadSource {
  id: string;
  label: string;
  description?: string;
  endpoint: string;
  format?: string;
  icon?: string;
  primary?: boolean;
  condition?: string;
}

interface DownloadConfig {
  sources?: DownloadSource[];
  completionMessage?: string;
  showSummary?: boolean;
  summaryFields?: Array<{ label: string; value: string }>;
}

export function DownloadStep({
  stepConfig,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const cfg = (stepConfig.config ?? {}) as DownloadConfig;

  useEffect(() => {
    setStepValid(true);
  }, [setStepValid]);

  const visibleSources = (cfg.sources ?? []).filter((s) => {
    if (!s.condition) return true;
    return resolveExpression(s.condition) === true;
  });

  const handleDownload = (source: DownloadSource) => {
    const url = String(resolveExpression(source.endpoint) ?? source.endpoint);
    window.open(url, '_blank');
  };

  return (
    <div className="wf-download">
      {cfg.completionMessage && (
        <div className="wf-download-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--wf-success, #16a34a)" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>{String(resolveExpression(cfg.completionMessage))}</p>
        </div>
      )}

      {cfg.showSummary && cfg.summaryFields && (
        <div className="wf-download-summary">
          {cfg.summaryFields.map((field, i) => (
            <div key={i} className="wf-download-summary-item">
              <span className="wf-download-summary-label">{field.label}</span>
              <span className="wf-download-summary-value">
                {String(resolveExpression(field.value) ?? '—')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="wf-download-sources">
        {visibleSources.map((source) => (
          <div
            key={source.id}
            className={`wf-download-card ${source.primary ? 'wf-download-card--primary' : ''}`}
          >
            <div className="wf-download-card-icon">
              {formatIcon(source.format)}
            </div>
            <div className="wf-download-card-info">
              <h4 className="wf-download-card-label">{source.label}</h4>
              {source.description && (
                <p className="wf-download-card-desc">{source.description}</p>
              )}
              {source.format && (
                <span className="wf-download-card-format">{source.format.toUpperCase()}</span>
              )}
            </div>
            <button
              className="wf-btn wf-btn--secondary"
              onClick={() => handleDownload(source)}
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatIcon(format?: string): string {
  switch (format) {
    case 'zip': return '\u{1F4E6}';
    case 'pdf': return '\u{1F4C4}';
    case 'csv': return '\u{1F4CA}';
    default: return '\u{1F4C1}';
  }
}
