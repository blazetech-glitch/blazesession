const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneNumber, requestPairingCodeFromSocket } = require('../pair-utils');

test('normalizes phone numbers for pairing code requests', () => {
  assert.equal(normalizePhoneNumber('+256700123456'), '+256700123456');
  assert.equal(normalizePhoneNumber('256700123456'), '+256700123456');
  assert.equal(normalizePhoneNumber(' +256 700 123 456 '), '+256700123456');
  assert.equal(normalizePhoneNumber(''), '');
});

test('requests a pairing code through the socket with a normalized number', async () => {
  const requests = [];
  const sock = {
    requestPairingCode: async (value) => {
      requests.push(value);
      return 'PAIR-CODE-123';
    },
  };

  const code = await requestPairingCodeFromSocket(sock, ' 256700123456 ', { delayMs: 0, delayFn: async () => {} });

  assert.equal(code, 'PAIR-CODE-123');
  assert.deepEqual(requests, ['+256700123456']);
});
