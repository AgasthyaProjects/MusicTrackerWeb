import express from 'express';

const router = express.Router();

const HEARTBEAT_TIMEOUT_MS = Number(process.env.LAUNCHER_HEARTBEAT_TIMEOUT_MS || 30000);
const SESSION_TTL_MS = Number(process.env.LAUNCHER_SESSION_TTL_MS || 24 * 60 * 60 * 1000);

// In-memory session store for desktop-launch heartbeat.
const sessions = new Map();

function nowMs() {
  return Date.now();
}

function pruneSessions() {
  const cutoff = nowMs() - SESSION_TTL_MS;
  for (const [sessionId, entry] of sessions.entries()) {
    if (!entry) {
      sessions.delete(sessionId);
      continue;
    }

    const lastActivity = entry.closedAt || entry.lastSeen || 0;
    if (lastActivity < cutoff) {
      sessions.delete(sessionId);
    }
  }
}

function getStatus(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) {
    return {
      sessionId,
      seenHeartbeat: false,
      active: false,
      ageMs: null,
      heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
    };
  }

  const ageMs = Math.max(0, nowMs() - (entry.lastSeen || 0));
  const active = !entry.closedAt && ageMs <= HEARTBEAT_TIMEOUT_MS;

  return {
    sessionId,
    seenHeartbeat: true,
    active,
    ageMs,
    heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
    closedAt: entry.closedAt || null,
    lastSeen: entry.lastSeen || null,
  };
}

router.post('/heartbeat', (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  pruneSessions();

  sessions.set(sessionId, {
    lastSeen: nowMs(),
    closedAt: null,
  });

  return res.json({ ok: true });
});

router.post('/close', (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  pruneSessions();

  const existing = sessions.get(sessionId);
  const lastSeen = existing?.lastSeen || nowMs();
  sessions.set(sessionId, {
    lastSeen,
    closedAt: nowMs(),
  });

  return res.json({ ok: true });
});

router.get('/status', (req, res) => {
  const sessionId = String(req.query?.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query parameter is required' });
  }

  pruneSessions();
  return res.json(getStatus(sessionId));
});

export default router;
