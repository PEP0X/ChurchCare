<script lang="ts">
  import type { License } from '../lib/types';
  import { parseLicenseInfo } from '../lib/churchList';
  import {
    createTable,
    tableFeatures,
    rowSortingFeature,
    createSortedRowModel,
    sortFns,
    columnFilteringFeature,
    createFilteredRowModel,
    filterFns,
    type ColumnDef,
    type SortingState
  } from '@tanstack/svelte-table';

  let {
    licenses = [],
    onResetHwid,
    onToggleStatus,
    onDelete,
    isLoading = false
  }: {
    licenses: License[];
    onResetHwid: (id: string) => Promise<void>;
    onToggleStatus: (id: string, status: 'active' | 'revoked' | 'unactivated') => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isLoading?: boolean;
  } = $props();

  let searchQuery = $state('');
  let selectedChurchFilter = $state('ALL');
  let selectedStatusFilter = $state<'ALL' | 'active' | 'unactivated' | 'revoked'>('ALL');
  let copiedId = $state<string | null>(null);
  let sorting = $state<SortingState>([]);

  let safeLicenses = $derived(Array.isArray(licenses) ? licenses : []);

  // Compute unique churches present in current licenses
  let churchCounts = $derived(() => {
    const map = new Map<string, number>();
    for (const l of safeLicenses) {
      const name = l.client_name?.trim() || 'كنيسة عامة';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return map;
  });

  let uniqueChurchesInList = $derived(
    Array.from(churchCounts().keys()).sort((a, b) => a.localeCompare(b, 'ar'))
  );

  // Filtered dataset for the TanStack Table
  let filteredData = $derived(
    safeLicenses.filter(l => {
      const info = parseLicenseInfo(l);
      const q = searchQuery.trim().toLowerCase();

      // 1. Status Filter
      if (selectedStatusFilter !== 'ALL' && l.status !== selectedStatusFilter) {
        return false;
      }

      // 2. Church Filter
      if (selectedChurchFilter !== 'ALL') {
        if (info.churchName !== selectedChurchFilter) return false;
      }

      // 3. Search Query Filter
      if (!q) return true;

      return (
        l.serial_key.toLowerCase().includes(q) ||
        info.churchName.toLowerCase().includes(q) ||
        info.userName.toLowerCase().includes(q) ||
        (l.hwid && l.hwid.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    })
  );

  // Define TanStack Table Columns
  const columns: ColumnDef<License>[] = [
    {
      accessorKey: 'serial_key',
      id: 'serial_key',
      header: 'السيريال (Serial Key)',
      enableSorting: true,
    },
    {
      accessorKey: 'client_name',
      id: 'client_name',
      header: 'اسم الكنيسة (Church)',
      enableSorting: true,
    },
    {
      id: 'user_name',
      accessorFn: (row) => parseLicenseInfo(row).userName,
      header: 'اسم المستخدم / المسؤول',
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'الحالة',
      enableSorting: true,
    },
    {
      accessorKey: 'hwid',
      id: 'hwid',
      header: 'بصمة العتاد (HWID)',
      enableSorting: true,
    },
    {
      accessorKey: 'activated_at',
      id: 'activated_at',
      header: 'تاريخ التفعيل',
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      enableSorting: false,
    },
  ];

  // Configure TanStack Table Features
  const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    sortFns,
    filterFns,
  });

  // Create TanStack Table Instance
  const table = createTable({
    features,
    columns,
    get data() {
      return filteredData;
    },
    state: {
      get sorting() {
        return sorting;
      },
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
  });

  function copySerial(id: string, serial: string) {
    navigator.clipboard.writeText(serial);
    copiedId = id;
    setTimeout(() => {
      if (copiedId === id) copiedId = null;
    }, 2000);
  }

  function formatDate(isoStr: string | null) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص';
      const h12 = hours % 12 || 12;
      return `${y}/${m}/${day} • ${h12}:${mins} ${ampm}`;
    } catch {
      return isoStr;
    }
  }
</script>

