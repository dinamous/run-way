import { STEP_TYPES_ORDER, STEP_META } from '@/lib/steps';

export function StepsLegend() {
  return (
    <div className="flex gap-4 flex-wrap text-xs text-muted-foreground print:hidden">
      {STEP_TYPES_ORDER.map(type => (
        <div key={type} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${STEP_META[type].dot}`} />
          {STEP_META[type].label}
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        Bloqueado
      </div>
    </div>
  );
}
