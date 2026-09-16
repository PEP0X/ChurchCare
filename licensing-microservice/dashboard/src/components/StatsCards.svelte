<script lang="ts">
  import type { License } from '../lib/types';

  let { licenses = [] }: { licenses: License[] } = $props();

  let safeLicenses = $derived(Array.isArray(licenses) ? licenses : []);
  let total = $derived(safeLicenses.length);
  let active = $derived(safeLicenses.filter(l => l.status === 'active').length);
  let unactivated = $derived(safeLicenses.filter(l => l.status === 'unactivated').length);
  let revoked = $derived(safeLicenses.filter(l => l.status === 'revoked').length);

  let uniqueChurchesCount = $derived(
    new Set(safeLicenses.map(l => l.client_name?.trim()).filter(Boolean)).size
  );

  let activePercent = $derived(
    total > 0 ? Math.round((active / total) * 100) : 0
  );
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 my-8">
  <!-- Card 1: Total Licenses & Churches -->
  <div class="relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-xl rounded-3xl p-5 border border-slate-800/80 shadow-lg group hover:border-indigo-500/40 transition duration-300">
    <div class="absolute -top-10 -left-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition"></div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-400">إجمالي التراخيص</span>
      <div class="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm">
        🔑
      </div>
    </div>
    <div class="flex items-baseline gap-2 mt-3">
      <div class="text-3xl sm:text-4xl font-black text-white">{total}</div>
      <span class="text-xs text-slate-400 font-medium">سيريال مُصدر</span>
    </div>
    <div class="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
      <span>الكنائس المسجلة:</span>
      <span class="font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/40">
        {uniqueChurchesCount} {uniqueChurchesCount === 1 ? 'كنيسة' : 'كنائس'}
      </span>
    </div>
  </div>

  <!-- Card 2: Active Licenses -->
  <div class="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 to-slate-900/60 backdrop-blur-xl rounded-3xl p-5 border border-emerald-900/40 shadow-lg group hover:border-emerald-500/40 transition duration-300">
    <div class="absolute -top-10 -left-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition"></div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-emerald-400">التراخيص المفعّلة</span>
      <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm">
        🟢
      </div>
    </div>
    <div class="flex items-baseline gap-2 mt-3">
      <div class="text-3xl sm:text-4xl font-black text-emerald-400">{active}</div>
      <span class="text-xs text-emerald-300/70 font-medium">جهاز نشط ({activePercent}%)</span>
    </div>
    <div class="mt-3 pt-3 border-t border-emerald-900/40 flex items-center justify-between text-xs text-emerald-400/80">
      <span>مقفل بالعتاد HWID:</span>
      <span class="font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/50">
        {active} جهاز
      </span>
    </div>
  </div>

  <!-- Card 3: Unactivated Licenses -->
  <div class="relative overflow-hidden bg-gradient-to-br from-amber-950/25 to-slate-900/60 backdrop-blur-xl rounded-3xl p-5 border border-amber-900/40 shadow-lg group hover:border-amber-500/40 transition duration-300">
    <div class="absolute -top-10 -left-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition"></div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-amber-400">سيريالات جاهزة (غير مفعلة)</span>
      <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
        ⏳
      </div>
    </div>
    <div class="flex items-baseline gap-2 mt-3">
      <div class="text-3xl sm:text-4xl font-black text-amber-400">{unactivated}</div>
      <span class="text-xs text-amber-300/70 font-medium">بانتظار الإدخال</span>
    </div>
    <div class="mt-3 pt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-amber-400/80">
      <span>جاهزة للعميل:</span>
      <span class="font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/50">
        غير مقترنة
      </span>
    </div>
  </div>

  <!-- Card 4: Revoked Licenses -->
  <div class="relative overflow-hidden bg-gradient-to-br from-rose-950/25 to-slate-900/60 backdrop-blur-xl rounded-3xl p-5 border border-rose-900/40 shadow-lg group hover:border-rose-500/40 transition duration-300">
    <div class="absolute -top-10 -left-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition"></div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-rose-400">التراخيص الملغاة</span>
      <div class="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-sm">
        🚫
      </div>
    </div>
    <div class="flex items-baseline gap-2 mt-3">
      <div class="text-3xl sm:text-4xl font-black text-rose-400">{revoked}</div>
      <span class="text-xs text-rose-300/70 font-medium">محظورة / موقفة</span>
    </div>
    <div class="mt-3 pt-3 border-t border-rose-900/40 flex items-center justify-between text-xs text-rose-400/80">
      <span>تتطلب إعادة تفعيل:</span>
      <span class="font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800/50">
        {revoked} رخصة
      </span>
    </div>
  </div>
</div>
