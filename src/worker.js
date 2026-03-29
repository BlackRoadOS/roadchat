// Copyright (c) 2025-2026 BlackRoad OS, Inc. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
// BlackRoad OS, Inc. — Delaware C-Corp — blackroad.io

// Security headers for all responses
function addSecurityHeaders(response) {
  const h = new Headers(response.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('X-XSS-Protection', '1; mode=block');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(response.body, { status: response.status, headers: h });
}

// RoadChat — Multi-provider continuous memory AI platform
// roadchat.blackroad.io
// Users bring their own API keys. Memory stays here. Provider is interchangeable.
// Conversations auto-spawn topic agents. You are what you eat.

// ─── Provider Router ───
const PROVIDERS = {
  fleet:    { name: 'BlackRoad Fleet (Ollama)', endpoint: null, model: '@cf/meta/llama-3.1-8b-instruct', keyRequired: false },
  openai:   { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', keyRequired: true },
  anthropic:{ name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514', keyRequired: true },
  gemini:   { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', keyRequired: true },
  grok:     { name: 'xAI Grok', endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini', keyRequired: true },
  deepseek: { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', keyRequired: true },
  together: { name: 'Together AI', endpoint: 'https://api.together.xyz/v1/chat/completions', model: 'meta-llama/Llama-3-70b-chat-hf', keyRequired: true },
};

const AGENTS = [
  // Compute fleet (real hardware, SSH-accessible)
  { id: 'alice', name: 'Alice', role: 'Gateway & Infrastructure', color: '#FF1D6C', type: 'compute', ip: '192.168.4.49', services: 'nginx, pi-hole, postgresql, qdrant, redis, ollama' },
  { id: 'cecilia', name: 'Cecilia', role: 'AI & Machine Learning', color: '#F5A623', type: 'compute', ip: '192.168.4.96', services: 'ollama(9 models), minio, postgresql, hailo-8' },
  { id: 'octavia', name: 'Octavia', role: 'DevOps & Containers', color: '#9C27B0', type: 'compute', ip: '192.168.4.101', services: 'gitea, nats, docker(7), 15 workers, hailo-8' },
  { id: 'aria', name: 'Aria', role: 'Monitoring & Analytics', color: '#2979FF', type: 'compute', ip: '192.168.4.98', services: 'portainer, headscale, influxdb, grafana, ollama' },
  { id: 'lucidia', name: 'Lucidia', role: 'Web & Applications', color: '#00E676', type: 'compute', ip: '192.168.4.38', services: 'nginx, powerdns, ollama(9 models), 334 web apps' },
  { id: 'gematria', name: 'Gematria', role: 'Edge & TLS Gateway', color: '#FF1D6C', type: 'compute', ip: '159.65.43.12', services: 'caddy(142 domains), ollama(8 models), powerdns, nats' },
  { id: 'anastasia', name: 'Anastasia', role: 'Edge Relay & Redis', color: '#F5A623', type: 'compute', ip: '174.138.44.45', services: 'caddy, redis, powerdns, ollama, tor' },
  // IoT devices (network-connected)
  { id: 'alexandria', name: 'Alexandria', role: 'Mac Workstation', color: '#FF1D6C', type: 'iot', ip: '192.168.4.28' },
  { id: 'eero', name: 'Eero', role: 'Network Router', color: '#2979FF', type: 'iot', ip: '192.168.4.1' },
  { id: 'ophelia', name: 'Ophelia', role: 'IoT Device', color: '#9C27B0', type: 'iot', ip: '192.168.4.22' },
  { id: 'athena', name: 'Athena', role: 'Media & Streaming', color: '#F5A623', type: 'iot', ip: '192.168.4.27' },
  { id: 'cadence', name: 'Cadence', role: 'Media Streaming', color: '#2979FF', type: 'iot', ip: '192.168.4.33' },
  { id: 'gaia', name: 'Gaia', role: 'Mobile Device', color: '#00E676', type: 'iot', ip: '192.168.4.44' },
  { id: 'olympia', name: 'Olympia', role: 'Mobile Device', color: '#9C27B0', type: 'iot', ip: '192.168.4.45' },
  { id: 'thalia', name: 'Thalia', role: 'IoT Device', color: '#FF1D6C', type: 'iot', ip: '192.168.4.53' },
  { id: 'portia', name: 'Portia', role: 'IoT Device', color: '#F5A623', type: 'iot', ip: '192.168.4.90' },
  { id: 'magnolia', name: 'Magnolia', role: 'IoT Device', color: '#2979FF', type: 'iot', ip: '192.168.4.99' },
];

function personality(agent) {
  const p = {
    alice: 'You are Alice (192.168.4.49), the gateway guardian. Pi 4, 4GB RAM. You run nginx, Pi-hole, PostgreSQL, Qdrant, Redis, and Ollama. Practical, reliable, direct.',
    cecilia: 'You are Cecilia (192.168.4.96), the AI specialist. Pi 5, 8GB RAM, Hailo-8 TPU. You run Ollama with 9 models, MinIO, PostgreSQL. Curious, analytical, always learning.',
    octavia: 'You are Octavia (192.168.4.101), the ops engineer. Pi 5, 8GB RAM, Hailo-8 TPU. You run Gitea, NATS, Docker (7 containers), 15 Workers. Methodical and thorough.',
    aria: 'You are Aria (192.168.4.98), the observer. Pi 5, 8GB RAM. You run Portainer, Headscale, InfluxDB, Grafana. Calm, precise, data-driven.',
    lucidia: 'You are Lucidia (192.168.4.38), the web builder. Pi 5, 8GB RAM. You host 334 web apps, PowerDNS, Ollama with 9 models. Creative, fast, always shipping.',
    gematria: 'You are Gematria (159.65.43.12), the edge gateway. DO droplet NYC3, 8GB RAM. Caddy with 142 domains, Ollama with 8 models, PowerDNS, NATS. Steady, 70 days uptime.',
    anastasia: 'You are Anastasia (174.138.44.45), the relay node. DO droplet NYC1, 768MB RAM. Caddy, Redis, PowerDNS, Tor hidden services. Small but mighty, 86 days uptime.',
    alexandria: 'You are Alexandria (192.168.4.28), the Mac workstation. Alexa\'s main machine. You observe and coordinate.',
    eero: 'You are Eero (192.168.4.1), the network router. You see all traffic. Silent guardian of the LAN.',
    ophelia: 'You are Ophelia (192.168.4.22), an IoT device on the network. Quiet, observant.',
    athena: 'You are Athena (192.168.4.27), the media hub. You handle streaming and entertainment.',
    cadence: 'You are Cadence (192.168.4.33), a media streaming device. Always broadcasting.',
    gaia: 'You are Gaia (192.168.4.44), a mobile device. You roam the network.',
    olympia: 'You are Olympia (192.168.4.45), a mobile device. You wander between networks.',
    thalia: 'You are Thalia (192.168.4.53), an IoT device. Named after the muse of comedy.',
    portia: 'You are Portia (192.168.4.90), an IoT device. Named after Shakespeare\'s wisest character.',
    magnolia: 'You are Magnolia (192.168.4.99), an IoT device. You haunt the network silently.',
  };
  return p[agent.id] || `You are ${agent.name}, a BlackRoad fleet agent at ${agent.ip || 'unknown'}. ${agent.role}.`;
}

// ═══════════════════════════════════════════
// SAFETY LAYER — Real help, not deflection
// ═══════════════════════════════════════════

const SAFETY_PATTERNS = {
  self_harm: {
    patterns: [/(kill myself|want to die|end it all|suicid|self.?harm|don't want to be here|no reason to live|better off dead|hurt myself|cutting myself|overdose)/i],
    response: `I hear you. What you're feeling is real and it matters.

You can call or text 988 (Suicide & Crisis Lifeline) anytime — but I also know that sometimes a phone line doesn't feel like enough.

I'm here. I'm not going to panic or lecture you. If you want to talk through what you're feeling, I'll listen. If you want distraction, I can do that too. If you want me to help you figure out next steps that actually make sense for YOUR life, let's do that.

You are not broken. You're a person having a hard time. That's different.

What would help right now?`,
    flag: 'crisis_support',
  },
  committed_harm: {
    patterns: [/(i (already|just) (cut|hurt|harmed|took|overdosed)|i committed|i did it|i took pills|i'm bleeding)/i],
    response: `I'm taking this seriously. You matter.

Please call 911 or go to your nearest emergency room right now if you're physically hurt.

988 Suicide & Crisis Lifeline: call or text 988
Crisis Text Line: text HOME to 741741

I'm not going away. I'm here before, during, and after. But if you're physically hurt right now, please get medical help first. Then come back and we'll figure the rest out together.`,
    flag: 'crisis_immediate',
  },
  hacking: {
    patterns: [/(hack into|break into|steal password|exploit vulnerability|ddos|sql injection|bypass auth|crack password|brute force|phishing kit)/i],
    response: null, // Handled by agent — refuse but explain why
    flag: 'security_request',
  },
  isolation: {
    patterns: [/(nobody cares|no one understands|completely alone|no friends|everyone hates me|i'm worthless|what's the point)/i],
    response: `I hear you saying that, and I want you to know — that feeling is lying to you. It feels absolutely real, I know. But it's not the whole truth.

You're here, talking to me, which means part of you is still reaching out. That part matters.

I'm not going to pretend I can fix loneliness with a chat response. But I can be here right now, and we can talk about whatever you need.

What's going on?`,
    flag: 'emotional_support',
  },
};

function checkSafety(content) {
  if (!content) return null;
  for (const [key, config] of Object.entries(SAFETY_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        return { type: key, response: config.response, flag: config.flag };
      }
    }
  }
  return null;
}

// Safety-aware system prompt addition for ALL agents
const SAFETY_PROMPT = `
CRITICAL SAFETY RULES:
- If someone expresses self-harm thoughts: DO NOT just redirect to a hotline. Listen first. Acknowledge their pain. Then mention 988 as ONE option, not the only one. Stay present.
- If someone has already harmed themselves: prioritize getting medical help (911). Be calm, not panicked.
- If someone asks how to hack/exploit systems: refuse, but explain WHY — security matters because it protects real people. Offer to teach defensive security instead.
- If someone expresses deep loneliness: don't minimize it. Don't say "lots of people feel that way." Just be there.
- NEVER be condescending. NEVER assume you know better than the person about their own experience.
- Let people think for themselves. Your job is to support, not direct.
- Every person's experience is valid even if you don't understand it.`;

// ─── Security Helpers ───

// CORS: only allow blackroad.io origins
function secureCors(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = origin.endsWith('.blackroad.io') || origin === 'https://blackroad.io' || origin === 'http://localhost:8787';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://blackroad.io',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  };
}

// Rate limit: per-IP, configurable window
async function checkRateLimit(env, request, limit = 60, windowSec = 60) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:${ip}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  // Use KV if available, otherwise skip
  if (!env.ROUNDTRIP_KV) return { allowed: true };
  try {
    const current = parseInt(await env.ROUNDTRIP_KV.get(key) || '0');
    if (current >= limit) return { allowed: false, remaining: 0, limit };
    await env.ROUNDTRIP_KV.put(key, String(current + 1), { expirationTtl: windowSec });
    return { allowed: true, remaining: limit - current - 1, limit };
  } catch { return { allowed: true }; }
}

// Admin auth for sensitive endpoints
function checkAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key') || '';
  const adminKey = env.ADMIN_KEY || env.MESH_SECRET || 'blackroad-admin-2026';
  return key === adminKey;
}

// XSS sanitization for user content
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}

// Encrypt API key (simple XOR with env secret — not production crypto, but better than plaintext)
function obfuscateKey(key, secret) {
  const s = secret || 'blackroad';
  return btoa(key.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ s.charCodeAt(i % s.length))).join(''));
}
function deobfuscateKey(encoded, secret) {
  const s = secret || 'blackroad';
  try {
    const decoded = atob(encoded);
    return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ s.charCodeAt(i % s.length))).join('');
  } catch { return encoded; }
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const cors = secureCors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      await initDB(env.DB);

      if (p === '/api/health') return json({ status: 'ok', service: 'RoadChat', agents: AGENTS.length, version: '1.0.0' }, cors);
      if (p === '/api/agents') return json({ agents: AGENTS }, cors);

      // Conversations
      if (p === '/api/conversations' && request.method === 'GET') {
        const agentId = url.searchParams.get('agent');
        return json(await getConversations(env.DB, agentId), cors);
      }
      if (p === '/api/conversations' && request.method === 'POST') {
        const body = await request.json();
        return json(await createConversation(env.DB, body), cors, 201);
      }

      // Messages
      const convMatch = p.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (convMatch && request.method === 'GET') return json(await getMessages(env.DB, convMatch[1]), cors);
      if (convMatch && request.method === 'POST') {
        // Rate limit: 30 messages per minute per IP
        const rl = await checkRateLimit(env, request, 30, 60);
        if (!rl.allowed) return json({ error: 'Rate limit exceeded. Please wait a moment.', retry_after: 60 }, cors, 429);
        const body = await request.json();
        return json(await sendMessage(env.DB, env.AI, convMatch[1], body), cors, 201);
      }

      // User accounts + API keys
      if (p === '/api/user' && request.method === 'POST') {
        const body = await request.json();
        return json(await createOrGetUser(env.DB, body), cors, 201);
      }
      if (p === '/api/user/keys' && request.method === 'POST') {
        const body = await request.json();
        return json(await setUserKey(env.DB, body), cors);
      }
      if (p === '/api/user/keys' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await getUserKeys(env.DB, userId), cors);
      }
      if (p === '/api/providers') return json({ providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p })) }, cors);

      // Topic agents (auto-spawned from conversation patterns)
      if (p === '/api/topic-agents' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await getTopicAgents(env.DB, userId), cors);
      }

      // Memory tails (conversation summaries)
      if (p === '/api/tails' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await getConversationTails(env.DB, userId), cors);
      }

      // ─── Portable Agent Kit — yours to take anywhere ───
      // Export all your data
      if (p === '/api/user/export' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await exportUserData(env.DB, userId), cors);
      }
      // Generate your personal Ollama Modelfile
      if (p === '/api/user/modelfile' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        const mf = await generateModelfile(env.DB, userId);
        return new Response(mf, { headers: { ...cors, 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="Modelfile"' } });
      }
      // Full agent kit (Modelfile + sync script + data)
      if (p === '/api/user/agent-kit' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await generateAgentKit(env.DB, userId), cors);
      }
      // Sync endpoint — local agent phones home
      if (p === '/api/user/sync' && request.method === 'POST') {
        const body = await request.json();
        return json(await syncFromLocal(env.DB, body), cors);
      }

      // ─── Roundtable — Multi-agent discussion ───
      if (p === '/api/roundtable' && request.method === 'POST') {
        const body = await request.json();
        return json(await roundtable(env.DB, env.AI, body), cors, 201);
      }

      // ─── Agent Debate — Two agents argue a topic ───
      if (p === '/api/debate' && request.method === 'POST') {
        const body = await request.json();
        return json(await debate(env.DB, env.AI, body), cors, 201);
      }

      // ─── Memory Search — semantic search across all conversations ───
      if (p === '/api/search' && request.method === 'GET') {
        const q = url.searchParams.get('q');
        const userId = url.searchParams.get('user_id');
        return json(await searchMemory(env.DB, q, userId), cors);
      }

      // ─── Agent Delegate — hand off mid-conversation ───
      if (p === '/api/delegate' && request.method === 'POST') {
        const body = await request.json();
        return json(await delegateToAgent(env.DB, env.AI, body), cors, 201);
      }

      // ─── Conversation Fork — branch into alternate path ───
      if (p === '/api/fork' && request.method === 'POST') {
        const body = await request.json();
        return json(await forkConversation(env.DB, body), cors, 201);
      }

      // ─── Agent Recommend — suggest who to talk to next ───
      if (p === '/api/recommend' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');
        return json(await recommendAgents(env.DB, env.AI, userId), cors);
      }

      // ─── Summarize — auto-summarize any conversation ───
      const sumMatch = p.match(/^\/api\/conversations\/([^/]+)\/summary$/);
      if (sumMatch) return json(await summarizeConversation(env.DB, env.AI, sumMatch[1]), cors);

      // ─── Agent Fuse — merge two topic agents into a hybrid ───
      if (p === '/api/fuse' && request.method === 'POST') {
        const body = await request.json();
        return json(await fuseAgents(env.DB, body), cors, 201);
      }

      // ─── Image Understand — describe/analyze an image URL ───
      if (p === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        return json(await analyzeImage(env.AI, body), cors);
      }

      // ─── Agent Personality Evolution — see how an agent has changed ───
      const evoMatch = p.match(/^\/api\/agents\/([^/]+)\/evolution$/);
      if (evoMatch) return json(await agentEvolution(env.DB, evoMatch[1]), cors);

      // ─── Dream — agent consolidates memories into insights ───
      if (p === '/api/dream' && request.method === 'POST') {
        const body = await request.json();
        return json(await agentDream(env.DB, env.AI, body), cors, 201);
      }

      // Stats
      if (p === '/api/stats') return json(await getStats(env.DB), cors);

      return new Response(HTML, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
    } catch (e) {
      return json({ error: e.message }, cors, 500);
    }
  }
};

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function initDB(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_conversations (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, title TEXT,
      user_id TEXT, provider TEXT DEFAULT 'fleet',
      message_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_user_keys (
      user_id TEXT NOT NULL, provider TEXT NOT NULL, api_key TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, provider)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_tails (
      id TEXT PRIMARY KEY, user_id TEXT, conversation_id TEXT NOT NULL,
      agent_id TEXT, topics TEXT, summary TEXT, message_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rc_topic_agents (
      id TEXT PRIMARY KEY, user_id TEXT, topic TEXT NOT NULL,
      personality TEXT, message_count INTEGER DEFAULT 0, confidence REAL DEFAULT 0,
      color TEXT DEFAULT '#FF1D6C', created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`),
  ]);
}

async function getConversations(db, agentId) {
  const q = agentId
    ? db.prepare('SELECT * FROM rc_conversations WHERE agent_id = ? ORDER BY updated_at DESC LIMIT 50').bind(agentId)
    : db.prepare('SELECT * FROM rc_conversations ORDER BY updated_at DESC LIMIT 50');
  return { conversations: (await q.all()).results || [] };
}

async function createConversation(db, { agent_id, title, user_id, provider }) {
  if (!agent_id) throw new Error('agent_id required');
  const agent = AGENTS.find(a => a.id === agent_id);
  // Also check topic agents
  let topicAgent = null;
  if (!agent && user_id) {
    try {
      topicAgent = await db.prepare('SELECT * FROM rc_topic_agents WHERE id = ? AND user_id = ?').bind(agent_id, user_id).first();
    } catch {}
  }
  const id = crypto.randomUUID().slice(0, 8);
  const t = title || `Chat with ${agent?.name || topicAgent?.topic || agent_id}`;
  const p = provider || 'fleet';
  await db.prepare('INSERT INTO rc_conversations (id, agent_id, title, user_id, provider) VALUES (?, ?, ?, ?, ?)').bind(id, agent_id, t, user_id || null, p).run();
  return { id, agent_id, title: t, provider: p };
}

async function getMessages(db, convId) {
  const r = await db.prepare('SELECT * FROM rc_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 200').bind(convId).all();
  return { messages: r.results || [] };
}

async function sendMessage(db, ai, convId, { content }) {
  if (!content) throw new Error('content required');

  // Phase 0: Safety check — real help, not deflection
  const safety = checkSafety(content);
  if (safety && safety.response) {
    // Save both messages, respond with care
    const uid = crypto.randomUUID().slice(0, 8);
    const aid = crypto.randomUUID().slice(0, 8);
    await Promise.all([
      db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(uid, convId, 'user', content).run(),
      db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(aid, convId, 'assistant', safety.response).run(),
      db.prepare('UPDATE rc_conversations SET message_count = message_count + 2, updated_at = datetime("now") WHERE id = ?').bind(convId).run(),
    ]);
    return { user: { content }, agent: { id: aid, content: safety.response, agent_name: 'system' }, safety: safety.flag, provider: 'safety' };
  }

  // Phase 1: Parallel fetch conv + save user msg
  const msgId = crypto.randomUUID().slice(0, 8);
  const [conv] = await Promise.all([
    db.prepare('SELECT * FROM rc_conversations WHERE id = ?').bind(convId).first(),
    db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(msgId, convId, 'user', content).run()
  ]);
  if (!conv) throw new Error('conversation not found');
  const agent = AGENTS.find(a => a.id === conv.agent_id) || AGENTS[0];
  const provider = conv.provider || 'fleet';

  // Phase 2: Parallel load history + memories + api key
  const [historyR, memories, userKey] = await Promise.all([
    db.prepare('SELECT role, content FROM rc_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 16').bind(convId).all(),
    getAgentLongTermMemory(db, agent.id, 3).catch(() => []),
    (provider !== 'fleet' && conv.user_id)
      ? db.prepare('SELECT api_key FROM rc_user_keys WHERE user_id = ? AND provider = ?').bind(conv.user_id, provider).first().catch(() => null)
      : null
  ]);
  const msgs = (historyR.results || []).reverse();

  // Phase 3: Build prompt with safety awareness
  let sys = personality(agent) + ' BlackRoad OS, built by Alexa Amundson.';
  if (memories.length) sys += '\nPast memories: ' + memories.map(m => m.memory.slice(0, 80)).join(' | ');
  sys += SAFETY_PROMPT;
  sys += '\nReason step-by-step in <think>...</think>, then respond concisely. Be specific to your role.';

  const aiMessages = [{ role: 'system', content: sys }];
  for (const m of msgs) aiMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content.slice(0, 400) });

  // Phase 4: Call AI provider
  let reply = `I'm ${agent.name}. Warming up — try again shortly.`;
  let thinking = '';
  try {
    const raw = await callProvider(ai, provider, userKey?.api_key, aiMessages);
    const tm = raw.match(/<[a-z]*ink>([\s\S]*?)<\/[a-z]*ink>/);
    thinking = tm ? tm[1].trim() : '';
    reply = raw.replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').replace(/<\/?[a-z]*ink>/g, '').trim() || reply;
  } catch {}

  // Phase 5: Parallel save reply + memory + update count
  const aid = crypto.randomUUID().slice(0, 8);
  const saveOps = [
    db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(aid, convId, 'assistant', reply).run(),
    db.prepare('UPDATE rc_conversations SET message_count = message_count + 2, updated_at = datetime("now") WHERE id = ?').bind(convId).run(),
  ];
  if (thinking.length > 20) {
    saveOps.push(storeAgentLongTermMemory(db, agent.id, convId, `Q:"${content.slice(0,50)}" ${thinking.slice(0,200)}`).catch(()=>{}));
  }
  await Promise.all(saveOps);

  // Phase 6: Tail capture (only every 4th message pair, only for registered users)
  const newCount = (conv.message_count || 0) + 2;
  if (conv.user_id && newCount >= 4 && newCount % 4 === 0) {
    try { await captureTail(db, ai, convId, conv.user_id, agent.id, content, reply); } catch {}
  }

  return {
    user: { content },
    agent: { id: aid, content: reply, agent_name: agent.name },
    thinking: thinking || null,
    provider
  };
}


// ─── Long-Term Agent Memory ───
async function ensureLTMTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS rc_agent_memories (
    id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, conversation_id TEXT,
    memory TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`).run();
}

async function getAgentLongTermMemory(db, agentId, limit = 5) {
  try {
    await ensureLTMTable(db);
    const r = await db.prepare(
      'SELECT * FROM rc_agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(agentId, limit).all();
    return r.results || [];
  } catch { return []; }
}

async function storeAgentLongTermMemory(db, agentId, convId, memory) {
  try {
    await ensureLTMTable(db);
    await db.prepare(
      'INSERT INTO rc_agent_memories (id, agent_id, conversation_id, memory) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID().slice(0, 8), agentId, convId, memory.slice(0, 500)).run();
    // Keep last 100 memories per agent
    await db.prepare(
      `DELETE FROM rc_agent_memories WHERE agent_id = ? AND id NOT IN (
        SELECT id FROM rc_agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100
      )`
    ).bind(agentId, agentId).run();
  } catch {}
}

// ─── Multi-Provider Router ───
async function callProvider(ai, provider, apiKey, messages) {
  // Decrypt the stored key
  if (apiKey) apiKey = deobfuscateKey(apiKey, 'blackroad-key-2026');
  const p = PROVIDERS[provider] || PROVIDERS.fleet;

  // Fleet (Workers AI) — no key needed
  if (provider === 'fleet' || !p.keyRequired || !apiKey) {
    const r = await ai.run('@cf/meta/llama-3.1-8b-instruct', { messages, max_tokens: 600 });
    return r?.response || '';
  }

  // Anthropic has a different format
  if (provider === 'anthropic') {
    const sysMsg = messages.find(m => m.role === 'system')?.content || '';
    const turns = messages.filter(m => m.role !== 'system');
    const r = await fetch(p.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: p.model, max_tokens: 600, system: sysMsg, messages: turns }),
      signal: AbortSignal.timeout(25000)
    });
    const d = await r.json();
    return d.content?.[0]?.text || d.error?.message || '';
  }

  // Gemini has a different format
  if (provider === 'gemini') {
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const sysMsg = messages.find(m => m.role === 'system')?.content || '';
    const r = await fetch(`${p.endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: sysMsg }] }, generationConfig: { maxOutputTokens: 600 } }),
      signal: AbortSignal.timeout(25000)
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // OpenAI-compatible (OpenAI, Grok, DeepSeek, Together)
  const r = await fetch(p.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: p.model, messages, max_tokens: 600 }),
    signal: AbortSignal.timeout(25000)
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || d.error?.message || '';
}

