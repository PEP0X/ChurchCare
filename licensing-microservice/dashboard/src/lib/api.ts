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
  if (!Array.isArray(list)) {
    if (list && typeof list === 'object' && (list.message || list.error)) {
      throw new Error(list.message || list.error);
    }
    return [];
  }
  return list;
}

export async function createLicense(payload: CreateLicensePayload): Promise<License> {
  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`فشل إنشاء الترخيص: ${text}`);
  }

  const created: License = await res.json();
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

  const updated: License = await res.json();
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

  const updated: License = await res.json();
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


