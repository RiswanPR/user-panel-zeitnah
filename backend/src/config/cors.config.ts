/**
 * Centralized CORS & Origin Configuration for HTTP and WebSocket Gateways
 * Ensures consistent allowlist enforcement across Web, Mobile (Capacitor), and Local Dev.
 */

export function getAllowedOrigins(): string[] {
  const configuredUrls = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((val) => val.split(',').map((origin) => origin.trim()));

  const defaultOrigins = [
    'https://zeitnahacademy.com',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
  ];

  if (process.env.NODE_ENV !== 'production') {
    defaultOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    );
  }

  return Array.from(
    new Set([...configuredUrls, ...defaultOrigins].filter(Boolean)),
  );
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (such as mobile native apps, curl, server-to-server)
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Allow localhost ports in development
  if (process.env.NODE_ENV !== 'production') {
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('https://localhost:')
    ) {
      return true;
    }
  }

  return false;
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
}

export const socketCorsConfig = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Disallowed by WebSocket CORS allowlist'), false);
    }
  },
  credentials: true,
};
