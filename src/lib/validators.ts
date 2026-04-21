import { z } from 'zod'

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const DbStepAssigneeSchema = z.object({
  member_id: z.string(),
})

export const DbStepRowSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  step_order: z.number().int().nonnegative(),
  active: z.boolean(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  step_assignees: z.array(DbStepAssigneeSchema).default([]),
})

export const DbTaskRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  clickup_link: z.string().nullable().transform(v => v === '' ? null : v),
  blocked: z.boolean(),
  blocked_at: z.string().nullable(),
  created_at: z.string(),
  concluded_at: z.string().nullable(),
  concluded_by: z.string().nullable(),
  client_id: z.string().nullable(),
  task_steps: z.array(DbStepRowSchema).default([]),
})

export type ValidatedDbTaskRow = z.infer<typeof DbTaskRowSchema>

// ─── Members ─────────────────────────────────────────────────────────────────

export const DbMemberRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string(),
  avatar: z.string(),
  avatar_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  auth_user_id: z.string().nullable().optional(),
  access_role: z.enum(['admin', 'user']).optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  deactivated_at: z.string().nullable().optional(),
})

export type ValidatedDbMemberRow = z.infer<typeof DbMemberRowSchema>

// ─── Clients ─────────────────────────────────────────────────────────────────

export const DbClientRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string(),
  created_at: z.string().nullable().optional(),
})

export type ValidatedDbClientRow = z.infer<typeof DbClientRowSchema>

// ─── UserPreferences ─────────────────────────────────────────────────────────

export const DbUserPreferencesSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['pt-BR', 'en']),
  notifications_enabled: z.boolean(),
  default_view: z.enum(['home', 'calendar', 'timeline', 'list']),
  client_order: z.array(z.string()).default([]),
  notification_step_overdue: z.boolean().default(true),
  notification_task_stalled: z.boolean().default(true),
  notification_member_overloaded: z.boolean().default(true),
  stalled_days_threshold: z.number().int().min(1).max(30).default(5),
  overload_threshold: z.number().int().min(1).max(20).default(3),
  created_at: z.string(),
  updated_at: z.string(),
})

export type ValidatedDbUserPreferences = z.infer<typeof DbUserPreferencesSchema>

// ─── UserClients ──────────────────────────────────────────────────────────────

export const DbUserClientRowSchema = z.object({
  client_id: z.string().min(1),
})

export const DbUserClientMapRowSchema = z.object({
  user_id: z.string().min(1),
  client_id: z.string().min(1),
})
