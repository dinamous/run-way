import React, { useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Users, Zap,
  CalendarCheck, BarChart2, ArrowRight, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STEP_TYPES_ORDER, STEP_META, migrateLegacyTask, getCurrentStep } from '../lib/steps';
import type { Step, StepType } from '../lib/steps';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; role: string; avatar: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calDaysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function businessDaysLeft(endStr: string, fromStr: string): number {
  let count = 0;
  const end = new Date(endStr + 'T00:00:00');
  const d = new Date(fromStr + 'T00:00:00');
  if (d > end) return 0;
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function normalizeTask(task: any) {
  if (task.steps) return task;
  return { ...task, ...migrateLegacyTask(task) };
}

function getVisibleSteps(task: any): Step[] {
  const norm = normalizeTask(task);
  return (norm.steps as Step[]).filter(s => s.active && s.start && s.end);
}

/** Last end date across all visible steps */
function getLastDeadline(task: any): string | null {
  const steps = getVisibleSteps(task);
  if (steps.length === 0) return null;
  return steps.reduce((max, s) => s.end > max ? s.end : max, steps[0].end);
}

/** First start date across all visible steps */
function getFirstStart(task: any): string | null {
  const steps = getVisibleSteps(task);
  if (steps.length === 0) return null;
  return steps.reduce((min, s) => s.start < min ? s.start : min, steps[0].start);
}

/** All unique member ids across all steps */
function getTaskMembers(task: any): string[] {
  return [...new Set(getVisibleSteps(task).flatMap(s => s.assignees))];
}

function getRisk(task: any, today: string): 'ok' | 'risco' | 'atrasado' | 'concluido' {
  const norm = normalizeTask(task);
  const lastDeadline = getLastDeadline(task);
  if (!lastDeadline) return 'ok';
  if (today > lastDeadline) return 'atrasado';
  const daysLeft = calDaysBetween(today, lastDeadline);
  if (norm.status?.blocked) return 'risco';
  if (daysLeft <= 2) return 'risco';
  return 'ok';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: 'ok' | 'risco' | 'atrasado' | 'concluido' }) {
  const map = {
    ok:        { label: 'No prazo',  cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
    risco:     { label: 'Em risco',  cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
    atrasado:  { label: 'Atrasado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
    concluido: { label: 'Concluido', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  };
  const m = map[risk];
  return <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', m.cls)}>{m.label}</span>;
}

// ─── Main View ────────────────────────────────────────────────────────────────

const ReportsView: React.FC<{ tasks: any[]; members: Member[] }> = ({ tasks, members }) => {
  const today = todayStr();

  const enriched = useMemo(() => tasks.map(task => {
    const norm = normalizeTask(task);
    const visibleSteps = getVisibleSteps(task);
    const lastDeadline = getLastDeadline(task);
    const firstStart = getFirstStart(task);
    const risk = getRisk(task, today);
    const daysLeft = lastDeadline ? calDaysBetween(today, lastDeadline) : 0;
    const bizLeft = lastDeadline ? businessDaysLeft(lastDeadline, today) : 0;
    const memberIds = getTaskMembers(task);
    const taskMembers = members.filter(m => memberIds.includes(m.id));
    const currentStep = getCurrentStep(norm.steps ?? [], today);

    // Progress: position of current step among active steps
    const activeSteps = visibleSteps;
    let progress = 0;
    if (activeSteps.length > 0 && lastDeadline && firstStart) {
      const totalDuration = calDaysBetween(firstStart, lastDeadline);
      const elapsed = Math.max(0, calDaysBetween(firstStart, today));
      progress = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;
    }

    return {
      ...norm,
      visibleSteps,
      lastDeadline,
      firstStart,
      risk,
      daysLeft,
      bizLeft,
      taskMembers,
      currentStep,
      progress,
      isBlocked: norm.status?.blocked ?? false,
    };
  }), [tasks, today, members]);

  // KPIs
  const total = enriched.length;
  const active = enriched.filter(t => t.currentStep && t.currentStep.start <= today && t.currentStep.end >= today).length;
  const atrasadas = enriched.filter(t => t.risk === 'atrasado').length;
  const emRisco = enriched.filter(t => t.risk === 'risco').length;
  const bloqueadas = enriched.filter(t => t.isBlocked).length;
  const semSteps = enriched.filter(t => t.visibleSteps.length === 0).length;

  // Upcoming deadlines (last step ends in next 14 days)
  const upcomingDeadlines = useMemo(() =>
    enriched
      .filter(t => t.lastDeadline && t.daysLeft >= 0 && t.daysLeft <= 14 && !t.isBlocked)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [enriched]
  );

  // Step type distribution (active today)
  const stepLoad = useMemo(() => {
    const counts: Partial<Record<StepType, number>> = {};
    for (const t of enriched) {
      for (const step of t.visibleSteps) {
        if (step.start <= today && step.end >= today) {
          counts[step.type] = (counts[step.type] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [enriched, today]);
  const maxStepLoad = Math.max(...Object.values(stepLoad), 1);

  // Capacity per member: active steps today
  const memberLoad = useMemo(() => members.map(m => {
    const activeStepsToday: { task: any; step: Step }[] = [];
    const atrasadasCount = enriched.filter(t => t.risk === 'atrasado' && getTaskMembers(t).includes(m.id)).length;
    const riscoCount = enriched.filter(t => t.risk === 'risco' && getTaskMembers(t).includes(m.id)).length;

    for (const t of enriched) {
      for (const step of t.visibleSteps) {
        if (step.assignees.includes(m.id) && step.start <= today && step.end >= today) {
          activeStepsToday.push({ task: t, step });
        }
      }
    }

    const activeCount = activeStepsToday.length;
    let capacityLabel = 'Livre';
    let capacityColor = 'bg-green-500';
    if (activeCount > 3) { capacityLabel = 'Sobrecarregado'; capacityColor = 'bg-red-500'; }
    else if (activeCount >= 3) { capacityLabel = 'Alocado'; capacityColor = 'bg-blue-500'; }
    else if (activeCount > 0) { capacityLabel = 'Alocado'; capacityColor = 'bg-blue-400'; }

    return { ...m, activeCount, atrasadasCount, riscoCount, capacityLabel, capacityColor };
  }), [members, enriched, today]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-lg font-medium">Sem demandas para analisar</p>
        <p className="text-sm">Crie demandas no Calendário para ver os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground text-sm">Visão analítica das demandas · Hoje: {today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<BarChart2 className="w-4 h-4 text-blue-600" />}       label="Total"        value={total}     color="bg-blue-50 dark:bg-blue-950" />
        <KpiCard icon={<Zap className="w-4 h-4 text-sky-600" />}              label="Em andamento" value={active}    color="bg-sky-50 dark:bg-sky-950" />
        <KpiCard icon={<AlertCircle className="w-4 h-4 text-red-600" />}      label="Atrasadas"    value={atrasadas}  color="bg-red-50 dark:bg-red-950" />
        <KpiCard icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />} label="Em risco"     value={emRisco}   color="bg-yellow-50 dark:bg-yellow-950" />
        <KpiCard icon={<Clock className="w-4 h-4 text-orange-600" />}         label="Bloqueadas"   value={bloqueadas} color="bg-orange-50 dark:bg-orange-950" />
        <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />} label="Sem steps" value={semSteps} color="bg-muted" />
      </div>

      {/* Tabela de demandas */}
      <section>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Status por Demanda
        </h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demanda</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Membros</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step atual</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progresso</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entrega</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias úteis</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risco</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((t, i) => {
                  const stepMeta = t.currentStep ? STEP_META[t.currentStep.type] : null;
                  return (
                    <tr key={t.id} className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', i % 2 === 0 ? '' : 'bg-muted/10')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {t.isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <div className="font-medium text-foreground max-w-[200px] truncate" title={t.title}>
                            {t.clickupLink
                              ? <a href={t.clickupLink} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{t.title}</a>
                              : t.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center -space-x-1">
                          {t.taskMembers.length === 0
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : t.taskMembers.map((m: Member) => (
                              <div key={m.id} className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground" title={m.name}>
                                {m.avatar}
                              </div>
                            ))
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.isBlocked ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                            Bloqueado
                          </span>
                        ) : stepMeta ? (
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit', stepMeta.color)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', stepMeta.dot)} />
                            {stepMeta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem steps</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', t.risk === 'atrasado' ? 'bg-red-500' : t.risk === 'risco' ? 'bg-yellow-500' : 'bg-green-500')}
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{t.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {t.lastDeadline ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!t.lastDeadline ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : t.bizLeft > 0 ? (
                          <span className={cn('text-xs font-medium', t.bizLeft <= 3 ? 'text-red-600 dark:text-red-400' : t.bizLeft <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground')}>
                            {t.bizLeft}d uteis
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">Vencido</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><RiskBadge risk={t.risk} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Proximas entregas */}
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" /> Proximas Entregas (14 dias)
          </h3>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {upcomingDeadlines.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma entrega nos proximos 14 dias.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingDeadlines.map(t => (
                  <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                      {t.taskMembers.length > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">{t.taskMembers[0].name}{t.taskMembers.length > 1 ? ` +${t.taskMembers.length - 1}` : ''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{t.lastDeadline}</span>
                      <span className={cn('text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded',
                        t.daysLeft === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        t.daysLeft <= 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                        'bg-muted text-muted-foreground')}>
                        {t.daysLeft === 0 ? 'Hoje' : `${t.daysLeft}d`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Capacidade da equipa */}
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Capacidade da Equipa
          </h3>
          <div className="space-y-3">
            {memberLoad.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{m.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', m.capacityColor)} />
                    <span className="text-xs font-medium text-foreground">{m.capacityLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', m.capacityColor)} style={{ width: `${Math.min(100, (m.activeCount / 5) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{m.activeCount} steps hoje</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {m.atrasadasCount > 0 && <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full">{m.atrasadasCount} atrasada{m.atrasadasCount > 1 ? 's' : ''}</span>}
                  {m.riscoCount > 0 && <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 px-2 py-0.5 rounded-full">{m.riscoCount} em risco</span>}
                  {m.atrasadasCount === 0 && m.riscoCount === 0 && m.activeCount > 0 && <span className="text-muted-foreground">Tudo no prazo</span>}
                  {m.activeCount === 0 && <span className="text-muted-foreground">Disponivel</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Carga por step (agora) */}
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" /> Carga por Step (agora)
          </h3>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            {STEP_TYPES_ORDER.map(type => {
              const meta = STEP_META[type];
              const count = stepLoad[type] ?? 0;
              const pct = maxStepLoad > 0 ? Math.round((count / maxStepLoad) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                      <span className="font-medium text-foreground">{meta.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', meta.dot)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.values(stepLoad).every(v => v === 0) && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum step ativo agora.</p>
            )}
          </div>
        </section>

        {/* Distribuicao bloqueado vs ativo */}
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Distribuicao por Estado
          </h3>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            {[
              { key: 'bloqueado',   label: 'Bloqueado',    count: bloqueadas, color: 'bg-red-500'   },
              { key: 'andamento',   label: 'Em andamento', count: active,     color: 'bg-blue-500'  },
              { key: 'sem-steps',   label: 'Sem steps',    count: semSteps,   color: 'bg-muted-foreground' },
            ].map(({ key, label, count, color }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Alertas */}
      {(atrasadas > 0 || emRisco > 0 || bloqueadas > 0) && (
        <section>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Alertas
          </h3>
          <div className="space-y-2">
            {enriched.filter(t => t.risk === 'atrasado').map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-medium text-red-800 dark:text-red-200">{t.title}</span>
                <span className="text-red-600 dark:text-red-400 text-xs">— entrega era {t.lastDeadline}</span>
              </div>
            ))}
            {enriched.filter(t => t.risk === 'risco').map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded-lg px-4 py-2.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">{t.title}</span>
                <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                  — {t.isBlocked ? 'bloqueado' : `${t.bizLeft}d uteis restantes`}
                  {t.taskMembers.length > 0 && ` · ${t.taskMembers.map((m: Member) => m.name).join(', ')}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

export default ReportsView;
