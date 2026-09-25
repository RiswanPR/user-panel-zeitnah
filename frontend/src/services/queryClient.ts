import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (cache unused data for 30m)
      retry: (failureCount, error: any) => {
        const status = error?.response?.status || error?.status;
        // Never retry auth errors (handled by axios interceptor), forbidden, or not found
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        const status = error?.response?.status || error?.status;
        // Never retry client errors (4xx: 400 Bad Request, 401, 403, 404, 409, 422, etc.)
        if (!status || (status >= 400 && status < 500)) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

export default queryClient;
