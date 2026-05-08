import { useEffect, useCallback } from 'react';
import type { StepProps } from '../types';

interface FieldConfig {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<string | { value: string; label: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
  condition?: string;
}

interface SectionConfig {
  title: string;
  fields: FieldConfig[];
}

interface FormConfig {
  fields?: FieldConfig[];
  layout?: string;
  sections?: SectionConfig[];
}

export function FormStep({
  stepConfig,
  context,
  setContext,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const cfg = (stepConfig.config ?? {}) as FormConfig;

  const allFields: FieldConfig[] = cfg.sections
    ? cfg.sections.flatMap((s) => s.fields)
    : cfg.fields ?? [];

  const visibleFields = allFields.filter((f) => {
    if (!f.condition) return true;
    return resolveExpression(f.condition) === true;
  });

  useEffect(() => {
    for (const field of visibleFields) {
      if (field.default !== undefined && context[field.id] === undefined) {
        setContext(field.id, field.default);
      }
    }
  }, []);

  useEffect(() => {
    const requiredFields = visibleFields.filter((f) => f.required);
    const allFilled = requiredFields.every((f) => {
      const v = context[f.id];
      return v !== undefined && v !== null && v !== '';
    });
    setStepValid(allFilled);
  }, [context, visibleFields, setStepValid]);

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setContext(fieldId, value);
    },
    [setContext],
  );

  const renderField = (field: FieldConfig) => {
    const value = context[field.id] ?? field.default ?? '';
    const normalizedOptions = (field.options ?? []).map((o) =>
      typeof o === 'string' ? { value: o, label: o } : o,
    );

    switch (field.type) {
      case 'text':
      case 'date':
        return (
          <input
            className="wf-form-input"
            type={field.type}
            value={String(value)}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            className="wf-form-input"
            type="number"
            value={value === '' ? '' : Number(value)}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="wf-form-textarea"
            value={String(value)}
            placeholder={field.placeholder}
            rows={4}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            className="wf-form-select"
            value={String(value)}
            onChange={(e) => handleChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {normalizedOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
      case 'radio-cards':
        return (
          <div className={`wf-form-radio-group ${field.type === 'radio-cards' ? 'wf-form-radio-cards' : ''}`}>
            {normalizedOptions.map((o) => (
              <label
                key={o.value}
                className={`wf-form-radio-option ${value === o.value ? 'wf-form-radio-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => handleChange(field.id, o.value)}
                />
                <span className="wf-form-radio-label">{o.label}</span>
                {o.description && (
                  <span className="wf-form-radio-desc">{o.description}</span>
                )}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="wf-form-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(field.id, e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        );

      case 'toggle':
        return (
          <label className="wf-form-toggle">
            <div
              className={`wf-form-toggle-track ${value ? 'wf-form-toggle-track--on' : ''}`}
              onClick={() => handleChange(field.id, !value)}
            >
              <div className="wf-form-toggle-thumb" />
            </div>
          </label>
        );

      default:
        return (
          <input
            className="wf-form-input"
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        );
    }
  };

  const renderFieldGroup = (fields: FieldConfig[], sectionTitle?: string) => (
    <div className="wf-form-section" key={sectionTitle}>
      {sectionTitle && <h3 className="wf-form-section-title">{sectionTitle}</h3>}
      {fields
        .filter((f) => !f.condition || resolveExpression(f.condition) === true)
        .map((field) => (
          <div key={field.id} className="wf-form-field">
            {field.type !== 'checkbox' && (
              <label className="wf-form-label">
                {field.label}
                {field.required && <span className="wf-form-required">*</span>}
              </label>
            )}
            {field.description && (
              <p className="wf-form-description">{field.description}</p>
            )}
            {renderField(field)}
          </div>
        ))}
    </div>
  );

  return (
    <div className="wf-form">
      {cfg.sections
        ? cfg.sections.map((section) =>
            renderFieldGroup(section.fields, section.title),
          )
        : renderFieldGroup(allFields)}
    </div>
  );
}
