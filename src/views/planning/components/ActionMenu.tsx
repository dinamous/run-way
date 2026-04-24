import { ExternalLink, Link2, CheckCircle2, Lock, Unlock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { Task } from '@/lib/steps';

interface ActionMenuProps {
  task: Task;
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export function ActionMenu({ task, onToggleBlock, onConclude, onEdit }: ActionMenuProps) {
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" title="Ações">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onEdit(task)}>
          <ExternalLink />
          Abrir demanda
        </DropdownMenuItem>

        {task.clickupLink && (
          <DropdownMenuItem asChild>
            <a href={task.clickupLink} target="_blank" rel="noopener noreferrer">
              <Link2 />
              Abrir no ClickUp
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {!isConcluded && (
          <DropdownMenuItem
            onSelect={() => onConclude(task)}
            className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400"
          >
            <CheckCircle2 />
            Concluir etapa
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={() => onToggleBlock(task)}
          className={isBlocked
            ? 'text-green-600 dark:text-green-400 focus:text-green-600 dark:focus:text-green-400'
            : 'text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400'
          }
        >
          {isBlocked ? <><Unlock />Desbloquear</> : <><Lock />Sinalizar bloqueio</>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
