import React, { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMembersQuery } from '@/hooks/members/useMembersQuery';
import { useClients } from '@/hooks/clients/useClients';
import type { Member } from '@/types/member';
import HierarchyMemberCard from './components/HierarchyMemberCard';
import HierarchySkeleton from './components/HierarchySkeleton';

type LineSegment = { x1: number; y1: number; x2: number; y2: number };

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const svgVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.55, duration: 0.35, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
};

const MembersView: React.FC = () => {
  const { effectiveClientId } = useClients();
  const { data: members = [], isLoading } = useMembersQuery(effectiveClientId);
  const prefersReduced = useReducedMotion();

  const activeMembers = useMemo(
    () => members.filter((m: Member) => m.is_active !== false),
    [members]
  );

  const { admins, users } = useMemo(() => ({
    admins: activeMembers.filter((m: Member) => m.access_role === 'admin'),
    users: activeMembers.filter((m: Member) => m.access_role !== 'admin'),
  }), [activeMembers]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const adminsRowRef = useRef<HTMLDivElement>(null);
  const usersRowRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);
  const [svgDims, setSvgDims] = useState({ width: 0, height: 0 });

  const computeLines = useCallback(() => {
    if (!wrapperRef.current || !adminsRowRef.current || !usersRowRef.current) return;
    if (admins.length === 0 || users.length === 0) return;

    const base = wrapperRef.current.getBoundingClientRect();

    const adminCards = Array.from(adminsRowRef.current.children) as HTMLElement[];
    const userCards = Array.from(usersRowRef.current.children) as HTMLElement[];

    const toLocal = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        cx: r.left - base.left + r.width / 2,
        top: r.top - base.top,
        bottom: r.bottom - base.top,
      };
    };

    const aRects = adminCards.map(toLocal);
    const uRects = userCards.map(toLocal);

    const adminBottomY = Math.max(...aRects.map((r) => r.bottom));
    const userTopY = Math.min(...uRects.map((r) => r.top));
    const midY = (adminBottomY + userTopY) / 2;

    const newLines: LineSegment[] = [];

    aRects.forEach((r) => newLines.push({ x1: r.cx, y1: r.bottom, x2: r.cx, y2: midY }));

    const allCx = [...aRects.map((r) => r.cx), ...uRects.map((r) => r.cx)];
    if (aRects.length > 1 || uRects.length > 1) {
      newLines.push({ x1: Math.min(...allCx), y1: midY, x2: Math.max(...allCx), y2: midY });
    }

    uRects.forEach((r) => newLines.push({ x1: r.cx, y1: midY, x2: r.cx, y2: r.top }));

    const totalHeight = Math.max(...uRects.map((r) => r.bottom));
    setSvgDims({ width: base.width, height: totalHeight });
    setLines(newLines);
  }, [admins.length, users.length]);

  useLayoutEffect(() => {
    computeLines();
    const ro = new ResizeObserver(computeLines);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [computeLines]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Membros</h2>
          <p className="text-sm text-muted-foreground">Hierarquia do time</p>
        </div>
        <div className="overflow-auto pb-8">
          <HierarchySkeleton />
        </div>
      </div>
    );
  }

  if (activeMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
        <UserCircle2 className="w-12 h-12 mb-2 opacity-50" />
        <p>Nenhum membro encontrado.</p>
      </div>
    );
  }

  const lineLength = (l: LineSegment) =>
    Math.sqrt(Math.pow(l.x2 - l.x1, 2) + Math.pow(l.y2 - l.y1, 2));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Membros</h2>
        <p className="text-sm text-muted-foreground">
          {activeMembers.length} {activeMembers.length === 1 ? 'membro ativo' : 'membros ativos'} · {admins.length} {admins.length === 1 ? 'admin' : 'admins'} · {users.length} {users.length === 1 ? 'colaborador' : 'colaboradores'}
        </p>
      </div>

      <div className="overflow-auto pb-8">
        <motion.div
          ref={wrapperRef}
          className="relative flex flex-col items-center gap-20 min-w-max mx-auto py-4"
          variants={prefersReduced ? undefined : containerVariants}
          initial={prefersReduced ? undefined : 'hidden'}
          animate={prefersReduced ? undefined : 'visible'}
        >
          <AnimatePresence>
            {admins.length > 0 && users.length > 0 && lines.length > 0 && (
              <motion.svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height={svgDims.height}
                style={{ top: 0, left: 0, overflow: 'visible' }}
                variants={prefersReduced ? undefined : svgVariants}
                initial={prefersReduced ? undefined : 'hidden'}
                animate={prefersReduced ? undefined : 'visible'}
              >
                {lines.map((l, i) => {
                  const len = lineLength(l);
                  return (
                    <motion.line
                      key={`${l.x1}-${l.y1}-${l.x2}-${l.y2}`}
                      x1={l.x1} y1={l.y1}
                      x2={l.x2} y2={l.y2}
                      stroke="currentColor"
                      strokeWidth={1}
                      className="text-border"
                      strokeDasharray={len}
                      strokeDashoffset={prefersReduced ? 0 : len}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{
                        delay: 0.6 + i * 0.04,
                        duration: 0.45,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  );
                })}
              </motion.svg>
            )}
          </AnimatePresence>

          <motion.div
            ref={adminsRowRef}
            className="flex justify-center gap-8"
            variants={prefersReduced ? undefined : rowVariants}
          >
            {admins.map((m: Member) => (
              <HierarchyMemberCard key={m.id} member={m} isAdmin />
            ))}
          </motion.div>

          {users.length > 0 ? (
            <motion.div
              ref={usersRowRef}
              className="flex justify-center gap-8 flex-wrap"
              variants={prefersReduced ? undefined : rowVariants}
            >
              {users.map((m: Member) => (
                <HierarchyMemberCard key={m.id} member={m} />
              ))}
            </motion.div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum usuário não-admin encontrado.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MembersView;
