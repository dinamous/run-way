import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import type { DbClientRow } from '@/types/db'

interface ClientsPanelProps {
  clients: DbClientRow[]
  onCreate: (name: string, slug: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onImpersonate: (clientId: string | null) => void
  impersonatedClientId: string | null
}

export function ClientsPanel({
  clients, onCreate, onDelete, onImpersonate, impersonatedClientId
}: ClientsPanelProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return
    const ok = await onCreate(name.trim(), slug.trim())
    if (ok) { toast.success(`Cliente "${name}" criado`); setName(''); setSlug('') }
    else toast.error('Erro ao criar cliente')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Clientes</h2>

      {/* Formulário de criação */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Nome do cliente"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="Slug (ex: empresa-x)"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-40"
        />
        <Button onClick={handleCreate} size="sm">Criar cliente</Button>
      </div>

      {/* Lista */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Slug</th>
            <th className="py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{c.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{c.slug}</td>
              <td className="py-2 flex gap-2">
                <Button
                  size="sm"
                  variant={impersonatedClientId === c.id ? 'primary' : 'outline'}
                  onClick={() => onImpersonate(impersonatedClientId === c.id ? null : c.id)}
                >
                  {impersonatedClientId === c.id ? 'Sair da visão' : 'Visualizar como'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!confirm(`Eliminar cliente "${c.name}"?`)) return
                    const ok = await onDelete(c.id)
                    if (!ok) toast.error('Erro ao eliminar cliente')
                  }}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
