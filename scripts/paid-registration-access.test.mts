import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canContinuePaidAccount} from '../src/lib/paidRegistrationAccess.ts';
const state={captured:true,entitlementActive:true,paidThrough:'2026-12-31',admissionState:'approved'};
test('active paid membership can continue account setup',()=>assert.equal(canContinuePaidAccount(state),true));
test('partial refund does not independently remove account continuation',()=>assert.equal(canContinuePaidAccount({...state,refundStatus:'partial',refundedAmountMinor:2500} as typeof state),true));
test('full refund remains separate from authorized membership disposition',()=>assert.equal(canContinuePaidAccount({...state,refundStatus:'full',refundedAmountMinor:7500} as typeof state),true));
test('expired paid term may securely attach history without granting current access',()=>assert.equal(canContinuePaidAccount({...state,entitlementActive:false}),true));
test('uncaptured payment cannot continue',()=>assert.equal(canContinuePaidAccount({...state,captured:false}),false));
test('unsupported term exception cannot continue',()=>assert.equal(canContinuePaidAccount({...state,admissionState:'term_exception'}),false));

test('authorized membership removal blocks chapter-access continuation',()=>assert.equal(canContinuePaidAccount({...state,organizationMembershipState:'removed'}),false));
