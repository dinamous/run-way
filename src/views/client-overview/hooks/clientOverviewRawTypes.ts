// Raw types coming directly from Supabase joins

export interface RawMember {
  id: string
  name: string
  role: string
  avatar_url: string | null
  capacity: number | null
}

export interface RawSubtaskAssignee {
  member_id: string
  members: RawMember | null
}

export interface RawSubtask {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  subtask_assignees: RawSubtaskAssignee[]
}

export interface RawTask {
  id: string
  title: string
  clickup_link: string | null
  concluded_at: string | null
  created_at: string
  task_subtasks: RawSubtask[] | null
}
