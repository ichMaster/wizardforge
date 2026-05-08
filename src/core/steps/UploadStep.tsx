import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import type { StepProps, Artifact } from '../types';

interface UploadConfig {
  multiple?: boolean;
  accept?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  dropzoneText?: string;
  showFileList?: boolean;
}

export function UploadStep({
  stepId,
  stepConfig,
  context,
  setContext,
  addArtifact,
  removeArtifact,
  setStepValid,
  artifacts,
  resolveExpression,
}: StepProps) {
  const cfg = (stepConfig.config ?? {}) as UploadConfig;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = cfg.accept
    ? Array.isArray(cfg.accept)
      ? cfg.accept as string[]
      : (resolveExpression(cfg.accept as unknown as string) as string[])
    : undefined;
  const multiple = cfg.multiple !== false;
  const maxFiles = cfg.maxFiles ?? Infinity;
  const maxSizeMB = cfg.maxSizeMB ?? Infinity;
  const dropzoneText = cfg.dropzoneText ?? 'Drag files here or click to browse';

  const stepArtifacts = artifacts.filter((a) => a.stepId === stepId);

  useEffect(() => {
    const minFiles =
      stepConfig.validation?.find((v) => v.rule === 'minFiles')?.value ?? (stepConfig.required ? 1 : 0);
    setStepValid(stepArtifacts.length >= Number(minFiles));
  }, [stepArtifacts.length, stepConfig, setStepValid]);

  useEffect(() => {
    setContext(
      'uploadedFiles',
      stepArtifacts.map((a) => ({ id: a.id, name: a.name, size: a.size, mimeType: a.mimeType })),
    );
  }, [stepArtifacts, setContext]);

  const isAccepted = useCallback(
    (file: File) => {
      if (!accept || accept.length === 0) return true;
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return accept.some((a) => a.toLowerCase() === ext);
    },
    [accept],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (stepArtifacts.length >= maxFiles) break;
        if (!isAccepted(file)) continue;
        if (file.size > maxSizeMB * 1024 * 1024) continue;

        const artifact: Artifact = {
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: 'uploaded',
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          stepId,
          file,
        };
        addArtifact(artifact);
      }
    },
    [stepArtifacts.length, maxFiles, maxSizeMB, isAccepted, addArtifact, stepId],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="wf-upload">
      <div
        className={`wf-upload-dropzone ${dragOver ? 'wf-upload-dropzone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="wf-upload-dropzone-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="wf-upload-dropzone-text">{dropzoneText}</p>
        {accept && (
          <p className="wf-upload-dropzone-hint">
            Accepted formats: {accept.join(', ')}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept?.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {cfg.showFileList !== false && stepArtifacts.length > 0 && (
        <ul className="wf-upload-filelist">
          {stepArtifacts.map((a) => (
            <li key={a.id} className="wf-upload-file">
              <span className="wf-upload-file-name">{a.name}</span>
              <span className="wf-upload-file-size">{formatSize(a.size)}</span>
              <button
                className="wf-upload-file-remove"
                onClick={(e) => { e.stopPropagation(); removeArtifact(a.id); }}
                aria-label={`Remove ${a.name}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
