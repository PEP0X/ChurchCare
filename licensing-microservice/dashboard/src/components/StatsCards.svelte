<script lang="ts">
  import type { License } from '../lib/types';

  let { licenses = [] }: { licenses: License[] } = $props();

  let safeLicenses = $derived(Array.isArray(licenses) ? licenses : []);
  let total = $derived(safeLicenses.length);
  let active = $derived(safeLicenses.filter(l => l.status === 'active').length);
  let unactivated = $derived(safeLicenses.filter(l => l.status === 'unactivated').length);
  let revoked = $derived(safeLicenses.filter(l => l.status === 'revoked').length);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
  <div class="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-800 shadow-sm">
    <div class="text-slate-400 text-sm font-medium flex items-center justify-between">
      <span>إجمالي التراخيص</span>
      <span class="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">Total</span>
    </div>
    <div class="text-3xl font-bold text-white mt-2.5">{total}</div>
  </div>

  <div class="bg-emerald-950/20 backdrop-blur rounded-2xl p-5 border border-emerald-800/30 shadow-sm">
    <div class="text-emerald-400 text-sm font-medium flex items-center justify-between">
      <span>التراخيص المفعّلة</span>
      <span class="text-xs bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded text-emerald-300">Active</span>
    </div>
    <div class="text-3xl font-bold text-emerald-400 mt-2.5">{active}</div>
  </div>

  <div class="bg-amber-950/20 backdrop-blur rounded-2xl p-5 border border-amber-800/30 shadow-sm">
    <div class="text-amber-400 text-sm font-medium flex items-center justify-between">
      <span>غير مفعّلة (متاحة)</span>
      <span class="text-xs bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded text-amber-300">Unused</span>
    </div>
    <div class="text-3xl font-bold text-amber-400 mt-2.5">{unactivated}</div>
  </div>

  <div class="bg-rose-950/20 backdrop-blur rounded-2xl p-5 border border-rose-800/30 shadow-sm">
    <div class="text-rose-400 text-sm font-medium flex items-center justify-between">
      <span>الملغاة (Revoked)</span>
      <span class="text-xs bg-rose-950/60 border border-rose-700/50 px-2 py-0.5 rounded text-rose-300">Blocked</span>
    </div>
    <div class="text-3xl font-bold text-rose-400 mt-2.5">{revoked}</div>
  </div>
</div>