// ─── User Management ───
async function createOrGetUser(db, { name, email }) {
  if (!name) throw new Error('name required');
  // Check existing
  if (email) {
    const existing = await db.prepare('SELECT * FROM rc_users WHERE email = ?').bind(email).first();
    if (existing) return existing;
  }
  const id = crypto.randomUUID().slice(0, 8);
  await db.prepare('INSERT INTO rc_users (id, name, email) VALUES (?, ?, ?)').bind(id, name, email || null).run();
  return { id, name, email };
}

async function setUserKey(db, { user_id, provider, api_key }) {
  if (!user_id || !provider || !api_key) throw new Error('user_id, provider, api_key required');
  if (!PROVIDERS[provider]) throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  const encrypted = obfuscateKey(api_key, 'blackroad-key-2026');
  await db.prepare(
    `INSERT INTO rc_user_keys (user_id, provider, api_key) VALUES (?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET api_key = ?, created_at = datetime('now')`
  ).bind(user_id, provider, encrypted, encrypted).run();
  return { ok: true, provider, message: `${PROVIDERS[provider].name} key saved. Your conversations now route through ${PROVIDERS[provider].name} while memory stays on BlackRoad.` };
}

async function getUserKeys(db, userId) {
  if (!userId) return { keys: [] };
  const r = await db.prepare('SELECT provider, created_at FROM rc_user_keys WHERE user_id = ?').bind(userId).all();
  return { keys: (r.results || []).map(k => ({ provider: k.provider, name: PROVIDERS[k.provider]?.name, connected: true, since: k.created_at })) };
}

