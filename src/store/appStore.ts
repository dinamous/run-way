/**
 * Compatibilidade: re-exporta useDataStore como useAppStore.
 * Consumers existentes (views, useSupabase) continuam funcionando sem alteração.
 * Novos consumers devem usar useDataStore ou useClientStore diretamente.
 */
export { useDataStore as useAppStore } from './useDataStore'
