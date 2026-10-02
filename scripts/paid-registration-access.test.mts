import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canContinuePaidAccount} from '../src/lib/paidRegistrationAccess.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { formatMembershipTermDate } from '../src/app/join/formatMembershipTermDate.ts';
import type { RegistrationStatusData } from '../src/app/join/registration/RegistrationSummary.tsx';
const state={captured:true,entitlementActive:true,paidThrough:'2026-12-31',admissionState:'approved'};
test('active paid membership can continue account setup',()=>assert.equal(canContinuePaidAccount(state),true));
test('partial refund does not independently remove account continuation',()=>assert.equal(canContinuePaidAccount({...state,refundStatus:'partial',refundedAmountMinor:2500} as typeof state),true));
test('full refund remains separate from authorized membership disposition',()=>assert.equal(canContinuePaidAccount({...state,refundStatus:'full',refundedAmountMinor:7500} as typeof state),true));
test('expired paid term may securely attach history without granting current access',()=>assert.equal(canContinuePaidAccount({...state,entitlementActive:false}),true));
test('uncaptured payment cannot continue',()=>assert.equal(canContinuePaidAccount({...state,captured:false}),false));
test('unsupported term exception cannot continue',()=>assert.equal(canContinuePaidAccount({...state,admissionState:'term_exception'}),false));

test('authorized membership removal blocks chapter-access continuation',()=>assert.equal(canContinuePaidAccount({...state,organizationMembershipState:'removed'}),false));

// Render the isolated presentation component with the project's existing React
// and TypeScript runtimes; no browser, API, or payment mutation is involved.
const viewSource = readFileSync(new URL('../src/app/join/registration/RegistrationSummary.tsx', import.meta.url), 'utf8');
const compiledView = ts.transpileModule(viewSource, {
 compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const viewModule = { exports: {} } as { exports: typeof import('../src/app/join/registration/RegistrationSummary.tsx') };
new Function('require', 'module', 'exports', compiledView)(createRequire(import.meta.url), viewModule, viewModule.exports);
const styles = new Proxy({} as Record<string, string>, { get: (_, key) => String(key) });
const registration: RegistrationStatusData = {
 ...state, registrationId: 'test-registration', applicationReference: 'BCF-TEST',
 paymentState: 'captured', accountConnected: false,
};
function renderRegistration(overrides: Partial<RegistrationStatusData> = {}, options: { missing?: boolean; busy?: boolean; message?: string } = {}) {
 const status = options.missing ? null : { ...registration, ...overrides };
 return renderToStaticMarkup(createElement(viewModule.exports.RegistrationSummary, {
  status, message: options.message ?? '', busy: options.busy ?? false,
  canContinueAccount: Boolean(status && canContinuePaidAccount(status)),
  paidThroughLabel: formatMembershipTermDate(status?.paidThrough), styles,
  onCheckout: () => {}, onCheckStatus: () => {},
  returnToApplication: createElement('a', { href: '/join' }, 'Return to application'),
 }));
}

test('unpaid registration has neutral progress and one secure checkout action', () => {
 const html = renderRegistration({ captured: false, entitlementActive: false, paidThrough: null, paymentState: 'checkout_open', admissionState: 'submitted' });
 assert.match(html, /Registration in progress/);
 assert.match(html, /checkout open/);
 assert.match(html, /Continue to secure checkout/);
 assert.doesNotMatch(html, /registrationPaid|registrationWarning|Finish membership setup|Open Brew City FOOLS/);
 assert.equal((html.match(/class="submitButton"/g) ?? []).length, 1);
 assert.match(html, /Check status/);
 assert.match(html, /Return to application/);
});

test('paid registration promotes setup and a human-readable server term', () => {
 const html = renderRegistration({ paidThrough: '2027-04-30' });
 assert.match(html, /registrationPaid/);
 assert.match(html, /Membership active/);
 assert.match(html, /Finish membership setup/);
 assert.match(html, /href="\/api\/membership-registration-account"/);
 assert.match(html, /April 30, 2027/);
 assert.doesNotMatch(html, /2027-04-30|registrationWarning|Continue to secure checkout/);
 assert.equal((html.match(/class="submitButton"/g) ?? []).length, 1);
});

test('linked account opens the chapter through the existing validated account route', () => {
 const html = renderRegistration({ accountConnected: true, admissionState: 'account_linked' });
 assert.match(html, /Open Brew City FOOLS/);
 assert.match(html, /href="\/api\/membership-registration-account"/);
 assert.doesNotMatch(html, /Finish membership setup|Continue to secure checkout/);
});

test('term exception warns and has no payment or account primary action', () => {
 const html = renderRegistration({ captured: false, entitlementActive: false, admissionState: 'term_exception' });
 assert.match(html, /registrationWarning/);
 assert.match(html, /Payment needs review/);
 assert.match(html, /membership term review/);
 assert.doesNotMatch(html, /class="submitButton"/);
});

test('refund review preserves independently authorized account continuation', () => {
 const html = renderRegistration({ refundedAmountMinor: 2500, refundStatus: 'partial' });
 assert.match(html, /registrationWarning/);
 assert.match(html, /refund or payment dispute/);
 assert.match(html, /Finish membership setup/);
});

test('payment dispute renders review guidance', () => {
 const html = renderRegistration({ disputeStatus: 'needs_response' });
 assert.match(html, /registrationWarning/);
 assert.match(html, /Payment needs review/);
});

test('removed membership warns without offering chapter access', () => {
 const html = renderRegistration({ accountConnected: true, organizationMembershipState: 'removed' });
 assert.match(html, /registrationWarning/);
 assert.match(html, /Membership removed/);
 assert.doesNotMatch(html, /class="submitButton"|Open Brew City FOOLS/);
});

test('historical paid registration keeps setup without claiming active membership', () => {
 const html = renderRegistration({ entitlementActive: false });
 assert.match(html, /Payment received/);
 assert.match(html, /Finish membership setup/);
 assert.doesNotMatch(html, /Membership active|Continue to secure checkout/);
});

test('loading and unavailable status retain subdued recovery actions', () => {
 const html = renderRegistration({}, { missing: true, busy: true, message: 'Unable to confirm registration right now.' });
 assert.match(html, /role="status"/);
 assert.match(html, /Unable to confirm/);
 assert.match(html, /<button disabled=""/);
 assert.match(html, /Return to application/);
 assert.doesNotMatch(html, /class="submitButton"|registrationWarning/);
});

test('emergency pause hides new checkout without hiding saved status or paid setup', () => {
 const unpaid = renderRegistration({ captured: false, entitlementActive: false, paidThrough: null,
   paymentState: 'checkout_open', admissionState: 'submitted', checkoutAvailable: false });
 assert.match(unpaid, /Checkout is temporarily paused/);
 assert.match(unpaid, /Your registration is saved/);
 assert.match(unpaid, /BCF-TEST|Check status|Return to application/);
 assert.doesNotMatch(unpaid, /Continue to secure checkout/);
 const paid = renderRegistration({ checkoutAvailable: false });
 assert.match(paid, /Membership active/);
 assert.match(paid, /Finish membership setup/);
 assert.doesNotMatch(paid, /Checkout is temporarily paused/);
});

test('term dates use calendar dates and reject unavailable or invalid server values', () => {
 assert.equal(formatMembershipTermDate('2028-02-29'), 'February 29, 2028');
 assert.equal(formatMembershipTermDate('2027-01-01'), 'January 1, 2027');
 for (const value of [undefined, null, '', '2027-02-29', '2027-13-01', '2027-04-31', 'not-a-date']) {
  assert.equal(formatMembershipTermDate(value), null);
 }
});
