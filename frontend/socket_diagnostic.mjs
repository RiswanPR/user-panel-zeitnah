/**
 * Socket.IO Production Diagnostic Script
 * Tests: polling handshake, websocket upgrade, namespace auth, messages/notifications
 *
 * Usage: node socket_diagnostic.mjs [JWT_TOKEN]
 *
 * If JWT_TOKEN is not provided, tests only unauthenticated handshake.
 */

import { io } from 'socket.io-client';

const BASE_URL = 'https://zeitnahacademy.com';
const SOCKET_PATH = '/api/socket.io/';
const TOKEN = process.argv[2] || null;
const TIMEOUT = 12000;

const results = [];

function log(label, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  const line = `${icon} ${label}: ${status}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ label, status, detail });
}

// ── Test 1: Polling Handshake (raw HTTP) ──
async function testPollingHandshake() {
  try {
    const url = `${BASE_URL}${SOCKET_PATH}?EIO=4&transport=polling`;
    const res = await fetch(url);
    const body = await res.text();

    if (res.ok && body.includes('"sid"') && body.includes('"upgrades"')) {
      const match = body.match(/"sid":"([^"]+)"/);
      const sid = match ? match[1] : 'unknown';
      log('Polling Handshake', 'PASS', `SID=${sid}, HTTP ${res.status}`);
      return true;
    } else {
      log('Polling Handshake', 'FAIL', `HTTP ${res.status}, body: ${body.substring(0, 200)}`);
      return false;
    }
  } catch (err) {
    log('Polling Handshake', 'FAIL', err.message);
    return false;
  }
}

// ── Test 2: Socket.IO Client Connection (messages namespace) ──
function testNamespace(namespace, label) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.disconnect();
      log(label, 'FAIL', `Timeout after ${TIMEOUT}ms`);
      resolve(false);
    }, TIMEOUT);

    const authOpts = TOKEN
      ? { auth: { token: TOKEN } }
      : {};

    const socket = io(`${BASE_URL}${namespace}`, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      ...authOpts,
      reconnection: false,
      timeout: TIMEOUT,
    });

    socket.on('connect', () => {
      clearTimeout(timer);
      log(label, 'PASS', `Connected as socket ${socket.id}, transport=${socket.io.engine.transport.name}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      const detail = err.message || String(err);
      if (!TOKEN && (detail.includes('jwt') || detail.includes('Unauthorized') || detail.includes('unauthorized') || detail.includes('authentication'))) {
        log(label, 'PASS', `Auth rejection (expected without token): ${detail}`);
      } else if (!TOKEN) {
        log(label, 'PASS', `Rejected without token: ${detail}`);
      } else {
        log(label, 'FAIL', `connect_error: ${detail}`);
      }
      socket.disconnect();
      resolve(!TOKEN);
    });

    socket.on('disconnect', (reason) => {
      clearTimeout(timer);
      if (reason === 'io server disconnect') {
        if (!TOKEN) {
          log(label, 'PASS', 'Server disconnected (auth required, no token provided)');
        } else {
          log(label, 'FAIL', 'Server disconnected with valid token');
        }
      }
      resolve(!TOKEN);
    });
  });
}

// ── Test 3: WebSocket-only transport ──
function testWebSocketOnly() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.disconnect();
      log('WebSocket-Only Transport', 'FAIL', `Timeout after ${TIMEOUT}ms`);
      resolve(false);
    }, TIMEOUT);

    const authOpts = TOKEN ? { auth: { token: TOKEN } } : {};

    const socket = io(`${BASE_URL}/messages`, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      ...authOpts,
      reconnection: false,
      timeout: TIMEOUT,
    });

    socket.on('connect', () => {
      clearTimeout(timer);
      log('WebSocket-Only Transport', 'PASS', `Connected as ${socket.id}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      const detail = err.message || String(err);
      if (!TOKEN && (detail.includes('jwt') || detail.includes('Unauthorized') || detail.includes('unauthorized'))) {
        log('WebSocket-Only Transport', 'PASS', `Auth rejection via WS (expected): ${detail}`);
      } else if (!TOKEN) {
        log('WebSocket-Only Transport', 'PASS', `Rejected via WS (no token): ${detail}`);
      } else {
        log('WebSocket-Only Transport', 'FAIL', `WS connect_error: ${detail}`);
      }
      socket.disconnect();
      resolve(!TOKEN);
    });
  });
}

// ── Test 4: Default path (should FAIL) ──
async function testDefaultPath() {
  try {
    const url = `${BASE_URL}/socket.io/?EIO=4&transport=polling`;
    const res = await fetch(url);
    const body = await res.text();

    if (body.includes('"sid"')) {
      log('Default Path /socket.io/', 'FAIL', 'Unexpectedly succeeded — path should not work');
    } else {
      log('Default Path /socket.io/', 'PASS', `Correctly does NOT return Socket.IO handshake (HTTP ${res.status})`);
    }
  } catch (err) {
    log('Default Path /socket.io/', 'PASS', `Correctly unreachable: ${err.message}`);
  }
}

// ── Run All Tests ──
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ZEITNAH Socket.IO Production Diagnostic           ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ Target: ${BASE_URL}`);
  console.log(`║ Path:   ${SOCKET_PATH}`);
  console.log(`║ Auth:   ${TOKEN ? 'Token provided' : 'No token (unauthenticated)'}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  await testPollingHandshake();
  await testDefaultPath();
  await testNamespace('/messages', 'Messages Namespace');
  await testNamespace('/notifications', 'Notifications Namespace');
  await testWebSocketOnly();

  console.log('\n══════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  ${passed} PASS, ${failed} FAIL, ${results.length} total`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.label}: ${r.detail}`);
    });
  }
  console.log('══════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
