<script lang="ts">
  let { onOpenNewModal, onRefresh, onLogout, isLoading = false }: {
    onOpenNewModal: () => void;
    onRefresh: () => void;
    onLogout?: () => void;
    isLoading?: boolean;
  } = $props();
</script>

<header class="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-slate-800 gap-4">
  <div class="flex items-center gap-3">
    <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30">
      🛡️
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold text-white tracking-wide">ChurchCare Licensing Service</h1>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Cloud v1.0
        </span>
      </div>
      <p class="text-sm text-slate-400 mt-0.5">لوحة إدارة السيريالات والتراخيص المقفلة بالعتاد (Microservice Architecture)</p>
    </div>
  </div>

  <div class="flex items-center gap-3">
    <button
      onclick={onOpenNewModal}
      class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer text-sm"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      توليد سيريال جديد
    </button>
    <button
      onclick={onRefresh}
      disabled={isLoading}
      class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 transition cursor-pointer"
      title="تحديث البيانات"
    >
      <svg class="w-5 h-5 {isLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    </button>
    {#if onLogout}
      <button
        onclick={onLogout}
        class="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 transition cursor-pointer"
        title="قفل لوحة التحكم"
      >
        🔒
      </button>
    {/if}
  </div>
</header>