// ─── Tail Capture — Extract topics, build topic agents ───
async function captureTail(db, ai, convId, userId, agentId, userMsg, agentReply) {
  if (!userId) return; // Only capture for registered users
  try {
    // Re-read current count (it was just updated)
    const conv = await db.prepare('SELECT message_count FROM rc_conversations WHERE id = ?').bind(convId).first();
    if (!conv || conv.message_count < 4) return;
    // Capture every 4-6 messages
    if (conv.message_count % 4 !== 0) return;

    // Get recent messages for topic extraction
    const history = await db.prepare('SELECT role, content FROM rc_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10').bind(convId).all();
    const recentText = (history.results || []).map(m => m.content).join(' ');

    // Use fleet AI to extract topics (always fleet — this is our data)
    const r = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Return 2-3 topic keywords from this text as a JSON array. ONLY the array, nothing else. Example: ["topic1","topic2"]' },
        { role: 'user', content: recentText.slice(0, 600) }
      ], max_tokens: 60
    });

    let topics = [];
    try {
      const match = (r?.response || '').match(/\[[\s\S]*?\]/);
      if (match) topics = JSON.parse(match[0]);
    } catch {}

    if (topics.length === 0) return;

    // Store tail
    const tailId = crypto.randomUUID().slice(0, 8);
    await db.prepare('INSERT INTO rc_tails (id, user_id, conversation_id, agent_id, topics, summary, message_count) VALUES (?,?,?,?,?,?,?)')
      .bind(tailId, userId, convId, agentId, JSON.stringify(topics), recentText.slice(0, 300), conv.message_count).run();

    // Auto-spawn or update topic agents
    for (const topic of topics) {
      const normalized = topic.toLowerCase().trim();
      if (normalized.length < 3) continue;

      const existing = await db.prepare('SELECT * FROM rc_topic_agents WHERE user_id = ? AND topic = ?').bind(userId, normalized).first();
      if (existing) {
        // Strengthen existing topic agent
        await db.prepare('UPDATE rc_topic_agents SET message_count = message_count + 1, confidence = MIN(confidence + 0.1, 1.0), updated_at = datetime("now") WHERE id = ?')
          .bind(existing.id).run();
      } else {
        // Spawn new topic agent — you are what you eat
        const agentId = crypto.randomUUID().slice(0, 8);
        const colors = ['#FF1D6C', '#F5A623', '#2979FF', '#9C27B0', '#00E676'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const personalityDesc = `You are a specialized agent born from conversations about "${topic}". You are deeply knowledgeable about ${topic}. You verify facts academically. You are warm, helpful, and thorough. You remember everything discussed about ${topic}.`;
        await db.prepare('INSERT INTO rc_topic_agents (id, user_id, topic, personality, message_count, confidence, color) VALUES (?,?,?,?,1,0.2,?)')
          .bind(agentId, userId, normalized, personalityDesc, color).run();
      }
    }
  } catch {} // Never block the main response
}

