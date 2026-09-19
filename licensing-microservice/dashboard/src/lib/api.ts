import type { License, CreateLicensePayload } from './types';

export async function getLicenses(): Promise<License[]> {
  const res = await fetch('/api/licenses');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`فشل جلب التراخيص (${res.status}): ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('الخادم لم يرجع بيانات JSON صالحة (مسار /api/licenses لم يتم تفعيله كـ Serverless Function بعد).');
  }
  const list = await res.json();
  if (list && Array.isArray(list.data)) {
    return list.data;
  }
  if (Array.isArray(list)) {
    return list;
  }
  if (list && typeof list === 'object' && (list.message || list.error)) {
    throw new Error(list.message || list.error);
  }
  return [];
}

export async function createLicense(payload: CreateLicensePayload): Promise<License> {
  const churchName = (payload.church_name || payload.client_name || '').trim();
  let notes = (payload.notes || '').trim();

  if (payload.user_name && payload.user_name.trim()) {
    const user = payload.user_name.trim();
    notes = notes ? `${user} - ${notes}` : user;
  }

  if (payload.services && payload.services.length > 0) {
    const servicesTag = `[خدمات: ${payload.services.join('، ')}]`;
    notes = notes ? `${notes} | ${servicesTag}` : servicesTag;
  }

  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: churchName,
      notes: notes || undefined
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`فشل إنشاء الترخيص: ${text}`);
  }

  const created = await res.json();
  if (created && created.data) {
    return created.data;
  }
  if (Array.isArray(created)) {
    return created[0];
  }
  return created;
}

export async function resetLicenseHwid(id: string): Promise<License> {
  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset', id })
  });

  if (!res.ok) {
    throw new Error('فشل فك ربط الجهاز');
  }

  const updated = await res.json();
  if (updated && updated.data) return updated.data;
  if (Array.isArray(updated)) return updated[0];
  return updated;
}

export async function updateLicenseStatus(id: string, status: 'unactivated' | 'active' | 'revoked'): Promise<License> {
  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', id, status })
  });

  if (!res.ok) {
    throw new Error('فشل تعديل حالة الترخيص');
  }

  const updated = await res.json();
  if (updated && updated.data) return updated.data;
  if (Array.isArray(updated)) return updated[0];
  return updated;
}

export async function deleteLicense(id: string): Promise<void> {
  const res = await fetch(`/api/licenses?id=${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    throw new Error('فشل حذف الترخيص');
  }
}


