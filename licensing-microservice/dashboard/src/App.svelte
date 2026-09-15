<script lang="ts">
  import { onMount } from 'svelte';
  import type { License } from './lib/types';
  import { getLicenses, createLicense, resetLicenseHwid, updateLicenseStatus, deleteLicense } from './lib/api';
  import Navbar from './components/Navbar.svelte';
  import StatsCards from './components/StatsCards.svelte';
  import LicenseTable from './components/LicenseTable.svelte';
  import NewLicenseModal from './components/NewLicenseModal.svelte';
  import AdminPinModal from './components/AdminPinModal.svelte';

  let isAuthenticated = $state<boolean>(false);
  let licenses = $state<License[]>([]);
  let isLoading = $state<boolean>(true);
  let isModalOpen = $state<boolean>(false);
  let isSubmitting = $state<boolean>(false);
  let toastMsg = $state<string | null>(null);

  function showToast(msg: string) {
    toastMsg = msg;
    setTimeout(() => {
      if (toastMsg === msg) toastMsg = null;
    }, 3500);
  }

  function handleLogout() {
    localStorage.removeItem('church_care_admin_auth');
    isAuthenticated = false;
  }

  async function loadData() {
    isLoading = true;
    try {
      const data = await getLicenses();
      licenses = Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(err);
      licenses = [];
      showToast(err.message || 'فشل تحميل البيانات من الخادم.');
    } finally {
      isLoading = false;
    }
  }

  async function handleCreate(clientName: string, notes: string) {
    isSubmitting = true;
    try {
      const created = await createLicense({ client_name: clientName, notes: notes || undefined });
      licenses = [created, ...licenses];
      showToast(`تم توليد السيريال بنجاح: ${created.serial_key}`);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleResetHwid(id: string) {
    if (!confirm('هل أنت متأكد من فك ربط هذا الجهاز؟ سيمكن هذا العميل من استخدام السيريال على جهاز آخر.')) return;
    try {
      const updated = await resetLicenseHwid(id);
      licenses = licenses.map(l => l.id === id ? updated : l);
      showToast('تم فك ربط الجهاز بنجاح!');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleToggleStatus(id: string, status: 'active' | 'revoked' | 'unactivated') {
    try {
      const updated = await updateLicenseStatus(id, status);
      licenses = licenses.map(l => l.id === id ? updated : l);
      showToast(status === 'revoked' ? 'تم إلغاء الترخيص.' : 'تم تفعيل الترخيص.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الترخيص نهائياً من قاعدة البيانات؟')) return;
    try {
      await deleteLicense(id);
      licenses = licenses.filter(l => l.id !== id);
      showToast('تم حذف الترخيص بنجاح.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadDataSilently() {
    if (!isAuthenticated) return;
    try {
      const fresh = await getLicenses();
      if (Array.isArray(fresh)) {
        licenses = fresh;
      }
    } catch {
      // Keep existing data quietly on background fetch failure
    }
  }

  onMount(() => {
    const auth = localStorage.getItem('church_care_admin_auth');
    if (auth === 'authenticated_320702') {
      isAuthenticated = true;
      loadData();
    } else {
      isAuthenticated = false;
      isLoading = false;
    }

    const interval = setInterval(() => {
      if (isAuthenticated && !isSubmitting) {
        loadDataSilently();
      }
    }, 3000);

    return () => clearInterval(interval);
  });
</script>

<AdminPinModal
  isOpen={!isAuthenticated}
  onSuccess={() => {
    isAuthenticated = true;
    loadData();
  }}
/>

{#if isAuthenticated}
  <main class="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <Navbar
        onOpenNewModal={() => isModalOpen = true}
        onRefresh={loadData}
        onLogout={handleLogout}
        {isLoading}
      />

      <StatsCards {licenses} />

      <LicenseTable
        {licenses}
        onResetHwid={handleResetHwid}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        {isLoading}
      />

      <NewLicenseModal
        isOpen={isModalOpen}
        onClose={() => isModalOpen = false}
        onSubmit={handleCreate}
        {isSubmitting}
      />

      {#if toastMsg}
        <div class="fixed bottom-6 left-6 z-50 bg-indigo-600 text-white font-medium text-sm px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 border border-indigo-400/40">
          {toastMsg}
        </div>
      {/if}
    </div>
  </main>
{/if}

