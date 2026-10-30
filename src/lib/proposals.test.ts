import assert from 'node:assert/strict';
import test from 'node:test';
import { detectKind, splitProposal } from './proposals.ts';

test('a proposal line is removed from the spoken reply', () => {
  const parsed = splitProposal('I can draft that.\nPROPOSAL: post | We opened the HQ');
  assert.equal(parsed.text, 'I can draft that.');
  assert.deepEqual(parsed.proposal, { kind: 'post', summary: 'We opened the HQ' });
});

test('casual chat is not a gated action', () => {
  assert.equal(detectKind('send me three title ideas'), null);
  assert.equal(detectKind('post the opening to the room'), 'post');
  assert.equal(detectKind('please hire a painter'), 'hire');
  assert.equal(detectKind('do not spend money on ads'), 'spend');
});

test('implied actions still need a proposal object', () => {
  const parsed = splitProposal('Sure, I will look that up.');
  assert.equal(parsed.proposal, null);
  assert.equal(detectKind('email the outline to Sam'), 'send');
});
