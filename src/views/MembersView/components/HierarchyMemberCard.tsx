import React from 'react';
import { Mail, CalendarDays, Zap } from 'lucide-react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Badge } from '@/components/ui';
import type { Member } from '@/types/member';
import HierarchyAvatar from './HierarchyAvatar';

interface HierarchyMemberCardProps {
  member: Member;
  isAdmin?: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const HierarchyMemberCard: React.FC<HierarchyMemberCardProps> = ({ member, isAdmin: _isAdmin }) => {
  const joinedAt = member.created_at
    ? new Date(member.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [3, -3]), { stiffness: 400, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-3, 3]), { stiffness: 400, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      variants={cardVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.035, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="w-64 rounded-xl border border-border bg-card text-card-foreground shadow-sm cursor-default relative"
    >
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <HierarchyAvatar src={member.avatar_url} initials={member.avatar} />
        </div>

        <div className="w-full space-y-1.5">
          <h4 className="font-semibold text-sm leading-tight">{member.name}</h4>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[160px]">{member.email || 'Sem e-mail'}</span>
          </div>
          {joinedAt && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 shrink-0" />
              <span>Entrou em {joinedAt}</span>
            </div>
          )}
        </div>

        {member.capacity != null && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 shrink-0" />
            <span>Capacidade: {member.capacity} demandas/sem.</span>
          </div>
        )}

        <div className="flex gap-1.5 mt-0.5">
          <Badge
            variant={member.access_role === 'admin' ? 'default' : 'secondary'}
            className="text-[10px] uppercase tracking-wide px-2"
          >
            {member.access_role ?? 'user'}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-2">
            {member.role}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
};

export default HierarchyMemberCard;
