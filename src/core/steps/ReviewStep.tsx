import { useEffect } from 'react';
import type { StepProps } from '../types';

interface ReviewField {
  label: string;
  value: string;
}

interface ReviewSection {
  title: string;
  fields?: ReviewField[];
  source?: string;
  display?: string;
}

interface ReviewConfig {
  sections?: ReviewSection[];
}

export function ReviewStep({
  stepConfig,
  context,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const cfg = (stepConfig.config ?? {}) as ReviewConfig;

  useEffect(() => {
    setStepValid(true);
  }, [setStepValid]);

  const resolveFields = (section: ReviewSection): ReviewField[] => {
    if (section.fields) {
      return section.fields.map((f) => ({
        label: f.label,
        value: String(resolveExpression(f.value) ?? '—'),
      }));
    }

    if (section.source) {
      const data = resolveExpression(`{{${section.source}}}`) as Record<string, unknown> | undefined;
      if (data && typeof data === 'object') {
        return Object.entries(data).map(([key, val]) => ({
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
          value: val == null ? '—' : String(val),
        }));
      }
    }

    return [];
  };

  if (!cfg.sections) {
    const entries = Object.entries(context).filter(
      ([, v]) => typeof v !== 'object' || v === null,
    );
    return (
      <div className="wf-review">
        <div className="wf-review-section">
          <h3 className="wf-review-section-title">Summary</h3>
          <dl className="wf-review-fields">
            {entries.map(([key, val]) => (
              <div key={key} className="wf-review-field">
                <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt>
                <dd>{val == null ? '—' : String(val)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-review">
      {cfg.sections.map((section, i) => {
        const fields = resolveFields(section);
        return (
          <div key={i} className="wf-review-section">
            <h3 className="wf-review-section-title">{section.title}</h3>
            <dl className="wf-review-fields">
              {fields.map((f, j) => (
                <div key={j} className="wf-review-field">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
