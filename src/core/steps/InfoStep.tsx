import { useEffect } from 'react';
import type { StepProps } from '../types';

interface CardConfig {
  title: string;
  value: string;
  icon?: string;
}

interface InfoConfig {
  layout?: string;
  cards?: CardConfig[];
  markdown?: string;
  text?: string;
}

export function InfoStep({
  stepConfig,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const cfg = (stepConfig.config ?? {}) as InfoConfig;

  useEffect(() => {
    setStepValid(true);
  }, [setStepValid]);

  if (cfg.cards) {
    return (
      <div className="wf-info">
        <div className="wf-info-cards">
          {cfg.cards.map((card, i) => {
            const resolvedValue = resolveExpression(card.value);
            return (
              <div key={i} className="wf-info-card">
                {card.icon && <div className="wf-info-card-icon">{iconFor(card.icon)}</div>}
                <div className="wf-info-card-value">
                  {resolvedValue != null ? String(resolvedValue) : '—'}
                </div>
                <div className="wf-info-card-title">{card.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (cfg.text) {
    return (
      <div className="wf-info">
        <p className="wf-info-text">
          {String(resolveExpression(cfg.text) ?? cfg.text)}
        </p>
      </div>
    );
  }

  return <div className="wf-info"><p>No content configured for this step.</p></div>;
}

function iconFor(name: string): string {
  const icons: Record<string, string> = {
    file: '\u{1F4C4}',
    code: '\u{1F4BB}',
    gauge: '\u{1F4CA}',
    clock: '\u{23F1}️',
    check: '✅',
    warning: '⚠️',
    info: 'ℹ️',
    table: '\u{1F4CB}',
    server: '\u{1F5A5}️',
    bolt: '⚡',
    document: '\u{1F4C3}',
    download: '\u{2B07}️',
  };
  return icons[name] ?? '\u{1F4E6}';
}
