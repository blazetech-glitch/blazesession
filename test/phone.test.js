const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizePhoneNumber, requestPairingCodeFromSocket, buildSessionCodeFromCredsFile, resolveSessionRecipientJid, buildSessionCopyMessage } = require('../pair-utils');

test('normalizes phone numbers for pairing code requests', () => {
  assert.equal(normalizePhoneNumber('+256700123456'), '256700123456');
  assert.equal(normalizePhoneNumber('256700123456'), '256700123456');
  assert.equal(normalizePhoneNumber(' +256 700 123 456 '), '256700123456');
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
  assert.deepEqual(requests, ['256700123456']);
});

test('builds a session code from the real credentials file contents', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blaze-session-'));
  const credsPath = path.join(tempDir, 'creds.json');
  const sessionPayload = JSON.stringify({ key: 'value' });
  fs.writeFileSync(credsPath, sessionPayload);

  const code = buildSessionCodeFromCredsFile(credsPath);

  assert.equal(code, `BLAZE~${Buffer.from(sessionPayload).toString('base64')}`);
});

test('resolves the logged-in user JID from the auth state when user.id is missing', () => {
  const socket = {
    authState: {
      creds: {
        me: { id: '256700123456@s.whatsapp.net' },
      },
    },
  };

  const jid = resolveSessionRecipientJid(socket, (value) => value);

  assert.equal(jid, '256700123456@s.whatsapp.net');
});

test('builds a WhatsApp copy-button message that contains the session code and a copy action', () => {
  const message = buildSessionCopyMessage('BLAZE~ABC123');

  assert.equal(message.text, 'BLAZE~ABC123');
  assert.equal(message.footer, 'Tap Copy to send the code back to this chat');
  assert.equal(message.buttons[0].buttonText.displayText, 'Copy');
  assert.ok(message.buttons[0].buttonId.includes('copy-session'));
});
