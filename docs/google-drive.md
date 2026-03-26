# Integração Google Drive

## Visão Geral

O hook `useGoogleDrive` (`src/hooks/useGoogleDrive.ts`) encapsula toda a interação com a Google Drive API v3 via REST, usando o token de acesso OAuth 2.0 obtido com `@react-oauth/google`.

## Fluxo de Autenticação

1. Utilizador clica "Conectar Drive"
2. `useGoogleLogin` abre o popup OAuth do Google
3. Ao sucesso, `onSuccess` recebe `res.access_token`
4. `login(token)` guarda o token em state
5. `load(token)` é chamado imediatamente para carregar os dados existentes

## Scopes OAuth Necessários

```
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/userinfo.email
```

O scope `userinfo.email` é necessário para obter o domínio do utilizador e partilhar o ficheiro com a organização.

## Estrutura de Ficheiros no Drive

```
My Drive/
└── Projeto web/
    └── dados/
        └── capacity-tasks.json
```

As pastas são criadas automaticamente se não existirem.

## Funções Internas

### `getUserDomain(token)`
Chama `oauth2/v2/userinfo` e extrai o domínio do email (ex: `empresa.com`). Retorna `null` para contas Gmail pessoais.

### `findOrCreateFolder(token, name, parentId?)`
Procura uma pasta por nome no pai especificado. Se não existir, cria-a.

### `resolveFolderPath(token, path[])`
Percorre recursivamente um array de nomes de pasta, criando cada nível se necessário. Retorna o ID da pasta final.

### `findFile(token, folderId)`
Procura `capacity-tasks.json` na pasta especificada. Retorna o ID do ficheiro ou `null`.

### `readFile(token, fileId)`
Faz download do conteúdo do ficheiro via `?alt=media`. Retorna o JSON parseado.

### `shareWithDomain(token, fileId, domain)`
Cria uma permissão `type: 'domain', role: 'writer'` para que todos os utilizadores do mesmo domínio Google Workspace possam aceder.

### `writeFile(token, folderId, content, fileId?, domain?)`
- **Criar:** `POST` para `upload/drive/v3/files?uploadType=multipart`
- **Atualizar:** `PATCH` para `upload/drive/v3/files/{fileId}?uploadType=multipart`
- Ao criar pela primeira vez, partilha com o domínio (se disponível)

## Estados de Sync

| Estado | Descrição | Ícone |
|--------|-----------|-------|
| `idle` | Sem operação em curso | — |
| `syncing` | A carregar ou guardar | Spinner azul |
| `success` | Operação concluída | Check verde |
| `error` | Erro na operação | Alerta vermelho |

## Variável de Ambiente

```
VITE_GOOGLE_CLIENT_ID=...
```

Obtido na [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID.

**Origens autorizadas:** adicionar `http://localhost:5173` para desenvolvimento e o domínio de produção.

## Formato do JSON Guardado

```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Nome da demanda",
      "clickupLink": "https://...",
      "assignee": "member-id",
      "status": "em andamento",
      "phases": {
        "design":   { "start": "2025-01-01", "end": "2025-01-07" },
        "approval": { "start": "2025-01-08", "end": "2025-01-10" },
        "dev":      { "start": "2025-01-13", "end": "2025-01-21" },
        "qa":       { "start": "2025-01-22", "end": "2025-01-24" }
      },
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "members": [...],
  "lastSync": "2025-01-01T10:00:00.000Z"
}
```
