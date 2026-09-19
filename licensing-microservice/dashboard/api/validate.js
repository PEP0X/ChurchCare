import { getFirestoreDb } from './_firebase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getFirestoreDb();
  if (!db) {
    return res.status(503).json({ valid: false, reason: 'DB_NOT_CONFIGURED' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const serial = (body.p_serial || body.serial || body.serial_key || '').trim().toUpperCase();
    const hwid = (body.p_hwid || body.hwid || '').trim();

    if (!serial || !hwid) {
      return res.status(400).json({ valid: false, reason: 'MISSING_PARAMS' });
    }

    const col = db.collection('licenses');
    const query = await col.where('serial_key', '==', serial).limit(1).get();

    if (query.empty) {
      return res.status(200).json({ valid: false, reason: 'NOT_FOUND', message: 'تم حذف الترخيص من قاعدة البيانات.' });
    }

    const doc = query.docs[0];
    const data = doc.data();

    if (data.status !== 'active') {
      return res.status(200).json({ valid: false, reason: 'NOT_ACTIVE', message: 'الترخيص غير نشط أو تم إلغاؤه.' });
    }

    if (!data.hwid || data.hwid !== hwid) {
      return res.status(200).json({ valid: false, reason: 'HWID_RESET', message: 'تم فك ربط هذا الجهاز من قبل المسؤول.' });
    }

    return res.status(200).json({ valid: true, client_name: data.client_name });
  } catch (err) {
    console.error('Validation error:', err);
    return res.status(500).json({ valid: false, reason: 'SERVER_ERROR', message: err.message });
  }
}
