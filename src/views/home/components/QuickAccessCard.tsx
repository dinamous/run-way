import { type ElementType } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";

interface QuickAccessCardProps {
  icon: ElementType;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}

export function QuickAccessCard({
  icon: Icon,
  title,
  description,
  disabled = false,
  onClick,
}: QuickAccessCardProps) {
  const card = (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors w-full",
        disabled
          ? "border-border bg-muted/30 cursor-not-allowed opacity-50"
          : "border-border bg-card hover:bg-muted/60 hover:border-primary/40 cursor-pointer"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg",
        disabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent>Selecione um cliente para acessar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}