<!-- Filter Toolbar -->
<div class="mb-6 space-y-4">
  <!-- Top row: Search input + Church filter dropdown + Connection status badge -->
  <div class="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
    <div class="flex flex-col sm:flex-row gap-3 flex-1">
      <!-- Search Input -->
      <div class="relative flex-1 sm:max-w-md">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="بحث بالسيريال، اسم الكنيسة، المستخدم، أو HWID..."
          class="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm placeholder:text-slate-500 shadow-inner"
        />
        <svg class="w-4 h-4 text-slate-500 absolute right-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        {#if searchQuery}
          <button
            onclick={() => searchQuery = ''}
            class="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Church Filter Dropdown -->
      <div class="relative sm:w-72">
        <select
          bind:value={selectedChurchFilter}
          class="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 pl-8 cursor-pointer shadow-inner"
        >
          <option value="ALL">⛪ كل الكنائس ({safeLicenses.length})</option>
          {#each uniqueChurchesInList as church}
            <option value={church}>
              {church} ({churchCounts().get(church) || 0})
            </option>
          {/each}
        </select>
        <span class="absolute right-2.5 top-2.5 text-xs pointer-events-none">⛪</span>
        <span class="absolute left-3 top-3 text-slate-500 text-xs pointer-events-none">▼</span>
      </div>
    </div>

    <!-- DB status indicator & TanStack Table badge -->
    <div class="text-xs text-slate-400 flex items-center gap-3 self-end lg:self-center" dir="rtl">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]">
        ⚡ TanStack Table v9
      </span>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>مربوط بـ <bdi class="text-indigo-400 font-semibold">Supabase</bdi></span>
      </div>
    </div>
  </div>

  <!-- Status Filter Tabs -->
  <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
    <button
      type="button"
      onclick={() => selectedStatusFilter = 'ALL'}
      class="px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 {selectedStatusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'}"
    >
      <span>الكل</span>
      <span class="px-1.5 py-0.2 rounded-full text-[10px] {selectedStatusFilter === 'ALL' ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-300'}">
        {safeLicenses.length}
      </span>
    </button>

    <button
      type="button"
      onclick={() => selectedStatusFilter = 'active'}
      class="px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 {selectedStatusFilter === 'active' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 border border-slate-800'}"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      <span>المفعّلة</span>
      <span class="px-1.5 py-0.2 rounded-full text-[10px] {selectedStatusFilter === 'active' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'}">
        {safeLicenses.filter(l => l.status === 'active').length}
      </span>
    </button>

    <button
      type="button"
      onclick={() => selectedStatusFilter = 'unactivated'}
      class="px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 {selectedStatusFilter === 'unactivated' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'bg-slate-900/80 text-slate-400 hover:text-amber-300 hover:bg-slate-800 border border-slate-800'}"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      <span>غير المفعّلة</span>
      <span class="px-1.5 py-0.2 rounded-full text-[10px] {selectedStatusFilter === 'unactivated' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-300'}">
        {safeLicenses.filter(l => l.status === 'unactivated').length}
      </span>
    </button>

    <button
      type="button"
      onclick={() => selectedStatusFilter = 'revoked'}
      class="px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 {selectedStatusFilter === 'revoked' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'bg-slate-900/80 text-slate-400 hover:text-rose-300 hover:bg-slate-800 border border-slate-800'}"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
      <span>الملغاة</span>
      <span class="px-1.5 py-0.2 rounded-full text-[10px] {selectedStatusFilter === 'revoked' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-300'}">
        {safeLicenses.filter(l => l.status === 'revoked').length}
      </span>
    </button>
  </div>
</div>