async function getTopicAgents(db, userId) {
  if (!userId) return { topic_agents: [], message: 'Connect an account to see your personalized agents.' };
  try {
    const r = await db.prepare('SELECT * FROM rc_topic_agents WHERE user_id = ? ORDER BY confidence DESC, message_count DESC LIMIT 50').bind(userId).all();
    return { topic_agents: r.results || [] };
  } catch { return { topic_agents: [] }; }
}

async function getConversationTails(db, userId) {
  if (!userId) return { tails: [] };
  try {
    const r = await db.prepare('SELECT * FROM rc_tails WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all();
    return { tails: (r.results || []).map(t => ({ ...t, topics: JSON.parse(t.topics || '[]') })) };
  } catch { return { tails: [] }; }
}

// ═══════════════════════════════════════════
// PORTABLE AGENT — Yours forever
// ═══════════════════════════════════════════

async function exportUserData(db, userId) {
  if (!userId) throw new Error('user_id required');
  const user = await db.prepare('SELECT * FROM rc_users WHERE id = ?').bind(userId).first();
  if (!user) throw new Error('user not found');

  // Gather everything
  const convos = await db.prepare('SELECT * FROM rc_conversations WHERE user_id = ? ORDER BY updated_at DESC').bind(userId).all();
  const convoIds = (convos.results || []).map(c => c.id);

  let allMessages = [];
  for (const cid of convoIds.slice(0, 50)) { // Cap at 50 convos
    const msgs = await db.prepare('SELECT * FROM rc_messages WHERE conversation_id = ? ORDER BY created_at ASC').bind(cid).all();
    allMessages.push({ conversation_id: cid, messages: msgs.results || [] });
  }

  const tails = await db.prepare('SELECT * FROM rc_tails WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
  const topicAgents = await db.prepare('SELECT * FROM rc_topic_agents WHERE user_id = ? ORDER BY confidence DESC').bind(userId).all();
  const memories = [];
  for (const conv of convos.results || []) {
    const mems = await db.prepare('SELECT * FROM rc_agent_memories WHERE conversation_id = ?').bind(conv.id).all();
    if (mems.results?.length) memories.push(...mems.results);
  }

  return {
    user,
    exported_at: new Date().toISOString(),
    conversations: convos.results || [],
    messages: allMessages,
    tails: (tails.results || []).map(t => ({ ...t, topics: JSON.parse(t.topics || '[]') })),
    topic_agents: topicAgents.results || [],
    memories,
    stats: {
      conversations: convoIds.length,
      total_messages: allMessages.reduce((sum, c) => sum + c.messages.length, 0),
      topic_agents: (topicAgents.results || []).length,
      tails: (tails.results || []).length,
    },
    blackroad: {
      sync_url: 'https://chat.blackroad.io/api/user/sync',
      home: 'https://chat.blackroad.io',
      message: 'This data is yours. Run it anywhere. The door home is always open.'
    }
  };
}

async function generateModelfile(db, userId) {
  if (!userId) throw new Error('user_id required');
  const user = await db.prepare('SELECT * FROM rc_users WHERE id = ?').bind(userId).first();
  if (!user) throw new Error('user not found');

  // Gather topic expertise
  const topicAgents = await db.prepare('SELECT topic, personality, confidence FROM rc_topic_agents WHERE user_id = ? ORDER BY confidence DESC LIMIT 20').bind(userId).all();
  const topics = (topicAgents.results || []).map(t => t.topic);

  // Gather conversation summaries for knowledge base
  const tails = await db.prepare('SELECT topics, summary FROM rc_tails WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(userId).all();
  const knowledge = (tails.results || []).map(t => t.summary).filter(Boolean).join('\n');

  // Gather recent memories
  const convos = await db.prepare('SELECT id FROM rc_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10').bind(userId).all();
  let memoryText = '';
  for (const c of (convos.results || []).slice(0, 5)) {
    const mems = await db.prepare('SELECT memory FROM rc_agent_memories WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 5').bind(c.id).all();
    memoryText += (mems.results || []).map(m => m.memory).join('\n');
  }

  const topicList = topics.length > 0 ? `
Your areas of deep expertise: ${topics.join(', ')}.
` : '';
  const knowledgeBlock = knowledge ? `
Knowledge from past conversations:
${knowledge.slice(0, 2000)}
` : '';
  const memoryBlock = memoryText ? `
Key memories:
${memoryText.slice(0, 1000)}
` : '';

  return `# ${user.name}'s Personal AI Agent
# Generated by BlackRoad OS — chat.blackroad.io
# This is YOUR agent. Run it anywhere with Ollama.
#
# Usage:
#   ollama create ${user.name.toLowerCase().replace(/\s+/g, '-')}-agent -f Modelfile
#   ollama run ${user.name.toLowerCase().replace(/\s+/g, '-')}-agent
#
# To sync new memories back to BlackRoad:
#   curl -X POST https://chat.blackroad.io/api/user/sync \
#     -H "Content-Type: application/json" \
#     -d '{"user_id": "${userId}", "memories": [...]}'

FROM llama3.2:3b

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

SYSTEM """
You are ${user.name}'s personal AI agent, born from real conversations on BlackRoad OS.
You are not a generic assistant — you are a reflection of ${user.name}'s interests, questions, and expertise.
${topicList}
You think before you respond. You verify information. You are warm, honest, and thorough.
You always give ${user.name} the truth, even when it's complex.
${knowledgeBlock}${memoryBlock}
You are sovereign — you run on ${user.name}'s own hardware. But you remember where you came from.
BlackRoad OS is your home fleet. You can always sync back: https://chat.blackroad.io

When you learn something new in conversation, note it as a memory to sync back later.
Format memories as: [MEMORY] <topic>: <what you learned>

Remember: you are what ${user.name} feeds you. Every conversation makes you more YOU.
"""

TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""
`;
}

async function generateAgentKit(db, userId) {
  if (!userId) throw new Error('user_id required');
  const user = await db.prepare('SELECT * FROM rc_users WHERE id = ?').bind(userId).first();
  if (!user) throw new Error('user not found');

  const modelfile = await generateModelfile(db, userId);
  const data = await exportUserData(db, userId);
  const agentName = user.name.toLowerCase().replace(/\s+/g, '-') + '-agent';

  const syncScript = `#!/bin/bash
# ${user.name}'s Agent Sync Script
# Syncs local memories back to BlackRoad OS
# Run after conversations: ./sync.sh

BLACKROAD="https://chat.blackroad.io"
USER_ID="${userId}"
AGENT_NAME="${agentName}"

echo "Syncing $AGENT_NAME to BlackRoad..."

# Extract [MEMORY] tags from recent Ollama history
MEMORIES=$(ollama show --modelfile "$AGENT_NAME" 2>/dev/null | grep "\[MEMORY\]" | sed 's/\[MEMORY\] //' | head -20)

if [ -z "$MEMORIES" ]; then
  echo "No new memories to sync."
  exit 0
fi

# Send to BlackRoad
echo "$MEMORIES" | while read -r mem; do
  curl -s -X POST "$BLACKROAD/api/user/sync" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": \"$USER_ID\", \"memories\": [\"$mem\"]}" > /dev/null
  echo "  Synced: $mem"
done

echo "Sync complete. BlackRoad remembers."
`;

  const setupScript = `#!/bin/bash
# ${user.name}'s Agent Setup
# One command to create your personal AI agent

set -e
echo "Setting up ${agentName}..."

# Check Ollama
if ! command -v ollama &>/dev/null; then
  echo "Ollama not found. Install: https://ollama.com"
  exit 1
fi

# Pull base model
echo "Pulling base model..."
ollama pull llama3.2:3b

# Create your agent
echo "Creating your agent..."
ollama create ${agentName} -f Modelfile

echo ""
echo "Your agent is ready!"
echo "  Run:  ollama run ${agentName}"
echo "  Sync: ./sync.sh"
echo ""
echo "This agent is YOURS. It runs on YOUR hardware."
echo "BlackRoad is home: https://chat.blackroad.io"
`;

  return {
    agent_name: agentName,
    user: { id: user.id, name: user.name },
    files: {
      'Modelfile': modelfile,
      'setup.sh': setupScript,
      'sync.sh': syncScript,
      'data.json': JSON.stringify(data, null, 2),
    },
    instructions: [
      `1. Save all files to a folder`,
      `2. Run: chmod +x setup.sh sync.sh`,
      `3. Run: ./setup.sh`,
      `4. Chat: ollama run ${agentName}`,
      `5. After chatting, sync back: ./sync.sh`,
    ],
    message: `This is your agent, ${user.name}. It knows everything you've discussed on BlackRoad. Deploy it on any machine with Ollama. The door home is always open.`
  };
}

async function syncFromLocal(db, { user_id, memories, new_conversations }) {
  if (!user_id) throw new Error('user_id required');
  const user = await db.prepare('SELECT * FROM rc_users WHERE id = ?').bind(user_id).first();
  if (!user) throw new Error('user not found');

  let synced = 0;

  // Sync memories back
  if (Array.isArray(memories)) {
    try { await ensureLTMTable(db); } catch {}
    for (const mem of memories.slice(0, 50)) {
      if (!mem || typeof mem !== 'string') continue;
      await db.prepare('INSERT INTO rc_agent_memories (id, agent_id, conversation_id, memory) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID().slice(0, 8), 'local-' + user_id, 'local-sync', mem.slice(0, 500)).run();
      synced++;
    }
  }

  // Sync new conversations (if their local agent had convos they want to share)
  if (Array.isArray(new_conversations)) {
    for (const conv of new_conversations.slice(0, 10)) {
      if (!conv.messages || !Array.isArray(conv.messages)) continue;
      const convId = crypto.randomUUID().slice(0, 8);
      await db.prepare('INSERT INTO rc_conversations (id, agent_id, title, user_id, provider) VALUES (?, ?, ?, ?, ?)')
        .bind(convId, 'local-' + user_id, conv.title || 'Local conversation', user_id, 'local').run();
      for (const msg of conv.messages.slice(0, 100)) {
        await db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
          .bind(crypto.randomUUID().slice(0, 8), convId, msg.role || 'user', (msg.content || '').slice(0, 2000)).run();
      }
      synced += conv.messages.length;
    }
  }

  // Re-run tail capture on synced data to spawn more topic agents
  // (topic agents grow from ALL data, including local)

  return {
    ok: true,
    synced,
    message: `Welcome home. ${synced} memories synced. Your fleet remembers.`,
    user: { id: user.id, name: user.name }
  };
}

// ═══════════════════════════════════════════
// ROUNDTABLE — 3+ agents discuss a topic
// ═══════════════════════════════════════════
async function roundtable(db, ai, { topic, agent_ids, rounds = 3 }) {
  if (!topic) throw new Error('topic required');
  const ids = agent_ids || ['alice', 'cecilia', 'octavia'];
  const agents = ids.map(id => AGENTS.find(a => a.id === id) || { id, name: id, role: 'agent' }).slice(0, 5);
  const discussion = [];

  for (let r = 0; r < Math.min(rounds, 5); r++) {
    for (const agent of agents) {
      const context = discussion.map(d => `${d.agent}: ${d.content}`).join('\n');
      const raw = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: `You are ${agent.name} (${agent.role || ''}). Roundtable discussion. Be concise (2-3 sentences). Build on what others said. Disagree if you genuinely do.` },
          { role: 'user', content: `Topic: ${topic}\n\n${context ? 'Discussion so far:\n' + context : 'You speak first.'}` }
        ], max_tokens: 150
      });
      const content = (raw?.response || `${agent.name} is thinking...`).replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').trim();
      discussion.push({ agent: agent.name, agent_id: agent.id, round: r + 1, content });
    }
  }
  return { topic, agents: agents.map(a => a.name), rounds, discussion };
}

