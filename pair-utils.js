function normalizePhoneNumber(input) {
  if (typeof input !== 'string') return '';

  const normalized = input.trim().replace(/[^0-9]/g, '');

  if (!normalized) return '';

  if (normalized.startsWith('0')) {
    return normalized.slice(1);
  }

  return normalized;
}

function buildSessionCodeFromCredsFile(credsPath) {
  if (!credsPath) return '';

  const fs = require('node:fs');
  if (!fs.existsSync(credsPath)) return '';

  const raw = fs.readFileSync(credsPath, 'utf8');
  if (!raw) return '';

  return `BLAZE~${Buffer.from(raw).toString('base64')}`;
}

function resolveSessionRecipientJid(sock, jidNormalizer) {
  if (!sock) return '';

  const candidates = [
    sock.user?.id,
    sock.authState?.creds?.me?.id,
    sock.authState?.creds?.me?.jid,
    sock.authState?.creds?.me?.lid,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;

    const normalized = typeof jidNormalizer === 'function' ? jidNormalizer(candidate) : candidate;
    if (typeof normalized === 'string' && normalized.trim()) {
      return normalized;
    }
  }

  return '';
}

async function requestPairingCodeFromSocket(sock, rawNumber, options = {}) {
  const normalizedNumber = normalizePhoneNumber(rawNumber || '');
  if (!normalizedNumber) {
    throw new Error('Phone number is required');
  }

  const delayMs = options.delayMs ?? 1500;
  const delayFn = options.delayFn ?? (async () => { await new Promise((resolve) => setTimeout(resolve, delayMs)); });

  await delayFn();
  return sock.requestPairingCode(normalizedNumber);
}

module.exports = {
  normalizePhoneNumber,
  buildSessionCodeFromCredsFile,
  resolveSessionRecipientJid,
  requestPairingCodeFromSocket,
};
