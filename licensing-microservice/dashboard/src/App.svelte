<script lang="ts">
  import { onMount } from 'svelte';
  import { QueryClient, QueryClientProvider, createQuery } from '@tanstack/svelte-query';
  import { getLicenses, createLicense, resetLicenseHwid, updateLicenseStatus, deleteLicense } from './lib/api';
  import { getUniqueChurches, exportLicensesToCsv } from './lib/churchList';
  import Navbar from './components/Navbar.svelte';
  import StatsCards from './components/StatsCards.svelte';
  import LicenseTable from './components/LicenseTable.svelte';
  import NewLicenseModal from './components/NewLicenseModal.svelte';
  import AdminPinModal from './components/AdminPinModal.svelte';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 2,
        refetchInterval: 3000,
        refetchOnWindowFocus: true
      }
    }
  });

  let isAuthenticated = $state<boolean>(false);
  let isModalOpen = $state<boolean>(false);
  let isSubmitting = $state<boolean>(false);
  let toastMsg = $state<string | null>(null);

  // TanStack Query
  const licensesQuery = createQuery(
    () => ({
      queryKey: ['licenses'],
      queryFn: getLicenses,
      enabled: isAuthenticated
    }),
    () => queryClient
  );

  let licenses = $derived(
    Array.isArray(licensesQuery.data) ? licensesQuery.data : []
  );

  let isLoading = $derived(licensesQuery.isLoading && licenses.length === 0);

  let availableChurches = $derived(getUniqueChurches(licenses));

  function showToast(msg: string) {
    toastMsg = msg;
    setTimeout(() => {
      if (toastMsg === msg) toastMsg = null;
    }, 4000);
  }

  function handleLogout() {
    localStorage.removeItem('church_care_admin_auth');
    isAuthenticated = false;
  }

  async function handleRefresh() {
    await queryClient.invalidateQueries({ queryKey: ['licenses'] });
  }

  async function handleCreate(
    churchName: string,
    userName: string,
    notes: string,
    services?: string[]
  ) {
    isSubmitting = true;
    try {
      await createLicense({
        church_name: churchName,
        user_name: userName,
        notes: notes || undefined,
        client_name: churchName,
        services: services
      });
      await queryClient.invalidateQueries({ queryKey: ['licenses'] });
      const servicesCountText = services && services.length > 0 ? ` [${services.length} خدمات]` : '';
      showToast(`✨ تم توليد السيريال بنجاح لكنيسة "${churchName}" (${userName})${servicesCountText}`);
    } finally {
      isSubmitting = false;
    }
  }

  function handleExportSheet() {
    try {
      exportLicensesToCsv(licenses);
      showToast('📥 تم تصدير جدول التراخيص كملف Sheet (Excel / CSV) بنجاح!');
    } catch (err: any) {
      alert('خطأ أثناء التصدير: ' + err.message);
    }
  }

  async function handleResetHwid(id: string) {
    try {
      await resetLicenseHwid(id);
      await queryClient.invalidateQueries({ queryKey: ['licenses'] });
      showToast('✓ تم فك ربط الجهاز بنجاح!');
    } catch (err: any) {
      showToast('⚠️ فشل فك ربط الجهاز: ' + err.message);
    }
  }

  async function handleToggleStatus(id: string, status: 'active' | 'revoked' | 'unactivated') {
    try {
      await updateLicenseStatus(id, status);
      await queryClient.invalidateQueries({ queryKey: ['licenses'] });
      showToast(status === 'revoked' ? 'تم إلغاء الترخيص وتعطيله.' : 'تم تفعيل الترخيص بنجاح.');
    } catch (err: any) {
      showToast('⚠️ خطأ في تعديل الحالة: ' + err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLicense(id);
      await queryClient.invalidateQueries({ queryKey: ['licenses'] });
      showToast('🗑️ تم حذف الترخيص بنجاح من قاعدة البيانات.');
    } catch (err: any) {
      showToast('⚠️ فشل الحذف: ' + err.message);
    }
  }

  onMount(() => {
    const auth = localStorage.getItem('church_care_admin_auth');
    if (auth === 'authenticated_320702') {
      isAuthenticated = true;
    } else {
      isAuthenticated = false;
    }
  });
</script>

<QueryClientProvider client={queryClient}>
  <AdminPinModal
    isOpen={!isAuthenticated}
    onSuccess={() => {
      isAuthenticated = true;
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
    }}
  />

  {#if isAuthenticated}
    <main class="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-4 md:p-5 selection:bg-indigo-500 selection:text-white w-full">
      <div class="w-full mx-auto px-1 sm:px-2">
        <Navbar
          onOpenNewModal={() => (isModalOpen = true)}
          onExportSheet={handleExportSheet}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
          {isLoading}
          totalCount={licenses.length}
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
          onClose={() => (isModalOpen = false)}
          onSubmit={handleCreate}
          {isSubmitting}
          churches={availableChurches}
        />

        {#if toastMsg}
          <div class="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white font-semibold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 border border-indigo-400/40 flex items-center gap-2">
            <span>🔔</span>
            <span>{toastMsg}</span>
          </div>
        {/if}
      </div>
    </main>
  {/if}
</QueryClientProvider>