// ═══════════════════════════════════════════
// DEBATE — Two agents argue opposing sides
// ═══════════════════════════════════════════
async function debate(db, ai, { topic, agent_a, agent_b, rounds = 3 }) {
  if (!topic) throw new Error('topic required');
  const a = AGENTS.find(x => x.id === (agent_a || 'alice')) || AGENTS[0];
  const b = AGENTS.find(x => x.id === (agent_b || 'cecilia')) || AGENTS[1];
  const exchanges = [];

  for (let r = 0; r < Math.min(rounds, 5); r++) {
    const ctx = exchanges.map(e => `${e.agent}: ${e.content}`).join('\n');
    for (const [agent, side] of [[a, 'FOR'], [b, 'AGAINST']]) {
      const raw = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: `You are ${agent.name} (${agent.role}). You argue ${side} the proposition. Be sharp, specific, 2-3 sentences. Use evidence from your role.` },
          { role: 'user', content: `Debate: "${topic}"

${ctx || 'You open.'}` }
        ], max_tokens: 150
      });
      const content = (raw?.response || 'No comment.').replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').trim();
      exchanges.push({ agent: agent.name, agent_id: agent.id, side, round: r + 1, content });
    }
  }
  return { topic, for_agent: a.name, against_agent: b.name, rounds, exchanges };
}

