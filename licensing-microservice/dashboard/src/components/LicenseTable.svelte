<script lang="ts">
  import type { License } from '../lib/types';

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
  let copiedId = $state<string | null>(null);

  let safeLicenses = $derived(Array.isArray(licenses) ? licenses : []);

  let filtered = $derived(
    safeLicenses.filter(l =>
      l.serial_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.hwid && l.hwid.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  function copySerial(id: string, serial: string) {
    navigator.clipboard.writeText(serial);
    copiedId = id;
    setTimeout(() => {
      if (copiedId === id) copiedId = null;
    }, 2000);
  }

  function formatDate(isoStr: string | null) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    const h12 = hours % 12 || 12;
    return `${y}/${m}/${day} • ${h12}:${mins} ${ampm}`;
  }
</script>

<div class="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
  <div class="w-full sm:w-96 relative">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="بحث باسم الكنيسة أو السيريال..."
      class="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
    />
    <svg class="w-5 h-5 text-slate-500 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
  </div>

  <div class="text-xs text-slate-400 flex items-center gap-2" dir="rtl">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>قاعدة بيانات <bdi class="text-indigo-400 font-semibold">Supabase</bdi> مؤمنة عبر <bdi class="text-emerald-400 font-semibold">Rust</bdi></span>
  </div>
</div>

<div class="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
  <div class="overflow-x-auto">
    <table class="w-full text-right text-sm min-w-[850px]">
      <thead class="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
        <tr>
          <th class="py-4 px-5 whitespace-nowrap">السيريال (Serial Key)</th>
          <th class="py-4 px-5 whitespace-nowrap">اسم العميل / الكنيسة</th>
          <th class="py-4 px-5 whitespace-nowrap">الحالة</th>
          <th class="py-4 px-5 whitespace-nowrap">بصمة العتاد (HWID)</th>
          <th class="py-4 px-5 whitespace-nowrap">تاريخ التفعيل</th>
          <th class="py-4 px-5 text-center whitespace-nowrap">الإجراءات</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/60">
        {#if isLoading && licenses.length === 0}
          <tr>
            <td colspan="6" class="py-12 text-center text-slate-400">
              <div class="flex items-center justify-center gap-2">
                <svg class="w-5 h-5 animate-spin text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>جاري تحميل التراخيص من الخادم...</span>
              </div>
            </td>
          </tr>
        {:else if filtered.length === 0}
          <tr>
            <td colspan="6" class="py-12 text-center text-slate-400">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك.' : 'لا توجد تراخيص حالياً. اضغط على "توليد سيريال جديد" لإصدار أول ترخيص.'}
            </td>
          </tr>
        {:else}
          {#each filtered as lic (lic.id)}
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-4 px-5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span class="code-font font-bold text-white tracking-wider select-all whitespace-nowrap">{lic.serial_key}</span>
                  <button
                    onclick={() => copySerial(lic.id, lic.serial_key)}
                    class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="نسخ السيريال"
                  >
                    {#if copiedId === lic.id}
                      <span class="text-emerald-400 text-xs font-sans font-bold">تم النسخ!</span>
                    {:else}
                      📋
                    {/if}
                  </button>
                </div>
              </td>

              <td class="py-4 px-5 font-medium text-white max-w-xs truncate" title={lic.client_name}>
                {lic.client_name}
              </td>

              <td class="py-4 px-5 whitespace-nowrap">
                {#if lic.status === 'active'}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    مفعّل
                  </span>
                {:else if lic.status === 'unactivated'}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    غير مفعّل
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    ملغي
                  </span>
                {/if}
              </td>

              <td class="py-4 px-5 whitespace-nowrap">
                {#if lic.hwid}
                  <span class="code-font text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300 select-all whitespace-nowrap">
                    {lic.hwid}
                  </span>
                {:else}
                  <span class="text-slate-500 text-xs whitespace-nowrap">غير مرتبط بجهاز بعد</span>
                {/if}
              </td>

              <td class="py-4 px-5 text-slate-400 text-xs whitespace-nowrap" dir="ltr">
                {formatDate(lic.activated_at)}
              </td>

              <td class="py-4 px-5 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-2">
                  {#if lic.hwid}
                    <button
                      onclick={() => onResetHwid(lic.id)}
                      class="px-2.5 py-1 text-xs rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition cursor-pointer whitespace-nowrap"
                      title="إلغاء ربط هذا الجهاز للسماح للعميل بتفعيله على جهاز آخر"
                    >
                      فك ربط الجهاز
                    </button>
                  {/if}

                  {#if lic.status !== 'revoked'}
                    <button
                      onclick={() => onToggleStatus(lic.id, 'revoked')}
                      class="px-2.5 py-1 text-xs rounded-lg bg-rose-950/60 text-rose-300 border border-rose-700/60 hover:bg-rose-900 transition cursor-pointer whitespace-nowrap"
                      title="إلغاء الترخيص"
                    >
                      إلغاء
                    </button>
                  {:else}
                    <button
                      onclick={() => onToggleStatus(lic.id, lic.hwid ? 'active' : 'unactivated')}
                      class="px-2.5 py-1 text-xs rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition cursor-pointer whitespace-nowrap"
                      title="إعادة التفعيل"
                    >
                      تفعيل
                    </button>
                  {/if}

                  <button
                    onclick={() => onDelete(lic.id)}
                    class="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer rounded hover:bg-slate-800"
                    title="حذف نهائي"
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
