import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pluijiucmbqjwnaoyyhi.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_secret_kEcp8RnS_Y0ns19mkusbng_p0ZPJTrB';

function generateSerialNumber() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(12);
  const seg1 = Array.from(bytes.slice(0, 4)).map(b => chars[b % chars.length]).join('');
  const seg2 = Array.from(bytes.slice(4, 8)).map(b => chars[b % chars.length]).join('');
  const seg3 = Array.from(bytes.slice(8, 12)).map(b => chars[b % chars.length]).join('');
  return 'CCARE-' + seg1 + '-' + seg2 + '-' + seg3;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const headers = {
    'apikey': SUPABASE_SECRET_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const resp = await fetch(SUPABASE_URL + '/rest/v1/licenses?select=*&order=created_at.desc', { headers });
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      if (body.action === 'reset') {
        const resp = await fetch(SUPABASE_URL + '/rest/v1/licenses?id=eq.' + body.id, {
          method: 'PATCH',
          headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
          body: JSON.stringify({ hwid: null, status: 'unactivated' })
        });
        const data = await resp.json();
        return res.status(resp.status).json(data[0] || data);
      }

      if (body.action === 'status') {
        const resp = await fetch(SUPABASE_URL + '/rest/v1/licenses?id=eq.' + body.id, {
          method: 'PATCH',
          headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
          body: JSON.stringify({ status: body.status })
        });
        const data = await resp.json();
        return res.status(resp.status).json(data[0] || data);
      }

      const serialKey = generateSerialNumber();
      const resp = await fetch(SUPABASE_URL + '/rest/v1/licenses', {
        method: 'POST',
        headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          serial_key: serialKey,
          client_name: (body.client_name || '').trim(),
          status: 'unactivated',
          notes: body.notes ? body.notes.trim() : null
        })
      });
      const data = await resp.json();
      return res.status(resp.status).json(data[0] || data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body && req.body.id);
      const resp = await fetch(SUPABASE_URL + '/rest/v1/licenses?id=eq.' + id, {
        method: 'DELETE',
        headers: headers
      });
      if (resp.ok) {
        return res.status(200).json({ success: true });
      }
      return res.status(resp.status).json({ error: 'Delete failed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