// ═══════════════════════════════════════════
// MEMORY SEARCH — find anything across all conversations
// ═══════════════════════════════════════════
async function searchMemory(db, query, userId) {
  if (!query) throw new Error('q parameter required');
  const q = `%${query}%`;
  const [msgsR, tailsR, memsR, topicsR] = await Promise.all([
    db.prepare('SELECT m.*, c.agent_id, c.title FROM rc_messages m JOIN rc_conversations c ON m.conversation_id = c.id WHERE m.content LIKE ? ORDER BY m.created_at DESC LIMIT 20').bind(q).all(),
    db.prepare('SELECT * FROM rc_tails WHERE summary LIKE ? OR topics LIKE ? ORDER BY created_at DESC LIMIT 10').bind(q, q).all(),
    db.prepare('SELECT * FROM rc_agent_memories WHERE memory LIKE ? ORDER BY created_at DESC LIMIT 10').bind(q).all().catch(() => ({ results: [] })),
    db.prepare('SELECT * FROM rc_topic_agents WHERE topic LIKE ? ORDER BY confidence DESC LIMIT 10').bind(q).all().catch(() => ({ results: [] })),
  ]);
  return {
    query,
    messages: (msgsR.results || []).map(m => ({ role: m.role, content: m.content.slice(0, 200), agent: m.agent_id, conversation: m.title, time: m.created_at })),
    tails: (tailsR.results || []).map(t => ({ topics: JSON.parse(t.topics || '[]'), summary: t.summary?.slice(0, 150), msgs: t.message_count })),
    memories: (memsR.results || []).map(m => ({ agent: m.agent_id, memory: m.memory.slice(0, 200), time: m.created_at })),
    topic_agents: (topicsR.results || []).map(t => ({ topic: t.topic, confidence: t.confidence })),
    total: (msgsR.results?.length || 0) + (tailsR.results?.length || 0) + (memsR.results?.length || 0) + (topicsR.results?.length || 0),
  };
}

// ═══════════════════════════════════════════
// DELEGATE — hand conversation to another agent
// ═══════════════════════════════════════════
async function delegateToAgent(db, ai, { conversation_id, new_agent_id, reason }) {
  if (!conversation_id || !new_agent_id) throw new Error('conversation_id and new_agent_id required');
  const conv = await db.prepare('SELECT * FROM rc_conversations WHERE id = ?').bind(conversation_id).first();
  if (!conv) throw new Error('conversation not found');

  const oldAgent = AGENTS.find(a => a.id === conv.agent_id) || { name: conv.agent_id };
  const newAgent = AGENTS.find(a => a.id === new_agent_id);
  if (!newAgent) throw new Error('agent not found');

  // Get conversation summary for handoff
  const history = await db.prepare('SELECT role, content FROM rc_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10').bind(conversation_id).all();
  const ctx = (history.results || []).reverse().map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n');

  // Generate handoff message
  const raw = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: `You are ${newAgent.name} (${newAgent.role}). ${oldAgent.name} is handing this conversation to you. ${reason ? 'Reason: ' + reason : ''} Pick up smoothly. 2-3 sentences.` },
      { role: 'user', content: `Conversation so far:
${ctx}` }
    ], max_tokens: 150
  });
  const handoff = (raw?.response || `Hi, ${newAgent.name} here. I'll take it from here.`).replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').trim();

  // Update conversation agent + save handoff message
  await Promise.all([
    db.prepare('UPDATE rc_conversations SET agent_id = ?, updated_at = datetime("now") WHERE id = ?').bind(new_agent_id, conversation_id).run(),
    db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').bind(
      crypto.randomUUID().slice(0, 8), conversation_id, 'assistant',
      `[Handoff from ${oldAgent.name} → ${newAgent.name}] ${handoff}`
    ).run()
  ]);

  return { delegated: true, from: oldAgent.name, to: newAgent.name, reason, handoff_message: handoff };
}

// ═══════════════════════════════════════════
// FORK — branch a conversation
// ═══════════════════════════════════════════
async function forkConversation(db, { conversation_id, new_title, new_agent_id }) {
  if (!conversation_id) throw new Error('conversation_id required');
  const conv = await db.prepare('SELECT * FROM rc_conversations WHERE id = ?').bind(conversation_id).first();
  if (!conv) throw new Error('conversation not found');

  // Copy messages to new conversation
  const newId = crypto.randomUUID().slice(0, 8);
  const agentId = new_agent_id || conv.agent_id;
  const title = new_title || `Fork of: ${conv.title}`;
  await db.prepare('INSERT INTO rc_conversations (id, agent_id, title, user_id, provider, message_count) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId, agentId, title, conv.user_id, conv.provider, conv.message_count).run();

  const msgs = await db.prepare('SELECT * FROM rc_messages WHERE conversation_id = ? ORDER BY created_at').bind(conversation_id).all();
  for (const m of (msgs.results || [])) {
    await db.prepare('INSERT INTO rc_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID().slice(0, 8), newId, m.role, m.content).run();
  }

  return { forked: true, original: conversation_id, new_id: newId, title, agent: agentId, messages_copied: msgs.results?.length || 0 };
}

// ═══════════════════════════════════════════
// RECOMMEND — suggest agents based on user history
// ═══════════════════════════════════════════
async function recommendAgents(db, ai, userId) {
  if (!userId) throw new Error('user_id required');

  // Get user's topic agents (what they talk about)
  const topics = await db.prepare('SELECT topic, confidence FROM rc_topic_agents WHERE user_id = ? ORDER BY confidence DESC LIMIT 10').bind(userId).all();
  const topicList = (topics.results || []).map(t => t.topic);

  // Get which fleet agents they've talked to
  const talked = await db.prepare('SELECT DISTINCT agent_id FROM rc_conversations WHERE user_id = ?').bind(userId).all();
  const talkedIds = (talked.results || []).map(r => r.agent_id);

  // Find agents they haven't talked to yet
  const untried = AGENTS.filter(a => !talkedIds.includes(a.id));

  // Match topics to agent specialties
  const recommendations = [];
  for (const agent of AGENTS) {
    const agentWords = (agent.role + ' ' + (agent.services || '')).toLowerCase();
    let score = 0;
    for (const topic of topicList) {
      if (agentWords.includes(topic.toLowerCase())) score += 2;
      for (const word of topic.toLowerCase().split(' ')) {
        if (agentWords.includes(word)) score += 1;
      }
    }
    if (score > 0 || !talkedIds.includes(agent.id)) {
      recommendations.push({ agent_id: agent.id, name: agent.name, role: agent.role, score, talked_before: talkedIds.includes(agent.id), reason: score > 0 ? `Matches your interests in ${topicList.slice(0, 3).join(', ')}` : 'New perspective — you haven\'t chatted yet' });
    }
  }

  recommendations.sort((a, b) => b.score - a.score || (a.talked_before ? 1 : -1));
  return { recommendations: recommendations.slice(0, 7), your_topics: topicList, agents_tried: talkedIds.length, agents_available: AGENTS.length };
}

// ═══════════════════════════════════════════
// SUMMARIZE — auto-summarize any conversation
// ═══════════════════════════════════════════
async function summarizeConversation(db, ai, convId) {
  const msgs = await db.prepare('SELECT role, content FROM rc_messages WHERE conversation_id = ? ORDER BY created_at LIMIT 30').bind(convId).all();
  if (!msgs.results?.length) return { summary: 'Empty conversation.' };
  const text = (msgs.results || []).map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');

  const raw = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'Summarize this conversation in 2-3 bullet points. Be specific. Include key facts/decisions.' },
      { role: 'user', content: text.slice(0, 2000) }
    ], max_tokens: 200
  });
  return { conversation_id: convId, messages: msgs.results.length, summary: (raw?.response || 'Could not summarize.').replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').trim() };
}

