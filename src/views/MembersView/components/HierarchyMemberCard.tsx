import React from 'react';
import { Mail, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Member } from '@/types/member';
import HierarchyAvatar from './HierarchyAvatar';

interface HierarchyMemberCardProps {
  member: Member;
}

const HierarchyMemberCard: React.FC<HierarchyMemberCardProps> = ({ member }) => {
  const joinedAt = member.created_at
    ? new Date(member.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="w-72 rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <HierarchyAvatar src={member.avatar_url} initials={member.avatar} />
        <div className="w-full space-y-1">
          <h4 className="font-semibold text-sm leading-none">{member.name}</h4>
          <div className="flex items-center justify-center text-xs text-muted-foreground mt-1">
            <Mail className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{member.email || 'Sem e-mail'}</span>
          </div>
          {joinedAt && (
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 mr-1 shrink-0" />
              <span>Entrou em {joinedAt}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <Badge variant={member.access_role === 'admin' ? 'default' : 'secondary'} className="text-[10px] uppercase">
            {member.access_role ?? 'user'}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {member.role}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default HierarchyMemberCard;
