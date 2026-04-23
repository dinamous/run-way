import type { ClientOption } from "@/contexts/AuthContext"

export function clientToSlug(client: ClientOption): string {
  return client.slug ?? nameToSlug(client.name)
}

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function slugToClient(
  slug: string,
  clients: ClientOption[]
): ClientOption | undefined {
  return clients.find((c) => clientToSlug(c) === slug)
}