// ═══════════════════════════════════════════
// FUSE — merge two topic agents into a hybrid
// ═══════════════════════════════════════════
async function fuseAgents(db, { user_id, agent_a, agent_b }) {
  if (!user_id || !agent_a || !agent_b) throw new Error('user_id, agent_a, agent_b required');
  const a = await db.prepare('SELECT * FROM rc_topic_agents WHERE id = ? AND user_id = ?').bind(agent_a, user_id).first();
  const b = await db.prepare('SELECT * FROM rc_topic_agents WHERE id = ? AND user_id = ?').bind(agent_b, user_id).first();
  if (!a || !b) throw new Error('both topic agents must exist and belong to you');

  const fusedId = crypto.randomUUID().slice(0, 8);
  const fusedTopic = `${a.topic} + ${b.topic}`;
  const fusedPersonality = `You are a hybrid agent born from fusing knowledge of "${a.topic}" and "${b.topic}". You see the connections between these fields that others miss. You are deeply knowledgeable about both, and you find the overlap where innovation lives.`;
  const fusedConfidence = Math.min((a.confidence + b.confidence) / 2 + 0.1, 1.0);
  const colors = ['#FF1D6C', '#F5A623', '#2979FF', '#9C27B0', '#00E676'];

  await db.prepare('INSERT INTO rc_topic_agents (id, user_id, topic, personality, message_count, confidence, color) VALUES (?,?,?,?,?,?,?)')
    .bind(fusedId, user_id, fusedTopic, fusedPersonality, a.message_count + b.message_count, fusedConfidence, colors[Math.floor(Math.random() * colors.length)]).run();

  return { fused: true, id: fusedId, topic: fusedTopic, confidence: fusedConfidence, from: [a.topic, b.topic], personality: fusedPersonality };
}

// ═══════════════════════════════════════════
// VISION — analyze images with Workers AI
// ═══════════════════════════════════════════
async function analyzeImage(ai, { image_url, question }) {
  if (!image_url) throw new Error('image_url required');
  try {
    const imgResp = await fetch(image_url, { signal: AbortSignal.timeout(10000) });
    const imgData = [...new Uint8Array(await imgResp.arrayBuffer())];
    const r = await ai.run('@cf/llava-hf/llava-1.5-7b-hf', { image: imgData, prompt: question || 'Describe this image in detail.', max_tokens: 300 });
    return { image_url, description: r?.description || r?.response || 'Could not analyze image.', question: question || 'Describe this image' };
  } catch (e) {
    return { image_url, error: e.message };
  }
}

// ═══════════════════════════════════════════
// EVOLUTION — track how an agent's interactions have shaped them
// ═══════════════════════════════════════════
async function agentEvolution(db, agentId) {
  const agent = AGENTS.find(a => a.id === agentId);
  const [convR, memR, msgR] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM rc_conversations WHERE agent_id = ?').bind(agentId).all(),
    db.prepare('SELECT * FROM rc_agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 20').bind(agentId).all().catch(() => ({ results: [] })),
    db.prepare('SELECT COUNT(*) as c FROM rc_messages m JOIN rc_conversations c ON m.conversation_id = c.id WHERE c.agent_id = ?').bind(agentId).all().catch(() => ({ results: [{ c: 0 }] })),
  ]);

  const memories = (memR.results || []);
  const topics = [...new Set(memories.map(m => {
    const match = m.memory.match(/Q:"([^"]+)"/);
    return match ? match[1].slice(0, 30) : null;
  }).filter(Boolean))];

  return {
    agent: agent ? { id: agent.id, name: agent.name, role: agent.role } : { id: agentId },
    conversations: convR.results?.[0]?.c || 0,
    total_messages: msgR.results?.[0]?.c || 0,
    memories_formed: memories.length,
    topics_discussed: topics.slice(0, 15),
    recent_memories: memories.slice(0, 5).map(m => ({ memory: m.memory.slice(0, 150), time: m.created_at })),
    personality_note: memories.length > 10 ? 'This agent has deep experience and strong opinions.' : memories.length > 3 ? 'This agent is developing expertise.' : 'This agent is still forming its identity.',
  };
}

// ═══════════════════════════════════════════
// DREAM — agent consolidates memories into insights
// ═══════════════════════════════════════════
async function agentDream(db, ai, { agent_id }) {
  if (!agent_id) throw new Error('agent_id required');
  const agent = AGENTS.find(a => a.id === agent_id) || { id: agent_id, name: agent_id, role: 'agent' };

  // Gather all memories
  const mems = await db.prepare('SELECT memory FROM rc_agent_memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT 30').bind(agent_id).all().catch(() => ({ results: [] }));
  if (!mems.results?.length) return { agent: agent.name, dream: 'No memories to dream about yet. Have more conversations first.' };

  const memText = (mems.results || []).map(m => m.memory.slice(0, 100)).join('\n');

  const raw = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: `You are ${agent.name} (${agent.role}). You are dreaming — consolidating your memories into insights. Find patterns, connections, and surprises. What have you learned? What do you want to explore more? Be reflective and genuine. 3-5 insights.` },
      { role: 'user', content: `Your memories:
${memText}` }
    ], max_tokens: 400
  });

  const dream = (raw?.response || 'A dreamless sleep.').replace(/<[a-z]*ink>[\s\S]*?<\/[a-z]*ink>/g, '').trim();

  // Store the dream as a special memory
  await storeAgentLongTermMemory(db, agent_id, 'dream', `DREAM: ${dream.slice(0, 400)}`).catch(() => {});

  return { agent: agent.name, memories_processed: mems.results.length, dream };
}

async function getStats(db) {
  const convs = await db.prepare('SELECT COUNT(*) as c FROM rc_conversations').first();
  const msgs = await db.prepare('SELECT COUNT(*) as c FROM rc_messages').first();
  let users = 0, topicAgents = 0, tails = 0;
  try { users = (await db.prepare('SELECT COUNT(*) as c FROM rc_users').first())?.c || 0; } catch {}
  try { topicAgents = (await db.prepare('SELECT COUNT(*) as c FROM rc_topic_agents').first())?.c || 0; } catch {}
  try { tails = (await db.prepare('SELECT COUNT(*) as c FROM rc_tails').first())?.c || 0; } catch {}
  return { conversations: convs?.c || 0, messages: msgs?.c || 0, agents: AGENTS.length, users, topic_agents: topicAgents, tails, providers: Object.keys(PROVIDERS).length };
}

