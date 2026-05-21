import React from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';
import { Input } from '../../ui';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  clickupLink: string;
  setClickupLink: (v: string) => void;
  blocked: boolean;
  setBlocked: (v: boolean | ((prev: boolean) => boolean)) => void;
  blockedAt: string;
  setBlockedAt: (v: string) => void;
  concludedAt: string | undefined;
  setConcludedAt: (v: string | undefined) => void;
  errors: Record<string, string>;
}

const TaskMetadataSection: React.FC<Props> = ({
  title, setTitle,
  clickupLink, setClickupLink,
  blocked, setBlocked,
  blockedAt, setBlockedAt,
  concludedAt, setConcludedAt,
  errors,
}) => (
  <div className="space-y-5">
    <div>
      <input
        id="title"
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Nome da Demanda..."
        autoFocus
        className="w-full bg-transparent text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-transparent focus:border-primary pb-1 transition-colors"
      />
      {errors.title && <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>}
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px] group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Link2 className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          inputMode="url"
          value={clickupLink}
          onChange={e => setClickupLink(e.target.value)}
          placeholder="Colar link do ClickUp..."
          className="pl-9 pr-8"
        />
        {clickupLink && (
          <a
            href={clickupLink}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {errors.clickupLink && <p className="text-xs text-red-500 mt-1">{errors.clickupLink}</p>}
      </div>

      <div className="flex items-center gap-1 bg-muted border border-border p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setBlocked(b => !b)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            blocked
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background border border-transparent'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Bloqueada
        </button>

        <button
          type="button"
          onClick={() => setConcludedAt(concludedAt ? undefined : new Date().toISOString())}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            concludedAt
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background border border-transparent'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluída
        </button>
      </div>
    </div>

    {(blocked || concludedAt) && (
      <div className="flex flex-wrap gap-4 p-3.5 bg-muted/50 rounded-lg border border-border">
        {blocked && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 shrink-0">A partir de:</span>
            <Input
              type="date"
              value={blockedAt}
              onChange={e => setBlockedAt(e.target.value)}
              className="h-7 text-xs w-auto border-red-300 dark:border-red-700"
            />
          </div>
        )}
        {concludedAt && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Concluída em:</span>
            <Input
              type="date"
              value={concludedAt.split('T')[0]}
              onChange={e => setConcludedAt(e.target.value ? e.target.value + 'T00:00:00' : undefined)}
              className="h-7 text-xs w-auto border-emerald-300 dark:border-emerald-700"
            />
          </div>
        )}
      </div>
    )}
  </div>
);

export default TaskMetadataSection;
