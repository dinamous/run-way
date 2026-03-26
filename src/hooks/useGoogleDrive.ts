import { useState, useCallback } from 'react';

const FILE_NAME = 'capacity-tasks.json';
const FOLDER_PATH = ['Projeto web', 'dados'];
const MIME_FOLDER = 'application/vnd.google-apps.folder';
const MIME_JSON = 'application/json';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

async function getUserDomain(token: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v2/userinfo`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const info = await res.json();
  const email: string = info.email ?? '';
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : null;
}

async function findOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
  const parentQuery = parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`;
  const q = `name='${name}' and mimeType='${MIME_FOLDER}' and trashed=false${parentQuery}`;
  const res = await fetch(`${FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files?.length) return data.files[0].id as string;

  const body: Record<string, unknown> = { name, mimeType: MIME_FOLDER };
  if (parentId) body.parents = [parentId];
  const create = await fetch(FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const folder = await create.json();
  return folder.id as string;
}

async function resolveFolderPath(token: string, path: string[]): Promise<string> {
  let parentId: string | undefined;
  for (const segment of path) {
    parentId = await findOrCreateFolder(token, segment, parentId);
  }
  return parentId!;
}

async function findFile(token: string, folderId: string): Promise<string | null> {
  const q = `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  const res = await fetch(`${FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function readFile(token: string, fileId: string): Promise<unknown> {
  const res = await fetch(`${FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function shareWithDomain(token: string, fileId: string, domain: string): Promise<void> {
  await fetch(`${FILES_URL}/${fileId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'domain', role: 'writer', domain }),
  });
}

async function writeFile(token: string, folderId: string, content: object, fileId?: string | null, domain?: string | null): Promise<string> {
  const body = JSON.stringify(content);
  const metadata: Record<string, unknown> = { name: FILE_NAME, mimeType: MIME_JSON };
  if (!fileId) metadata.parents = [folderId];

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([body], { type: MIME_JSON }));

  const url = fileId
    ? `${UPLOAD_URL}/${fileId}?uploadType=multipart`
    : `${UPLOAD_URL}?uploadType=multipart`;

  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const file = await res.json();

  if (!fileId && domain) {
    await shareWithDomain(token, file.id, domain);
  }

  return file.id as string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useGoogleDrive() {
  const [token, setToken] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const load = useCallback(async (accessToken: string) => {
    setSyncStatus('syncing');
    try {
      const [resolvedFolder, userDomain] = await Promise.all([
        resolveFolderPath(accessToken, FOLDER_PATH),
        getUserDomain(accessToken),
      ]);
      setFolderId(resolvedFolder);
      setDomain(userDomain);

      const id = await findFile(accessToken, resolvedFolder);
      setFileId(id);

      if (id) {
        const data = await readFile(accessToken, id);
        setSyncStatus('success');
        return data;
      }
      setSyncStatus('success');
      return null;
    } catch {
      setSyncStatus('error');
      return null;
    }
  }, []);

  const save = useCallback(async (data: object) => {
    if (!token || !folderId) return;
    setSyncStatus('syncing');
    try {
      const id = await writeFile(token, folderId, data, fileId, fileId ? null : domain);
      if (!fileId) setFileId(id);
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    }
  }, [token, folderId, fileId, domain]);

  const login = useCallback((accessToken: string) => {
    setToken(accessToken);
  }, []);

  return { token, syncStatus, login, load, save };
}
