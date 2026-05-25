import type { Member } from '@/hooks/infra/useSupabase'
import type { PendingAuthUser } from '../../hooks/useAdminData'
import type { DbClientRow } from '@/types/db'

export interface GoogleUser {
  id: string
  email: string
  avatarUrl: string | null
  name: string
}

export interface UsersPanelProps {
  users: Member[]
  clients: DbClientRow[]
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  onCreate: (
    name: string,
    role: string,
    authUserId?: string | null,
    accessRole?: 'admin' | 'user',
    clientIds?: string[],
    email?: string | null,
    avatarUrl?: string | null
  ) => Promise<boolean>
  onUpdate: (userId: string, name: string, role: string, email?: string | null, capacity?: number | null) => Promise<boolean>
  onSetAuthId: (userId: string, authUserId: string | null, avatarUrl?: string | null) => Promise<boolean>
  onListGoogleUsers: (search?: string) => Promise<GoogleUser[]>
  onDeactivate: (userId: string) => Promise<boolean>
  onReactivate: (userId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>
  pendingUsers: PendingAuthUser[]
}

export type ValidationErrors = { name?: string; role?: string; email?: string }
export type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated'
export type CurrentTab = 'members' | 'pending'

export const ROLE_SUGGESTIONS = [
  'Diretor de Arte', 'Redator', 'Designer Gráfico', 'Designer Motion', 'Editor de Vídeo',
  'Fotógrafo', 'Ilustrador', 'UX Designer', 'UI Designer', 'Product Designer',
  'Social Media', 'Content Creator', 'Copywriter', 'Community Manager',
  'Planejamento', 'Estratégia', 'Branding', 'Analista de Branding',
  'Mídia', 'Analista de Mídia', 'Analista de Performance', 'Analista de Tráfego',
  'Gestor de Tráfego', 'Especialista em Ads',
  'Atendimento', 'Account Executive', 'Account Manager', 'Gerente de Contas',
  'Diretor de Contas', 'Customer Success',
  'Gestor de Projetos', 'Project Manager', 'Scrum Master', 'Produtor',
  'Produtor Executivo', 'Coordenador de Projetos', 'Head de Operações',
  'Diretor de Criação', 'Diretor de Marketing', 'Head de Criação', 'Head de Mídia',
  'Head de Conteúdo', 'Head de Performance', 'Gerente de Marketing',
  'Gerente de Projetos', 'Gerente de Mídia',
  'Front-end Developer', 'Back-end Developer', 'Full Stack Developer',
  'Web Developer', 'Mobile Developer', 'Tech Lead', 'CTO', 'QA / Tester', 'DevOps',
  'Analista de Dados', 'BI Analyst', 'Data Scientist',
  'Estagiário de Criação', 'Estagiário de Marketing', 'Estagiário de Mídia',
  'Estagiário de Social Media', 'Estagiário de Design', 'Estagiário de Desenvolvimento',
  'Assistente de Marketing', 'Assistente de Atendimento', 'Assistente de Mídia',
]

export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const
export const PAGE_SIZE = 15
