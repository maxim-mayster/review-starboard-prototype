const OWNER_REPO = process.env.GITHUB_REPO || 'maxim-mayster/review-starboard-prototype';
const DATA_PATH = process.env.GITHUB_DATA_PATH || 'data/starboard-state.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PIN = process.env.ADMIN_PIN;

const DEFAULT_STATE = {
  employees: [
    { id: 'brandon-r', name: 'Brandon R.', stars: 7, reviewCount: 6 },
    { id: 'marcus-j', name: 'Marcus J.', stars: 5, reviewCount: 5 },
    { id: 'alyssa-m', name: 'Alyssa M.', stars: 4, reviewCount: 4 },
    { id: 'monica-v', name: 'Monica V.', stars: 4, reviewCount: 4 },
    { id: 'chris-t', name: 'Chris T.', stars: 3, reviewCount: 3 }
  ],
  reviews: [
    { employeeId: 'brandon-r', platform: 'Google' },
    { employeeId: 'marcus-j', platform: 'Facebook' },
    { employeeId: 'alyssa-m', platform: 'Google' },
    { employeeId: 'monica-v', platform: 'Yelp' },
    { employeeId: 'brandon-r', platform: 'Google' }
  ],
  settings: {
    background: '',
    logo: '',
    blur: 8,
    overlay: 35
  },
  updatedAt: new Date().toISOString()
};

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeState(input) {
  const employees = Array.isArray(input?.employees) ? input.employees : DEFAULT_STATE.employees;
  const reviews = Array.isArray(input?.reviews) ? input.reviews : [];
  const settings = input?.settings && typeof input.settings === 'object' ? input.settings : {};

  return {
    employees: employees.map((employee) => ({
      id: String(employee.id || crypto.randomUUID()),
      name: String(employee.name || 'Unnamed employee').slice(0, 80),
      stars: Number.isFinite(Number(employee.stars)) ? Number(employee.stars) : 0,
      reviewCount: Number.isFinite(Number(employee.reviewCount)) ? Number(employee.reviewCount) : Number(employee.stars || 0)
    })),
    reviews: reviews.slice(0, 2000).map((review) => ({
      employeeId: String(review.employeeId || ''),
      platform: ['Google', 'Facebook', 'Yelp'].includes(review.platform) ? review.platform : 'Google',
      date: review.date ? String(review.date) : undefined
    })),
    settings: {
      background: typeof settings.background === 'string' ? settings.background : '',
      logo: typeof settings.logo === 'string' ? settings.logo : '',
      blur: Number.isFinite(Number(settings.blur)) ? Number(settings.blur) : 8,
      overlay: Number.isFinite(Number(settings.overlay)) ? Number(settings.overlay) : 35
    },
    updatedAt: new Date().toISOString()
  };
}

async function githubRequest(path, options = {}) {
  if (!TOKEN) throw new Error('Missing GITHUB_TOKEN environment variable.');
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'review-starboard',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function readStateFromGitHub() {
  try {
    const file = await githubRequest(`/repos/${OWNER_REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
    const json = Buffer.from(file.content || '', 'base64').toString('utf8');
    return { state: normalizeState(JSON.parse(json)), sha: file.sha };
  } catch (error) {
    if (error.status === 404) return { state: DEFAULT_STATE, sha: null };
    throw error;
  }
}

async function writeStateToGitHub(state) {
  const current = await readStateFromGitHub();
  const body = {
    message: 'Update shared review starboard data',
    content: Buffer.from(JSON.stringify(state, null, 2)).toString('base64'),
    branch: BRANCH
  };
  if (current.sha) body.sha = current.sha;
  await githubRequest(`/repos/${OWNER_REPO}/contents/${DATA_PATH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return state;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    if (req.method === 'GET') {
      const { state } = await readStateFromGitHub();
      return send(res, 200, { ok: true, state });
    }

    if (req.method === 'POST') {
      if (ADMIN_PIN && req.headers['x-admin-pin'] !== ADMIN_PIN) {
        return send(res, 401, { ok: false, error: 'Admin PIN required.' });
      }
      const raw = await readBody(req);
      if (raw.length > 4_500_000) return send(res, 413, { ok: false, error: 'Upload is too large. Use a smaller background/logo image.' });
      const payload = JSON.parse(raw || '{}');
      const state = normalizeState(payload.state || payload);
      await writeStateToGitHub(state);
      return send(res, 200, { ok: true, state });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error.message || 'Unknown server error.' });
  }
}
