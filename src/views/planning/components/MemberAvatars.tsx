import type { Member } from '@/hooks/infra/useSupabase';

export function MemberAvatars({ assigneeIds, members, size = 'sm' }: {
  assigneeIds: string[];
  members: Member[];
  size?: 'sm' | 'xs';
}) {
  const dim = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  const resolved = assigneeIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  if (resolved.length === 0) {
    return (
      <div
        className={`${dim} rounded-full border border-dashed border-muted-foreground/30 bg-muted/60 flex items-center justify-center text-muted-foreground/50`}
        title="Sem responsável"
      >
        ?
      </div>
    );
  }

  return (
    <div className="flex -space-x-1.5">
      {resolved.slice(0, 3).map(m => (
        <div
          key={m.id}
          title={m.name}
          className={`${dim} rounded-full ring-2 ring-background bg-primary text-primary-foreground font-bold flex items-center justify-center overflow-hidden`}
        >
          {m.avatar_url
            ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
            : m.name.slice(0, 2).toUpperCase()
          }
        </div>
      ))}
      {resolved.length > 3 && (
        <div className={`${dim} rounded-full ring-2 ring-background bg-muted text-foreground font-bold flex items-center justify-center`}>
          +{resolved.length - 3}
        </div>
      )}
    </div>
  );
}
