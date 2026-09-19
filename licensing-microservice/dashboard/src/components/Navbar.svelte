<script lang="ts">
  import { Tooltip, Separator } from 'bits-ui';
  import {
    Shield,
    Plus,
    FileSpreadsheet,
    RefreshCw,
    Lock
  } from '@lucide/svelte';

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

<Tooltip.Provider>
  <header class="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-slate-800/80 gap-5">
    <div class="flex items-center gap-3.5">
      <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
        <Shield class="w-7 h-7" />
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
            <span class="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 font-mono">
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
        type="button"
        onclick={onOpenNewModal}
        class="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition cursor-pointer text-xs sm:text-sm transform hover:-translate-y-0.5"
      >
        <Plus class="w-4 h-4" />
        <span>توليد سيريال جديد</span>
      </button>

      <!-- Export to Sheet (CSV) Button with Bits UI Tooltip -->
      {#if onExportSheet}
        <Tooltip.Root delayDuration={150}>
          <Tooltip.Trigger
            type="button"
            onclick={onExportSheet}
            class="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-semibold px-3.5 py-2.5 rounded-2xl shadow-sm transition cursor-pointer text-xs sm:text-sm"
            aria-label="تصدير جدول التراخيص إلى ملف Sheet"
          >
            <FileSpreadsheet class="w-4 h-4 text-emerald-400" />
            <span class="hidden sm:inline">تصدير Sheet</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={6}
              class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 shadow-xl"
            >
              تصدير جدول التراخيص كاملاً بملف Excel / CSV مع دعم الحروف العربية
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      {/if}

      <!-- Refresh Button with Bits UI Tooltip -->
      <Tooltip.Root delayDuration={150}>
        <Tooltip.Trigger
          type="button"
          onclick={onRefresh}
          disabled={isLoading}
          class="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer shadow-sm"
          aria-label="تحديث البيانات من السيرفر"
        >
          <RefreshCw class="w-5 h-5 {isLoading ? 'animate-spin text-indigo-400' : ''}" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={6}
            class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 shadow-xl"
          >
            تحديث البيانات فورياً من الخادم
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <!-- Logout / Lock Button with Bits UI Tooltip -->
      {#if onLogout}
        <Tooltip.Root delayDuration={150}>
          <Tooltip.Trigger
            type="button"
            onclick={onLogout}
            class="p-2.5 rounded-2xl bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-800 hover:border-rose-900/50 transition cursor-pointer shadow-sm text-sm"
            aria-label="قفل لوحة التحكم"
          >
            <Lock class="w-5 h-5" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={6}
              class="z-50 rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-200 shadow-xl"
            >
              قفل لوحة التحكم والخروج
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      {/if}
    </div>
  </header>
</Tooltip.Provider>
