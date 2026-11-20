import type { Request } from 'express';
import * as net from 'net';
import proxyAddr from 'proxy-addr';

/**
 * Centralized Trust Proxy & Client IP Configuration
 *
 * Defines explicit trusted reverse proxy boundaries to prevent IP spoofing,
 * rate-limit bypasses, and audit trail pollution.
 */

export const CLOUDFLARE_IPV4_SUBNETS: readonly string[] = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

export const CLOUDFLARE_IPV6_SUBNETS: readonly string[] = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

let compiledCfMatcher: ((addr: string) => boolean) | null = null;

/**
 * Checks whether an incoming IP address belongs to verified Cloudflare origin edge subnets.
 */
export function isCloudflareOriginIp(ip?: string | null): boolean {
  if (!ip) return false;
  const cleanIp = normalizeIp(ip);
  if (!net.isIP(cleanIp)) return false;

  if (!compiledCfMatcher) {
    compiledCfMatcher = proxyAddr.compile([
      ...CLOUDFLARE_IPV4_SUBNETS,
      ...CLOUDFLARE_IPV6_SUBNETS,
    ]);
  }

  try {
    return compiledCfMatcher(cleanIp);
  } catch {
    return false;
  }
}

/**
 * Validates and derives the Express "trust proxy" configuration.
 *
 * Rejects unsafe unconditional trust ("true") in production environments.
 * Supports explicit hop count (e.g., 1), custom CIDR arrays, or secure private defaults.
 */
export function getTrustProxyConfig(): boolean | number | string | string[] {
  const envValue = process.env.TRUST_PROXY?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Explicit disable
  if (envValue === 'false' || envValue === '0') {
    return false;
  }

  // 2. Reject unconditional true in production (causes complete rate-limit & IP spoofing vulnerability)
  if (envValue === 'true') {
    if (isProduction) {
      throw new Error(
        '[ProxyConfig] CRITICAL SECURITY CONFIGURATION ERROR: "TRUST_PROXY=true" is disallowed in production. ' +
          'Unconditional proxy trust allows any remote client to spoof X-Forwarded-For headers and bypass security controls. ' +
          'Configure TRUST_PROXY to an explicit hop count (e.g. "1") or verified reverse proxy CIDR subnets.',
      );
    }
    // In local non-production environments, warn and fall back to local subnets
    console.warn(
      '[ProxyConfig] WARNING: TRUST_PROXY="true" is unsafe. Constraining to local subnets.',
    );
    return ['loopback', 'linklocal', 'uniquelocal'];
  }

  // 3. Explicit numeric hop count (e.g. "1" for single reverse proxy / ALB / Nginx / Ingress)
  if (envValue && /^\d+$/.test(envValue)) {
    const hops = parseInt(envValue, 10);
    if (hops > 0) {
      return hops;
    }
  }

  // 4. Explicit custom CIDR/subnet list
  if (envValue) {
    const list = envValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) {
      return list;
    }
  }

  // 5. Default constrained configuration
  if (isProduction) {
    console.warn(
      '[ProxyConfig] PRODUCTION ADVISORY: TRUST_PROXY is not explicitly configured in production. ' +
        'Defaulting to private subnets (loopback, linklocal, uniquelocal). ' +
        'If deployed behind a single reverse proxy (ALB, Nginx, Ingress), set TRUST_PROXY=1 for optimal security.',
    );
  }

  return ['loopback', 'linklocal', 'uniquelocal'];
}

export function isValidIp(ip?: string | null): boolean {
  if (!ip) return false;
  return net.isIP(normalizeIp(ip)) !== 0;
}

export function normalizeIp(ip?: string | null): string {
  if (!ip) return '';
  let normalized = ip.split(',')[0].trim();
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.replace('::ffff:', '');
  }
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(normalized)) {
    normalized = normalized.replace(/:\d+$/, '');
  }
  return normalized;
}

export function getTrustedClientIp(req: Request): string {
  // If behind Cloudflare and TRUST_CLOUDFLARE is explicitly enabled
  if (process.env.TRUST_CLOUDFLARE === 'true') {
    const socketAddress = req.socket?.remoteAddress || '';
    const trustProxyFn = req.app?.get('trust proxy fn');
    const isSocketTrustedProxy =
      typeof trustProxyFn === 'function'
        ? trustProxyFn(socketAddress, 0)
        : false;

    // Cloudflare header is ONLY trusted if:
    // 1. Direct connection from verified Cloudflare IP range, OR
    // 2. Incoming socket is verified trusted upstream proxy (e.g. Nginx configured behind Cloudflare)
    if (isSocketTrustedProxy || isCloudflareOriginIp(socketAddress)) {
      const cfIp =
        req.headers['cf-connecting-ip'] || req.headers['true-client-ip'];
      const rawCf = Array.isArray(cfIp) ? cfIp[0] : cfIp;
      if (rawCf && typeof rawCf === 'string' && rawCf.trim()) {
        const normalizedCf = normalizeIp(rawCf);
        if (isValidIp(normalizedCf)) {
          return normalizedCf;
        }
      }
    }
  }

  // Authoritative verified IP computed by Express based on configured trust-proxy boundary
  const resolvedIp = req.ip || req.socket?.remoteAddress || '';
  return normalizeIp(resolvedIp);
}
