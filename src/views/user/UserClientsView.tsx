import { Globe, Building2, Users, FileText, Key, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import type { ClientOption } from '@/contexts/AuthContext'

interface UserClientsViewProps {
  client: ClientOption | null
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? <span className="text-muted-foreground/50 italic">Não definido</span>}</span>
    </div>
  )
}

function PlaceholderSection({ icon: Icon, title, description }: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card className="opacity-60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground italic">Em breve</p>
      </CardContent>
    </Card>
  )
}

export function UserClientsView({ client }: UserClientsViewProps) {
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Building2 className="w-10 h-10 opacity-30" />
        <p className="text-lg font-medium">Nenhum cliente selecionado</p>
        <p className="text-sm">Selecione um cliente no menu superior para ver os detalhes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Informações e configurações do cliente.</p>
      </div>

      {/* Informações gerais */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Geral</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <InfoRow label="Nome" value={client.name} />
          <InfoRow label="Domínio" value={client.slug ? `/${client.slug}` : null} />
        </CardContent>
      </Card>

      {/* Seções futuras */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderSection
          icon={Users}
          title="Gerente"
          description="Responsável pelo cliente"
        />
        <PlaceholderSection
          icon={Mail}
          title="Contactos"
          description="Emails e contactos do cliente"
        />
        <PlaceholderSection
          icon={Key}
          title="Acessos"
          description="Credenciais e acessos associados"
        />
        <PlaceholderSection
          icon={Globe}
          title="Contas"
          description="Contas de serviços e plataformas"
        />
        <PlaceholderSection
          icon={FileText}
          title="Documentação"
          description="Documentos e referências do cliente"
        />
      </div>
    </div>
  )
}
