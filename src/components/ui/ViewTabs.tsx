import { cn } from '@/lib/utils'

export interface ViewTab<T extends string = string> {
  value: T
  label: string
}

interface ViewTabsProps<T extends string = string> {
  tabs: readonly ViewTab<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function ViewTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  className,
}: ViewTabsProps<T>) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'cursor-pointer px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap',
            value === tab.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
