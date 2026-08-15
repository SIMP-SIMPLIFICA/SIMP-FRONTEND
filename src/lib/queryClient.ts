import { QueryClient } from "@tanstack/react-query";

/**
 * Instância única do QueryClient.
 *
 * Extraída do main.tsx para poder ser importada fora da árvore React — em
 * particular pelo interceptor de `api.ts`, que precisa limpar o cache quando a
 * organização é suspensa, garantindo que nenhum dado da sessão bloqueada
 * permaneça em memória.
 */
export const queryClient = new QueryClient();