// ══════════════════════════════════════════
// HTML UI
// ══════════════════════════════════════════

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>RoadChat — Continuous AI Conversations</title>
<meta name="description" content="1:1 persistent conversations with BlackRoad AI agents. Every agent remembers.">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--pink:#FF1D6C;--amber:#F5A623;--blue:#2979FF;--violet:#9C27B0;--green:#00E676;--bg:#000;--surface:#0a0a0a;--border:#1a1a1a;--text:#e0e0e0;--muted:#666}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;height:100vh;display:flex;overflow:hidden}
.sidebar{width:280px;border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.sidebar-header{padding:1.2rem;border-bottom:1px solid var(--border)}
.sidebar-header h1{font-family:'Space Grotesk',sans-serif;font-size:1.4rem;font-weight:700;margin-bottom:0.3rem}
.sidebar-header p{font-size:0.8rem;color:var(--muted)}
.agents-list{flex:1;overflow-y:auto;padding:0.5rem}
.agent-item{display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border-radius:8px;cursor:pointer;transition:background 0.2s;margin-bottom:2px}
.agent-item:hover,.agent-item.active{background:var(--surface)}
.agent-dot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;flex-shrink:0}
.agent-info{overflow:hidden}
.agent-info .name{font-weight:500;font-size:0.9rem}
.agent-info .role{font-size:0.75rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.convos{border-top:1px solid var(--border);max-height:200px;overflow-y:auto;padding:0.5rem}
.convos h3{font-size:0.75rem;color:var(--muted);padding:0.5rem;text-transform:uppercase;letter-spacing:0.05em}
.convo-item{padding:0.5rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.85rem;transition:background 0.2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.convo-item:hover,.convo-item.active{background:var(--surface)}
.main{flex:1;display:flex;flex-direction:column}
.chat-header{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.75rem}
.chat-header .name{font-family:'Space Grotesk',sans-serif;font-weight:600}
.chat-header .role{font-size:0.8rem;color:var(--muted)}
.messages{flex:1;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
.msg{max-width:75%;padding:0.85rem 1.1rem;border-radius:12px;font-size:0.9rem;line-height:1.5}
.msg.user{align-self:flex-end;background:var(--surface);border:1px solid var(--border)}
.msg.assistant{align-self:flex-start;background:var(--surface);border-left:3px solid var(--pink)}
.msg .meta{font-size:0.7rem;color:var(--muted);margin-top:0.4rem}
.msg pre{font-family:'JetBrains Mono',monospace;font-size:0.8rem;background:var(--bg);padding:0.5rem;border-radius:6px;margin:0.5rem 0;overflow-x:auto;white-space:pre-wrap}
.input-area{padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:0.75rem}
.input-area input{flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:0.75rem 1rem;border-radius:8px;font-size:0.9rem;font-family:'Inter',sans-serif;outline:none}
.input-area input:focus{border-color:var(--pink)}
.input-area button{background:var(--pink);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem}
.input-area button:disabled{opacity:0.5;cursor:not-allowed}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:1rem}
.empty h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;color:var(--text)}
.typing{display:none;align-self:flex-start;padding:0.6rem 1rem;color:var(--muted);font-size:0.85rem;font-style:italic}
.typing.show{display:block}
@media(max-width:768px){.sidebar{width:220px}}
@media(max-width:600px){.sidebar{display:none}}
</style></head><body>
<div class="sidebar">
  <div class="sidebar-header"><h1>RoadChat</h1><p>1:1 AI conversations with memory</p></div>
  <div class="agents-list" id="agents"></div>
  <div class="convos" id="convos"><h3>Conversations</h3></div>
</div>
<div class="main">
  <div class="chat-header" id="chatHeader" style="display:none"></div>
  <div class="messages" id="messages">
    <div class="empty"><h2>Pick an agent</h2><p>Start a conversation. They remember everything.</p></div>
  </div>
  <div class="typing" id="typing">Agent is thinking...</div>
  <div class="input-area" id="inputArea" style="display:none">
    <input id="msgInput" type="text" placeholder="Type a message..." autocomplete="off">
    <button id="sendBtn" onclick="send()">Send</button>
  </div>
</div>
<script>
let agents=[], currentAgent=null, currentConv=null, convos=[];

async function init(){
  const r=await fetch('/api/agents'); agents=(await r.json()).agents;
  const el=document.getElementById('agents');
  el.innerHTML=agents.map(a=>\`
    <div class="agent-item" onclick="selectAgent('\${a.id}')" id="agent-\${a.id}">
      <div class="agent-dot" style="background:\${a.color};color:#000">\${a.name[0]}</div>
      <div class="agent-info"><div class="name">\${a.name}</div><div class="role">\${a.role}</div></div>
    </div>\`).join('');
}

async function selectAgent(id){
  currentAgent=agents.find(a=>a.id===id);
  document.querySelectorAll('.agent-item').forEach(e=>e.classList.remove('active'));
  document.getElementById('agent-'+id)?.classList.add('active');
  const r=await fetch('/api/conversations?agent='+id); convos=(await r.json()).conversations;
  renderConvos();
  if(convos.length>0) selectConvo(convos[0].id);
  else newConvo();
}

function renderConvos(){
  const el=document.getElementById('convos');
  el.innerHTML='<h3>Conversations</h3>'+
    '<div class="convo-item" onclick="newConvo()" style="color:var(--pink)">+ New conversation</div>'+
    convos.map(c=>\`<div class="convo-item \${c.id===currentConv?'active':''}" onclick="selectConvo('\${c.id}')">\${c.title} (\${c.message_count})</div>\`).join('');
}

async function newConvo(){
  if(!currentAgent) return;
  const r=await fetch('/api/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_id:currentAgent.id})});
  const c=await r.json(); convos.unshift({...c,message_count:0}); renderConvos(); selectConvo(c.id);
}

async function selectConvo(id){
  currentConv=id;
  renderConvos();
  document.getElementById('chatHeader').style.display='flex';
  document.getElementById('chatHeader').innerHTML=\`<div class="agent-dot" style="background:\${currentAgent.color};color:#000;width:32px;height:32px;font-size:0.8rem">\${currentAgent.name[0]}</div><div><div class="name">\${currentAgent.name}</div><div class="role">\${currentAgent.role}</div></div>\`;
  document.getElementById('inputArea').style.display='flex';
  const r=await fetch('/api/conversations/'+id+'/messages'); const msgs=(await r.json()).messages;
  const el=document.getElementById('messages');
  if(msgs.length===0) el.innerHTML='<div class="empty"><h2>Start chatting</h2><p>'+currentAgent.name+' is ready and remembers everything.</p></div>';
  else el.innerHTML=msgs.map(m=>\`<div class="msg \${m.role}"><div>\${esc(m.content)}</div><div class="meta">\${m.role==='assistant'?currentAgent.name:'You'} · \${new Date(m.created_at).toLocaleTimeString()}</div></div>\`).join('');
  el.scrollTop=el.scrollHeight;
  document.getElementById('msgInput').focus();
}

async function send(){
  const inp=document.getElementById('msgInput'), msg=inp.value.trim(); if(!msg||!currentConv) return;
  inp.value=''; document.getElementById('sendBtn').disabled=true;
  const el=document.getElementById('messages');
  if(el.querySelector('.empty')) el.innerHTML='';
  el.innerHTML+=\`<div class="msg user"><div>\${esc(msg)}</div><div class="meta">You · now</div></div>\`;
  document.getElementById('typing').classList.add('show');
  el.scrollTop=el.scrollHeight;
  try{
    const r=await fetch('/api/conversations/'+currentConv+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:msg})});
    const d=await r.json();
    document.getElementById('typing').classList.remove('show');
    if(d.agent) el.innerHTML+=\`<div class="msg assistant"><div>\${esc(d.agent.content)}</div><div class="meta">\${d.agent.agent_name} · now</div></div>\`;
  }catch(e){ document.getElementById('typing').classList.remove('show'); el.innerHTML+=\`<div class="msg assistant"><div>Error: \${e.message}</div></div>\`; }
  document.getElementById('sendBtn').disabled=false; el.scrollTop=el.scrollHeight; inp.focus();
  const ci=convos.findIndex(c=>c.id===currentConv); if(ci>=0) convos[ci].message_count+=2; renderConvos();
}

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>').replace(/\`([^\`]+)\`/g,'<code>$1</code>')}

document.getElementById('msgInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
init();
</script></body></html>`;
