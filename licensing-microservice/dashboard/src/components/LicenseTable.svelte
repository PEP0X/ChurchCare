<script lang="ts">
  import type { License } from '../lib/types';
  import { parseLicenseInfo, CHURCH_SERVICES } from '../lib/churchList';
  import { arabicSearchMatch } from '../lib/arabicSearch';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { Select, Tooltip, ToggleGroup, DropdownMenu, Separator } from 'bits-ui';
  import {
    Search,
    Copy,
    Check,
    RotateCcw,
    Ban,
    Trash2,
    CheckCircle2,
    ChevronDown,
    Church,
    Layers,
    MoreHorizontal,
    Laptop,
    Shield,
    FileText
  } from '@lucide/svelte';
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
  let selectedServiceFilter = $state('ALL');
  let selectedStatusFilter = $state<string>('ALL');
  let copiedId = $state<string | null>(null);
  let sorting = $state<SortingState>([]);

  // Confirm Dialog State
  let confirmOpen = $state(false);
  let confirmTitle = $state('');
  let confirmDescription = $state('');
  let confirmVariant = $state<'danger' | 'warning' | 'info'>('danger');
  let confirmAction = $state<() => Promise<void>>(() => Promise.resolve());

  let safeLicenses = $derived(Array.isArray(licenses) ? licenses : []);

  // Unique churches
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

  // Filtered dataset with TanStack & Arabic Search
  let filteredData = $derived(
    safeLicenses.filter((l) => {
      const info = parseLicenseInfo(l);
      const q = searchQuery.trim();

      // 1. Status Filter
      if (selectedStatusFilter !== 'ALL' && l.status !== selectedStatusFilter) {
        return false;
      }

      // 2. Church Filter
      if (selectedChurchFilter !== 'ALL') {
        if (info.churchName !== selectedChurchFilter) return false;
      }

      // 3. Service Filter
      if (selectedServiceFilter !== 'ALL') {
        if (!info.services.includes(selectedServiceFilter)) return false;
      }

      // 4. Search Query with Arabic Search Normalization
      if (!q) return true;

      return (
        arabicSearchMatch(l.serial_key, q) ||
        arabicSearchMatch(info.churchName, q) ||
        arabicSearchMatch(info.userName, q) ||
        arabicSearchMatch(info.role, q) ||
        arabicSearchMatch(info.phone, q) ||
        arabicSearchMatch(info.services.join(' '), q) ||
        arabicSearchMatch(l.hwid, q) ||
        arabicSearchMatch(info.extraNotes, q) ||
        arabicSearchMatch(info.deviceInfo, q)
      );
    })
  );

  // TanStack Columns
  const columns: ColumnDef<License>[] = [
    {
      accessorKey: 'serial_key',
      id: 'serial_key',
      header: 'السيريال (Serial Key)',
      enableSorting: true
    },
    {
      accessorKey: 'client_name',
      id: 'client_name',
      header: 'اسم الكنيسة (Church)',
      enableSorting: true
    },
    {
      id: 'user_name',
      accessorFn: (row) => parseLicenseInfo(row).userName,
      header: 'اسم المستخدم / المسؤول',
      enableSorting: true
    },
    {
      id: 'services',
      accessorFn: (row) => parseLicenseInfo(row).services.join(', '),
      header: 'الخدمات المشمولة',
      enableSorting: false
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'الحالة',
      enableSorting: true
    },
    {
      accessorKey: 'hwid',
      id: 'hwid',
      header: 'بصمة العتاد (HWID)',
      enableSorting: true
    },
    {
      accessorKey: 'activated_at',
      id: 'activated_at',
      header: 'تاريخ التفعيل',
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      enableSorting: false
    }
  ];

  const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    sortFns,
    filterFns
  });

  const table = createTable({
    features,
    columns,
    get data() {
      return filteredData;
    },
    state: {
      get sorting() {
        return sorting;
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    }
  });

  function copySerial(id: string, serial: string) {
    navigator.clipboard.writeText(serial);
    copiedId = id;
    setTimeout(() => {
      if (copiedId === id) copiedId = null;
    }, 2000);
  }

  function promptResetHwid(lic: License) {
    confirmTitle = 'تأكيد فك ربط الجهاز (HWID)';
    confirmDescription = `هل تريد فك ربط ترخيص كنيسة "${lic.client_name}"؟ سيتم السماح للعميل بإعادة تفعيل السيريال على كمبيوتر أو جهاز آخر.`;
    confirmVariant = 'warning';
    confirmAction = () => onResetHwid(lic.id);
    confirmOpen = true;
  }

  function promptRevoke(lic: License) {
    confirmTitle = 'تأكيد إلغاء وتعطيل الترخيص';
    confirmDescription = `هل تريد إيقاف ترخيص كنيسة "${lic.client_name}"؟ سيتوقف البرنامج فوراً لدى العميل ولن يتمكن من الدخول.`;
    confirmVariant = 'danger';
    confirmAction = () => onToggleStatus(lic.id, 'revoked');
    confirmOpen = true;
  }

  function promptDelete(lic: License) {
    confirmTitle = 'تأكيد حذف الترخيص نهائياً';
    confirmDescription = `تحذير: سيتم حذف ترخيص "${lic.client_name}" بالسيريال (${lic.serial_key}) بشكل نهائي من قاعدة البيانات ولا يمكن استرجاعه.`;
    confirmVariant = 'danger';
    confirmAction = () => onDelete(lic.id);
    confirmOpen = true;
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

<Tooltip.Provider>
  <!-- Bits UI Confirm Dialog -->
  <ConfirmDialog
    bind:open={confirmOpen}
    title={confirmTitle}
    description={confirmDescription}
    variant={confirmVariant}
    onConfirm={confirmAction}
  />

  <!-- Filter Toolbar -->
  <div class="mb-6 space-y-4">
    <!-- Top row: Search input + Bits UI Select for Churches + Services -->
    <div class="flex flex-col xl:flex-row gap-3 justify-between items-stretch xl:items-center">
      <div class="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
        <!-- Arabic Normalized Search Input -->
        <div class="relative flex-1 sm:min-w-[280px]">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="🔍 بحث ذكي بالسيريال، الكنيسة، المستخدم، أو الخدمات..."
            class="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm placeholder:text-slate-500 shadow-inner transition"
          />
          <Search class="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          {#if searchQuery}
            <button
              type="button"
              onclick={() => (searchQuery = '')}
              class="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Church Filter (Bits-UI Select) -->
        <div class="w-full sm:w-64">
          <Select.Root type="single" bind:value={selectedChurchFilter}>
            <Select.Trigger
              class="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between shadow-inner cursor-pointer"
            >
              <div class="flex items-center gap-2 truncate">
                <Church class="w-4 h-4 text-indigo-400 shrink-0" />
                <Select.Value placeholder="⛪ كل الكنائس" />
              </div>
              <ChevronDown class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                class="z-50 min-w-[240px] max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl text-right animate-in fade-in-0 zoom-in-95"
              >
                <Select.Viewport>
                  <Select.Item
                    value="ALL"
                    label="⛪ كل الكنائس ({safeLicenses.length})"
                    class="cursor-pointer rounded-xl px-3 py-2 text-xs text-slate-200 outline-none hover:bg-indigo-600 hover:text-white data-[highlighted]:bg-indigo-600 data-[highlighted]:text-white transition"
                  >
                    ⛪ كل الكنائس ({safeLicenses.length})
                  </Select.Item>
                  {#each uniqueChurchesInList as church}
                    <Select.Item
                      value={church}
                      label="{church} ({churchCounts().get(church) || 0})"
                      class="cursor-pointer rounded-xl px-3 py-2 text-xs text-slate-200 outline-none hover:bg-indigo-600 hover:text-white data-[highlighted]:bg-indigo-600 data-[highlighted]:text-white transition"
                    >
                      {church} ({churchCounts().get(church) || 0})
                    </Select.Item>
                  {/each}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <!-- Service Filter (Bits-UI Select) -->
        <div class="w-full sm:w-60">
          <Select.Root type="single" bind:value={selectedServiceFilter}>
            <Select.Trigger
              class="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between shadow-inner cursor-pointer"
            >
              <div class="flex items-center gap-2 truncate">
                <Layers class="w-4 h-4 text-indigo-400 shrink-0" />
                <Select.Value placeholder="📋 كل الخدمات" />
              </div>
              <ChevronDown class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                class="z-50 min-w-[240px] max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl text-right animate-in fade-in-0 zoom-in-95"
              >
                <Select.Viewport>
                  <Select.Item
                    value="ALL"
                    label="📋 كل الخدمات"
                    class="cursor-pointer rounded-xl px-3 py-2 text-xs text-slate-200 outline-none hover:bg-indigo-600 hover:text-white data-[highlighted]:bg-indigo-600 data-[highlighted]:text-white transition"
                  >
                    📋 كل الخدمات
                  </Select.Item>
                  {#each CHURCH_SERVICES as serv}
                    <Select.Item
                      value={serv.name}
                      label="{serv.icon} {serv.name}"
                      class="cursor-pointer rounded-xl px-3 py-2 text-xs text-slate-200 outline-none hover:bg-indigo-600 hover:text-white data-[highlighted]:bg-indigo-600 data-[highlighted]:text-white transition"
                    >
                      <span>{serv.icon}</span>
                      <span class="mr-1.5">{serv.name}</span>
                    </Select.Item>
                  {/each}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      <!-- Badge indicator -->
      <div class="text-xs text-slate-400 flex items-center gap-3 self-end xl:self-center" dir="rtl">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]">
          ✨ Bits-UI Powered
        </span>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>مباشر Cloud Firestore</span>
        </div>
      </div>
    </div>

    <!-- Status Filter with Bits-UI ToggleGroup & Reset button -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <ToggleGroup.Root
        type="single"
        bind:value={selectedStatusFilter}
        class="inline-flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800"
      >
        <ToggleGroup.Item
          value="ALL"
          class="px-3.5 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer flex items-center gap-1.5 data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=on]:shadow-md text-slate-400 hover:text-slate-200"
        >
          <span>الكل</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/70 font-mono">
            {safeLicenses.length}
          </span>
        </ToggleGroup.Item>

        <ToggleGroup.Item
          value="active"
          class="px-3.5 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer flex items-center gap-1.5 data-[state=on]:bg-emerald-600 data-[state=on]:text-white data-[state=on]:shadow-md text-slate-400 hover:text-emerald-300"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>المفعّلة</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/70 font-mono">
            {safeLicenses.filter((l) => l.status === 'active').length}
          </span>
        </ToggleGroup.Item>

        <ToggleGroup.Item
          value="unactivated"
          class="px-3.5 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer flex items-center gap-1.5 data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:shadow-md text-slate-400 hover:text-amber-300"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>غير المفعّلة</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/70 font-mono">
            {safeLicenses.filter((l) => l.status === 'unactivated').length}
          </span>
        </ToggleGroup.Item>

        <ToggleGroup.Item
          value="revoked"
          class="px-3.5 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer flex items-center gap-1.5 data-[state=on]:bg-rose-600 data-[state=on]:text-white data-[state=on]:shadow-md text-slate-400 hover:text-rose-300"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>الملغاة</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/70 font-mono">
            {safeLicenses.filter((l) => l.status === 'revoked').length}
          </span>
        </ToggleGroup.Item>
      </ToggleGroup.Root>

      {#if searchQuery || selectedChurchFilter !== 'ALL' || selectedServiceFilter !== 'ALL' || selectedStatusFilter !== 'ALL'}
        <button
          type="button"
          onclick={() => {
            searchQuery = '';
            selectedChurchFilter = 'ALL';
            selectedServiceFilter = 'ALL';
            selectedStatusFilter = 'ALL';
          }}
          class="text-xs text-indigo-400 hover:text-white flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 px-2.5 py-1.5 rounded-xl border border-indigo-800/40 transition cursor-pointer"
        >
          <RotateCcw class="w-3 h-3" />
          <span>إعادة ضبط التصفية</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- TanStack Data Table Card -->
  <div class="bg-gradient-to-b from-slate-900/90 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl">
    <div class="overflow-x-auto">
      <table class="w-full text-right text-xs sm:text-sm">
        <thead class="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
          {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <tr>
              {#each headerGroup.headers as header (header.id)}
                <th class="py-3.5 px-2.5 sm:px-3 whitespace-nowrap font-bold text-slate-300 {header.column.id === 'actions' ? 'text-center' : ''}">
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
              <td colspan="8" class="py-16 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center gap-3">
                  <div class="w-7 h-7 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                  <span class="text-sm">جاري تحميل بيانات التراخيص من الخادم...</span>
                </div>
              </td>
            </tr>
          {:else if table.getRowModel().rows.length === 0}
            <tr>
              <td colspan="8" class="py-16 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center gap-2">
                  <div class="text-3xl mb-1">🔍</div>
                  <div class="font-semibold text-white">
                    {searchQuery || selectedChurchFilter !== 'ALL' || selectedServiceFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                      ? 'لا توجد تراخيص مطابقة لهذه المعايير.'
                      : 'لا توجد أي تراخيص مسجلة حالياً.'}
                  </div>
                  <p class="text-xs text-slate-500 max-w-sm">
                    {searchQuery || selectedChurchFilter !== 'ALL' || selectedServiceFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                      ? 'جرّب تعديل البحث أو اختيار كنيسة / خدمة أخرى.'
                      : 'اضغط على زر "توليد سيريال جديد" بالأعلى لإصدار أول ترخيص لكنيسة.'}
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
                <td class="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span class="code-font font-bold text-white tracking-wider select-all whitespace-nowrap bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800/80 shadow-sm text-xs sm:text-sm">
                      {lic.serial_key}
                    </span>

                    <Tooltip.Root delayDuration={150}>
                      <Tooltip.Trigger
                        onclick={() => copySerial(lic.id, lic.serial_key)}
                        class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                        aria-label="نسخ السيريال"
                      >
                        {#if copiedId === lic.id}
                          <span class="text-emerald-400 text-xs font-sans font-bold flex items-center gap-1">
                            <Check class="w-3.5 h-3.5" />
                            <span>تم</span>
                          </span>
                        {:else}
                          <Copy class="w-4 h-4" />
                        {/if}
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="top"
                          sideOffset={6}
                          class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-200 shadow-xl"
                        >
                          نسخ السيريال للحافظة
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                </td>

                <!-- Church Name -->
                <td class="py-3 px-2.5 sm:px-3 font-semibold text-white">
                  <div class="flex items-center gap-1.5 flex-nowrap">
                    <span class="text-base shrink-0">⛪</span>
                    <span class="font-bold text-white text-xs sm:text-sm whitespace-nowrap" title={info.churchName}>
                      {info.churchName}
                    </span>
                    {#if churchTotal > 1}
                      <span
                        class="text-[10px] bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-800/50 shrink-0 font-medium font-mono whitespace-nowrap"
                        title={`يوجد ${churchTotal} تراخيص مسجلة لهذه الكنيسة`}
                      >
                        {churchTotal} مستخدمين
                      </span>
                    {/if}
                  </div>
                </td>

                <!-- Servant Name, Role & Phone -->
                <td class="py-3 px-2.5 sm:px-3 text-slate-200 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-xs text-indigo-300 shrink-0 shadow-sm">
                      {#if info.role === 'كاهن'}
                        ✝️
                      {:else if info.role === 'أمين خدمة'}
                        ⭐
                      {:else if info.role?.includes('Data Entry') || info.role?.includes('مدخل')}
                        💻
                      {:else}
                        👤
                      {/if}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-bold text-white text-xs sm:text-sm">{info.userName}</span>
                        {#if info.role}
                          <span
                            class="text-[10px] px-1.5 py-0.2 rounded font-semibold border {info.role === 'كاهن'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/50'
                              : info.role === 'أمين خدمة'
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50'
                              : 'bg-sky-950/80 text-sky-300 border-sky-800/50'}"
                          >
                            {info.role}
                          </span>
                        {/if}
                      </div>

                      <div class="flex items-center gap-2 mt-0.5">
                        {#if info.phone}
                          <span class="text-[11px] text-emerald-400 font-mono flex items-center gap-1" dir="ltr">
                            <span>📱</span>
                            <span>{info.phone}</span>
                          </span>
                        {/if}

                        {#if info.extraNotes}
                          <span class="text-[11px] text-slate-400 truncate max-w-[140px]" title={info.extraNotes}>
                            {info.extraNotes}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- License Services Badges -->
                <td class="py-3 px-2.5 sm:px-3">
                  {#if info.services.length === 0}
                    <span class="text-slate-500 text-xs italic bg-slate-950/40 px-2 py-0.5 rounded-lg border border-slate-800/40 whitespace-nowrap">
                      شامل عام
                    </span>
                  {:else}
                    <div class="flex flex-wrap gap-1 max-w-[150px]">
                      {#each info.services as serv}
                        <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-medium whitespace-nowrap">
                          {serv}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </td>

                <!-- Status Badge -->
                <td class="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                  {#if lic.status === 'active'}
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      مفعّل
                    </span>
                  {:else if lic.status === 'unactivated'}
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      غير مفعّل
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      ملغي
                    </span>
                  {/if}
                </td>

                <!-- HWID / Device Info -->
                <td class="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                  {#if lic.hwid}
                    <div class="space-y-0.5">
                      <span class="code-font text-[11px] sm:text-xs bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-indigo-300 select-all whitespace-nowrap inline-block">
                        {lic.hwid}
                      </span>
                      {#if info.deviceInfo}
                        <div class="text-[10px] text-slate-400 font-sans truncate max-w-[150px]" title={info.deviceInfo}>
                          {info.deviceInfo}
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-slate-500 text-xs whitespace-nowrap bg-slate-950/40 px-2 py-0.5 rounded-lg border border-slate-800/40">
                      بانتظار الربط بجهاز
                    </span>
                  {/if}
                </td>

                <!-- Activation / Creation Date -->
                <td class="py-3 px-2.5 sm:px-3 text-slate-400 text-xs whitespace-nowrap" dir="ltr">
                  {formatDate(lic.activated_at || lic.created_at)}
                </td>

                <!-- Actions: Quick Action Buttons + Bits UI DropdownMenu -->
                <td class="py-3 px-2.5 sm:px-3 text-center whitespace-nowrap">
                  <div class="inline-flex items-center gap-1">
                    {#if lic.hwid}
                      <Tooltip.Root delayDuration={150}>
                        <Tooltip.Trigger
                          onclick={() => promptResetHwid(lic)}
                          class="px-2 py-1 text-xs rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition cursor-pointer whitespace-nowrap shadow-sm flex items-center gap-1"
                        >
                          <RotateCcw class="w-3 h-3" />
                          <span>فك الجهاز</span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={6}
                            class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-200 shadow-xl"
                          >
                            فك ربط هذا الجهاز لنقل الترخيص لكمبيوتر آخر
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    {/if}

                    {#if lic.status !== 'revoked'}
                      <Tooltip.Root delayDuration={150}>
                        <Tooltip.Trigger
                          onclick={() => promptRevoke(lic)}
                          class="px-2 py-1 text-xs rounded-xl bg-rose-950/50 text-rose-300 border border-rose-800/60 hover:bg-rose-900 transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                        >
                          <Ban class="w-3 h-3" />
                          <span>إلغاء</span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={6}
                            class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-200 shadow-xl"
                          >
                            إيقاف وتعطيل الترخيص مؤقتاً أو نهائياً
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    {:else}
                      <Tooltip.Root delayDuration={150}>
                        <Tooltip.Trigger
                          onclick={() => onToggleStatus(lic.id, lic.hwid ? 'active' : 'unactivated')}
                          class="px-2 py-1 text-xs rounded-xl bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                        >
                          <CheckCircle2 class="w-3 h-3" />
                          <span>تفعيل</span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={6}
                            class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-[11px] text-slate-200 shadow-xl"
                          >
                            إعادة تفعيل وتشغيل الترخيص
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    {/if}

                    <!-- Bits UI DropdownMenu for Row More Options -->
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        class="p-1.5 text-slate-400 hover:text-white transition cursor-pointer rounded-xl hover:bg-slate-800 border border-slate-800/80 shadow-sm"
                        aria-label="خيارات إضافية"
                      >
                        <MoreHorizontal class="w-4 h-4" />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          sideOffset={6}
                          class="z-50 min-w-[180px] rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl text-right animate-in fade-in-0 zoom-in-95"
                        >
                          <DropdownMenu.Item
                            onclick={() => copySerial(lic.id, lic.serial_key)}
                            class="cursor-pointer rounded-xl px-3 py-2 text-xs text-slate-200 outline-none hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition"
                          >
                            <Copy class="w-3.5 h-3.5 text-indigo-400" />
                            <span>نسخ السيريال</span>
                          </DropdownMenu.Item>

                          {#if lic.hwid}
                            <DropdownMenu.Item
                              onclick={() => promptResetHwid(lic)}
                              class="cursor-pointer rounded-xl px-3 py-2 text-xs text-amber-300 outline-none hover:bg-amber-600 hover:text-white flex items-center gap-2 transition"
                            >
                              <RotateCcw class="w-3.5 h-3.5" />
                              <span>فك ربط الجهاز (HWID)</span>
                            </DropdownMenu.Item>
                          {/if}

                          <Separator.Root class="bg-slate-800 my-1 h-px w-full" />

                          <DropdownMenu.Item
                            onclick={() => promptDelete(lic)}
                            class="cursor-pointer rounded-xl px-3 py-2 text-xs text-rose-400 outline-none hover:bg-rose-600 hover:text-white flex items-center gap-2 transition"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                            <span>حذف الترخيص نهائياً</span>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</Tooltip.Provider>
