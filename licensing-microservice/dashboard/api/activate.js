import crypto from 'node:crypto';
import { getFirestoreDb } from './_firebase.js';

const MASTER_SECRET = 'zkVv79AOxNrjyFVm/VtKToJJfrY1SnwXCYfjvgYb7jU=';

function createHmacSignature(serial, hwid, clientName) {
  const message = `${serial}|${hwid}|${clientName}`;
  return crypto.createHmac('sha256', MASTER_SECRET).update(message).digest('hex');
}

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
    return res.status(503).json({
      success: false,
      error_code: 'DB_NOT_CONFIGURED',
      message: 'سيرفر التراخيص غير متصل بقاعدة البيانات بعد.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const serial = (body.p_serial || body.serial || body.serial_key || '').trim().toUpperCase();
    const hwid = (body.p_hwid || body.hwid || '').trim();
    const deviceName = (body.p_device_name || body.device_name || 'PC').trim();

    if (!serial || !hwid) {
      return res.status(400).json({
        success: false,
        error_code: 'MISSING_PARAMS',
        message: 'يرجى إدخال السيريال ومعرف العتاد HWID.'
      });
    }

    const col = db.collection('licenses');
    const query = await col.where('serial_key', '==', serial).limit(1).get();

    if (query.empty) {
      return res.status(404).json({
        success: false,
        error_code: 'INVALID_SERIAL',
        message: 'السيريال المدخل غير صحيح. يرجى التأكد من كتابته بدقة.'
      });
    }

    const doc = query.docs[0];
    const data = doc.data();

    // Check revoked
    if (data.status === 'revoked') {
      return res.status(403).json({
        success: false,
        error_code: 'LICENSE_REVOKED',
        message: 'تم إلغاء هذا الترخيص من قبل إدارة النظام.'
      });
    }

    // Check HWID mismatch
    if (data.hwid && data.hwid !== hwid) {
      return res.status(403).json({
        success: false,
        error_code: 'HARDWARE_MISMATCH',
        message: 'هذا السيريال مفعل بالفعل على جهاز كمبيوتر آخر ولا يمكن استخدامه هنا.'
      });
    }

    // Activate / Re-activate
    const activatedAt = data.activated_at || new Date().toISOString();
    const clientName = data.client_name || 'العميل';
    const notes = data.notes ? `${data.notes} | Activated on ${deviceName} at ${activatedAt}` : `Activated on ${deviceName} at ${activatedAt}`;

    await doc.ref.update({
      hwid: hwid,
      status: 'active',
      activated_at: activatedAt,
      notes: notes
    });

    const signature = createHmacSignature(serial, hwid, clientName);

    return res.status(200).json({
      success: true,
      serial_key: serial,
      client_name: clientName,
      hwid: hwid,
      activated_at: activatedAt,
      license_type: 'LIFETIME',
      signature: signature
    });
  } catch (err) {
    console.error('Activation error:', err);
    return res.status(500).json({
      success: false,
      error_code: 'SERVER_ERROR',
      message: 'حدث خطأ أثناء التفعيل: ' + (err.message || err)
    });
  }
}
