import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (cache unused data for 30m)
      retry: 2, // Retry failed requests twice
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;
