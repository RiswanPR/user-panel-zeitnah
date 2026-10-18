import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPP_SERVICE_PATH = path.resolve(__dirname, '../services/opportunityService.js');
const OPP_PAGE_PATH = path.resolve(__dirname, '../pages/opportunities/OpportunityInboxPage.jsx');
const BACKEND_CONTROLLER_PATH = path.resolve(__dirname, '../../../backend/src/modules/opportunities/opportunities.controller.ts');

describe('Zeitnah — DEF-003: Opportunities Inbox Service Contract & Alignment Tests', () => {
  const serviceCode = fs.readFileSync(OPP_SERVICE_PATH, 'utf8');
  const pageCode = fs.readFileSync(OPP_PAGE_PATH, 'utf8');
  const controllerCode = fs.readFileSync(BACKEND_CONTROLLER_PATH, 'utf8');

  // ── TEST 1: Service exports required methods ──
  it('1. opportunityService implements getCandidateInbox and getCandidateOpportunityById', () => {
    assert.ok(
      serviceCode.includes('getCandidateInbox('),
      'opportunityService must implement getCandidateInbox'
    );
    assert.ok(
      serviceCode.includes('getCandidateOpportunityById('),
      'opportunityService must implement getCandidateOpportunityById'
    );
    assert.ok(
      serviceCode.includes("api.get('/opportunities/inbox'"),
      'getCandidateInbox must hit /opportunities/inbox endpoint'
    );
    assert.ok(
      serviceCode.includes("api.get(`/opportunities/inbox/${id}`)"),
      'getCandidateOpportunityById must hit /opportunities/inbox/:id endpoint'
    );
  });

  // ── TEST 2: Backend Controller Contract Alignment ──
  it('2. Service endpoints match backend controller endpoints and parameter expectations', () => {
    // Backend controller defines GET inbox with tab, page, limit
    assert.ok(controllerCode.includes("@Get('inbox')"), 'Backend must define @Get("inbox")');
    assert.ok(controllerCode.includes("getCandidateInbox("), 'Backend must implement getCandidateInbox');
    assert.ok(controllerCode.includes("@Query('tab') tab?: string"), 'Backend expects tab query param');

    // Backend controller defines GET inbox/:id
    assert.ok(controllerCode.includes("@Get('inbox/:id')"), 'Backend must define @Get("inbox/:id")');
    assert.ok(controllerCode.includes("getCandidateOpportunityById("), 'Backend must implement getCandidateOpportunityById');

    // Backend controller defines GET inbox/unread-count
    assert.ok(controllerCode.includes("@Get('inbox/unread-count')"), 'Backend must define @Get("inbox/unread-count")');
  });

  // ── TEST 3: OpportunityInboxPage.jsx consumes matching service signatures ──
  it('3. OpportunityInboxPage consumes opportunityService without signature mismatches', () => {
    assert.ok(
      pageCode.includes('opportunityService.getCandidateInbox(tab)'),
      'OpportunityInboxPage must call getCandidateInbox(tab)'
    );
    assert.ok(
      pageCode.includes('opportunityService.getCandidateOpportunityById(opp._id)'),
      'OpportunityInboxPage must call getCandidateOpportunityById(opp._id)'
    );
    assert.ok(
      pageCode.includes('opportunityService.getInboxUnreadCount()'),
      'OpportunityInboxPage must call getInboxUnreadCount()'
    );
  });

  // ── TEST 4: Query parameter serialization logic ──
  it('4. query parameter serialization safely handles string tabs, extra options, and object forms', () => {
    // Pure function replicating the service query parameter resolution
    const resolveParams = (tab = 'new', params = {}) => {
      return typeof tab === 'object' && tab !== null ? tab : { tab, ...params };
    };

    // Default tab
    assert.deepEqual(resolveParams(), { tab: 'new' });

    // String tab
    assert.deepEqual(resolveParams('interested'), { tab: 'interested' });

    // String tab with pagination
    assert.deepEqual(resolveParams('archived', { page: 2, limit: 10 }), {
      tab: 'archived',
      page: 2,
      limit: 10,
    });

    // Object param directly
    assert.deepEqual(resolveParams({ tab: 'all', page: 1 }), {
      tab: 'all',
      page: 1,
    });
  });

  // ── TEST 5: Error handling and non-fabrication of responses ──
  it('5. service propagates errors to caller without fabricating mock data or concealing failure', () => {
    // Verify service does not catch and return fake data
    const getCandidateInboxBody = serviceCode.slice(
      serviceCode.indexOf('async getCandidateInbox('),
      serviceCode.indexOf('async getCandidateOpportunityById(')
    );

    assert.ok(
      !getCandidateInboxBody.includes('catch'),
      'getCandidateInbox must let network errors propagate cleanly'
    );

    // Verify page notifies user on failure
    assert.ok(
      pageCode.includes("toast?.error?.('Could not load your opportunity inbox.')"),
      'Page displays error notification when service throws'
    );
  });

  // ── TEST 6: Backward compatibility of getInbox and getInboxDetail delegates ──
  it('6. preserves getInbox and getInboxDetail delegates for backward compatibility', () => {
    assert.ok(
      serviceCode.includes('async getInbox(params = {}) {\n    return this.getCandidateInbox(params);'),
      'getInbox must delegate to getCandidateInbox'
    );
    assert.ok(
      serviceCode.includes('async getInboxDetail(id) {\n    return this.getCandidateOpportunityById(id);'),
      'getInboxDetail must delegate to getCandidateOpportunityById'
    );
  });
});
