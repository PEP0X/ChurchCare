<script lang="ts">
  let {
    onOpenNewModal,
    onExportSheet,
    onRefresh,
    onLogout,
    isLoading = false,
    totalCount = 0
  }: {
    onOpenNewModal: () => void;
    onExportSheet?: () => void;
    onRefresh: () => void;
    onLogout?: () => void;
    isLoading?: boolean;
    totalCount?: number;
  } = $props();
</script>

<header class="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-slate-800/80 gap-5">
  <div class="flex items-center gap-3.5">
    <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
      🛡️
    </div>
    <div>
      <div class="flex items-center gap-2.5 flex-wrap">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          ChurchCare Licensing Service
        </h1>
        <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          سحابي مباشر
        </span>
        {#if totalCount > 0}
          <span class="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
            {totalCount} ترخيص
          </span>
        {/if}
      </div>
      <p class="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
        <span>لوحة إدارة التراخيص المعتمدة والسيريالات المقفلة بالعتاد لكنائس الإيبارشية</span>
      </p>
    </div>
  </div>

  <div class="flex items-center gap-2.5 flex-wrap">
    <!-- Generate New Serial Button -->
    <button
      onclick={onOpenNewModal}
      class="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition cursor-pointer text-sm transform hover:-translate-y-0.5"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
      </svg>
      <span>توليد سيريال جديد</span>
    </button>

    <!-- Export to Sheet (CSV) Button -->
    {#if onExportSheet}
      <button
        onclick={onExportSheet}
        class="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-semibold px-3.5 py-2.5 rounded-2xl shadow-sm transition cursor-pointer text-sm"
        title="تصدير جدول التراخيص إلى ملف Sheet (Excel / CSV)"
      >
        <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="hidden sm:inline">تصدير Sheet</span>
      </button>
    {/if}

    <!-- Refresh Button -->
    <button
      onclick={onRefresh}
      disabled={isLoading}
      class="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer shadow-sm"
      title="تحديث البيانات من السيرفر"
      aria-label="تحديث البيانات"
    >
      <svg class="w-5 h-5 {isLoading ? 'animate-spin text-indigo-400' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    </button>

    <!-- Logout / Lock Button -->
    {#if onLogout}
      <button
        onclick={onLogout}
        class="p-2.5 rounded-2xl bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-800 hover:border-rose-900/50 transition cursor-pointer shadow-sm text-sm"
        title="قفل لوحة التحكم (خروج)"
        aria-label="قفل لوحة التحكم"
      >
        🔒
      </button>
    {/if}
  </div>
</header>
