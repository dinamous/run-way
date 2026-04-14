import { ScanSearch } from 'lucide-react'
import type React from 'react'

export type Tool = {
  id: string
  title: string
  description: string
  icon: React.ElementType
}

export type ViewState = 'loading' | 'empty' | 'error' | 'success'

export const MOCK_TOOLS: Tool[] = [
  // {
  //   id: 'link-shortener',
  //   title: 'Encurtador de Link',
  //   description: 'Gere links curtos e rastreáveis para suas campanhas.',
  //   icon: LinkIcon,
  // },
  // {
  //   id: 'briefing',
  //   title: 'Gerador de Briefing',
  //   description: 'Crie briefings estruturados para novos projetos rapidamente.',
  //   icon: FileText,
  // },
  // {
  //   id: 'utm',
  //   title: 'Gerador de UTM',
  //   description: 'Monte parâmetros UTM para rastrear suas campanhas de marketing.',
  //   icon: BarChart,
  // },
  // {
  //   id: 'json',
  //   title: 'Validador de JSON',
  //   description: 'Valide e formate estruturas JSON de forma simples.',
  //   icon: Code,
  // },
  // {
  //   id: 'campaign-name',
  //   title: 'Nome de Campanha',
  //   description: 'Gere nomes padronizados para campanhas seguindo convenções internas.',
  //   icon: Sparkles,
  // },
  {
    id: 'briefing-analyzer',
    title: 'Analisador de Briefing',
    description: 'Cole um briefing desestruturado e gere automaticamente o escopo técnico para o time.',
    icon: ScanSearch,
  },
]
