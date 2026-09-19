import crypto from 'node:crypto';
import { getFirestoreDb } from './_firebase.js';

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

  let db = null;
  try {
    db = getFirestoreDb();
  } catch (err) {
    return res.status(500).json({ error: 'خطأ في تهيئة Firebase: ' + err.message });
  }

  // --- 1. FIREBASE FIRESTORE PATH (Recommended & Never Sleeps) ---
  if (db) {
    try {
      const col = db.collection('licenses');

      if (req.method === 'GET') {
        const snapshot = await col.orderBy('created_at', 'desc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(data);
      }

      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        if (body.action === 'reset') {
          if (!body.id) return res.status(400).json({ error: 'Missing license ID' });
          const docRef = col.doc(body.id);
          await docRef.update({ hwid: null, status: 'unactivated' });
          const updated = await docRef.get();
          return res.status(200).json({ id: updated.id, ...updated.data() });
        }

        if (body.action === 'status') {
          if (!body.id) return res.status(400).json({ error: 'Missing license ID' });
          const docRef = col.doc(body.id);
          await docRef.update({ status: body.status });
          const updated = await docRef.get();
          return res.status(200).json({ id: updated.id, ...updated.data() });
        }

        const serialKey = generateSerialNumber();
        const docData = {
          serial_key: serialKey,
          client_name: (body.client_name || '').trim(),
          status: 'unactivated',
          notes: body.notes ? body.notes.trim() : null,
          hwid: null,
          activated_at: null,
          created_at: new Date().toISOString()
        };
        const docRef = await col.add(docData);
        return res.status(200).json({ id: docRef.id, ...docData });
      }

      if (req.method === 'DELETE') {
        const id = req.query.id || (req.body && req.body.id);
        if (!id) return res.status(400).json({ error: 'Missing license ID' });
        await col.doc(id).delete();
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('Firestore error:', err);
      return res.status(500).json({ error: 'Firestore error: ' + (err.message || err) });
    }
  }

  // --- 2. SUPABASE FALLBACK (If SUPABASE_URL and service key are provided) ---
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (SUPABASE_URL && SUPABASE_SECRET_KEY && !SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
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

  // --- 3. DATABASE NOT CONFIGURED YET ---
  return res.status(503).json({
    error: 'قاعدة البيانات غير متصلة بعد. يرجى تزويد متغيرات Firebase (FIREBASE_SERVICE_ACCOUNT أو FIREBASE_PROJECT_ID و FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY) في إعدادات Vercel.'
  });
}