<!-- TanStack Data Table Card -->
<div class="bg-gradient-to-b from-slate-900/90 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl">
  <div class="overflow-x-auto">
    <table class="w-full text-right text-xs sm:text-sm min-w-[950px]">
      <thead class="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <tr>
            {#each headerGroup.headers as header (header.id)}
              <th class="py-4 px-5 whitespace-nowrap {header.column.id === 'actions' ? 'text-center' : ''}">
                {#if header.column.getCanSort()}
                  <button
                    type="button"
                    onclick={header.column.getToggleSortingHandler()}
                    class="inline-flex items-center gap-1.5 hover:text-white transition cursor-pointer font-bold select-none group"
                  >
                    <span>{header.column.columnDef.header}</span>
                    <span class="text-xs text-slate-500 group-hover:text-indigo-400">
                      {#if header.column.getIsSorted() === 'asc'}
                        🔼
                      {:else if header.column.getIsSorted() === 'desc'}
                        🔽
                      {:else}
                        <span class="opacity-40 group-hover:opacity-100">↕</span>
                      {/if}
                    </span>
                  </button>
                {:else}
                  <span>{header.column.columnDef.header}</span>
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>

      <tbody class="divide-y divide-slate-800/60">
        {#if isLoading && licenses.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center gap-3">
                <svg class="w-7 h-7 animate-spin text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span class="text-sm">جاري تحميل بيانات التراخيص من الخادم...</span>
              </div>
            </td>
          </tr>
        {:else if table.getRowModel().rows.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="text-3xl mb-1">🔍</div>
                <div class="font-semibold text-white">
                  {searchQuery || selectedChurchFilter !== 'ALL' || selectedStatusFilter !== 'ALL' ? 'لا توجد تراخيص مطابقة لهذه المعايير.' : 'لا توجد أي تراخيص مسجلة حالياً.'}
                </div>
                <p class="text-xs text-slate-500 max-w-sm">
                  {searchQuery || selectedChurchFilter !== 'ALL' || selectedStatusFilter !== 'ALL' ? 'جرّب تعديل البحث أو اختيار كنيسة أخرى.' : 'اضغط على زر "توليد سيريال جديد" بالأعلى لإصدار أول ترخيص لكنيسة.'}
                </p>
              </div>
            </td>
          </tr>
        {:else}
          {#each table.getRowModel().rows as row (row.id)}
            {@const lic = row.original}
            {@const info = parseLicenseInfo(lic)}
            {@const churchTotal = churchCounts().get(info.churchName) || 1}

            <tr class="hover:bg-slate-800/40 transition group">
              <!-- Serial Key -->
              <td class="py-4 px-5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span class="code-font font-bold text-white tracking-wider select-all whitespace-nowrap bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800/80 shadow-sm">
                    {lic.serial_key}
                  </span>
                  <button
                    onclick={() => copySerial(lic.id, lic.serial_key)}
                    class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                    title="نسخ السيريال"
                    aria-label="نسخ السيريال"
                  >
                    {#if copiedId === lic.id}
                      <span class="text-emerald-400 text-xs font-sans font-bold flex items-center gap-1">
                        <span>✓</span>
                        <span>تم النسخ</span>
                      </span>
                    {:else}
                      📋
                    {/if}
                  </button>
                </div>
              </td>

              <!-- Church Name (Full Name Clearly Visible) -->
              <td class="py-4 px-5 font-semibold text-white max-w-sm">
                <div class="flex items-center gap-2">
                  <span class="text-base shrink-0">⛪</span>
                  <span class="leading-relaxed font-bold break-words" title={info.churchName}>
                    {info.churchName}
                  </span>
                  {#if churchTotal > 1}
                    <span class="text-[10px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/50 shrink-0 font-medium" title={`يوجد ${churchTotal} تراخيص مسجلة لهذه الكنيسة`}>
                      {churchTotal} مستخدمين
                    </span>
                  {/if}
                </div>
              </td>

              <!-- User Name / Account Owner -->
              <td class="py-4 px-5 text-slate-200 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 shrink-0">
                    👤
                  </div>
                  <div>
                    <div class="font-bold text-white">{info.userName}</div>
                    {#if info.extraNotes}
                      <div class="text-[11px] text-slate-400 truncate max-w-[200px]" title={info.extraNotes}>
                        {info.extraNotes}
                      </div>
                    {/if}
                  </div>
                </div>
              </td>

              <!-- Status Badge -->
              <td class="py-4 px-5 whitespace-nowrap">
                {#if lic.status === 'active'}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    مفعّل
                  </span>
                {:else if lic.status === 'unactivated'}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    غير مفعّل
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    ملغي
                  </span>
                {/if}
              </td>

              <!-- HWID / Device Info -->
              <td class="py-4 px-5 whitespace-nowrap">
                {#if lic.hwid}
                  <div class="space-y-1">
                    <span class="code-font text-xs bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-indigo-300 select-all whitespace-nowrap inline-block">
                      {lic.hwid}
                    </span>
                    {#if info.deviceInfo}
                      <div class="text-[10px] text-slate-400 font-sans truncate max-w-[180px]" title={info.deviceInfo}>
                        {info.deviceInfo}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <span class="text-slate-500 text-xs whitespace-nowrap bg-slate-950/40 px-2.5 py-1 rounded-xl border border-slate-800/40">
                    بانتظار الربط بجهاز
                  </span>
                {/if}
              </td>

              <!-- Activation / Creation Date -->
              <td class="py-4 px-5 text-slate-400 text-xs whitespace-nowrap" dir="ltr">
                {formatDate(lic.activated_at || lic.created_at)}
              </td>

              <!-- Actions -->
              <td class="py-4 px-5 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  {#if lic.hwid}
                    <button
                      onclick={() => onResetHwid(lic.id)}
                      class="px-2.5 py-1.5 text-xs rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition cursor-pointer whitespace-nowrap shadow-sm"
                      title="إلغاء ربط هذا الجهاز للسماح للعميل بتفعيله على كمبيوتر آخر"
                    >
                      فك الجهاز
                    </button>
                  {/if}

                  {#if lic.status !== 'revoked'}
                    <button
                      onclick={() => onToggleStatus(lic.id, 'revoked')}
                      class="px-2.5 py-1.5 text-xs rounded-xl bg-rose-950/50 text-rose-300 border border-rose-800/60 hover:bg-rose-900 transition cursor-pointer whitespace-nowrap"
                      title="إلغاء الترخيص وتعطيله"
                    >
                      إلغاء
                    </button>
                  {:else}
                    <button
                      onclick={() => onToggleStatus(lic.id, lic.hwid ? 'active' : 'unactivated')}
                      class="px-2.5 py-1.5 text-xs rounded-xl bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition cursor-pointer whitespace-nowrap"
                      title="إعادة التفعيل"
                    >
                      تفعيل
                    </button>
                  {/if}

                  <button
                    onclick={() => onDelete(lic.id)}
                    class="p-2 text-slate-500 hover:text-rose-400 transition cursor-pointer rounded-xl hover:bg-slate-800"
                    title="حذف نهائي من قاعدة البيانات"
                    aria-label="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
