import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

interface TermTooltipProps {
  term: string;
  definition: string;
}

const TermTooltip: React.FC<TermTooltipProps> = ({ term, definition }) => {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1 cursor-help text-muted-foreground hover:text-foreground transition-colors">
        <HelpCircle className="w-3.5 h-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold mb-1">{term}</p>
        <p>{definition}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default TermTooltip;