/**
 * Tipos relacionados com membros da equipa.
 *
 * `Member` é definido em `useSupabase` porque é devolvido pelo hook;
 * re-exportamos aqui para acesso centralizado via `src/types`.
 */

export type { Member } from '../hooks/useSupabase';
