import React, { useMemo, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { UserCircle2 } from 'lucide-react';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useClients } from '@/hooks/useClients';
import type { Member } from '@/types/member';
import HierarchyMemberCard from './components/HierarchyMemberCard';
import HierarchySkeleton from './components/HierarchySkeleton';

type LineSegment = { x1: number; y1: number; x2: number; y2: number };

const MembersView: React.FC = () => {
  const { effectiveClientId } = useClients();
  const { data: members = [], isLoading } = useMembersQuery(effectiveClientId);

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
  const [svgHeight, setSvgHeight] = useState(0);

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
    setSvgHeight(totalHeight);
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Membros</h2>
        <p className="text-sm text-muted-foreground">Hierarquia do time</p>
      </div>

      <div className="overflow-auto pb-8">
        <div ref={wrapperRef} className="relative flex flex-col items-center gap-12 min-w-max mx-auto py-4">
          {admins.length > 0 && users.length > 0 && lines.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height={svgHeight}
              style={{ top: 0, left: 0 }}
            >
              {lines.map((l) => (
                <line
                  key={`${l.x1}-${l.y1}-${l.x2}-${l.y2}`}
                  x1={l.x1} y1={l.y1}
                  x2={l.x2} y2={l.y2}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-border"
                />
              ))}
            </svg>
          )}

          <div ref={adminsRowRef} className="flex justify-center gap-8">
            {admins.map((m: Member) => (
              <HierarchyMemberCard key={m.id} member={m} />
            ))}
          </div>

          {users.length > 0 ? (
            <div ref={usersRowRef} className="flex justify-center gap-8">
              {users.map((m: Member) => (
                <HierarchyMemberCard key={m.id} member={m} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum usuário não-admin encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersView;
