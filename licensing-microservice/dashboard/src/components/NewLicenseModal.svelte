<script lang="ts">
  let {
    isOpen,
    onClose,
    onSubmit,
    isSubmitting = false,
    churches = []
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (churchName: string, userName: string, notes: string) => Promise<void>;
    isSubmitting?: boolean;
    churches?: string[];
  } = $props();

  let selectedChurch = $state('');
  let customChurchName = $state('');
  let isCustomMode = $state(false);
  let churchSearchQuery = $state('');

  let userName = $state('');
  let userRoleOrPhone = $state('');
  let extraNotes = $state('');
  let errorMsg = $state<string | null>(null);

  let filteredChurches = $derived(
    churches.filter(c => c.toLowerCase().includes(churchSearchQuery.trim().toLowerCase()))
  );

  let effectiveChurchName = $derived(
    isCustomMode ? customChurchName.trim() : selectedChurch.trim()
  );

  function selectChurch(church: string) {
    selectedChurch = church;
    isCustomMode = false;
    errorMsg = null;
  }

  function resetForm() {
    selectedChurch = '';
    customChurchName = '';
    isCustomMode = false;
    churchSearchQuery = '';
    userName = '';
    userRoleOrPhone = '';
    extraNotes = '';
    errorMsg = null;
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const church = effectiveChurchName;
    const user = userName.trim();

    if (!church) {
      errorMsg = 'يرجى اختيار اسم الكنيسة من القائمة أو كتابة اسم كنيسة جديدة.';
      return;
    }

    if (!user) {
      errorMsg = 'يرجى كتابة اسم المستخدم أو المسؤول عن هذا الترخيص.';
      return;
    }

    // Combine notes
    const combinedNotesParts: string[] = [];
    if (userRoleOrPhone.trim()) combinedNotesParts.push(userRoleOrPhone.trim());
    if (extraNotes.trim()) combinedNotesParts.push(extraNotes.trim());
    const finalNotes = combinedNotesParts.join(' | ');

    errorMsg = null;
    try {
      await onSubmit(church, user, finalNotes);
      handleClose();
    } catch (err: any) {
      errorMsg = err.message || 'حدث خطأ أثناء إصدار الترخيص.';
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-y-auto"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
  >
    <div
      class="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl sm:rounded-4xl w-full max-w-4xl p-6 sm:p-8 lg:p-10 shadow-2xl text-right relative overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-modal="true"
    >
      <!-- Top Glowing Accent Bar -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"></div>

      <!-- Header -->
      <div class="flex justify-between items-start mb-8 pb-5 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
              ✨
            </div>
            <div>
              <h2 class="text-2xl font-black text-white tracking-wide">
                إصدار ترخيص وسيريال جديد
              </h2>
              <p class="text-xs sm:text-sm text-slate-400 mt-0.5">
                توليد سيريال فريد مقفل بالعتاد لمستخدم تابع لكنيسة محددة مع الربط الفوري بالـ Sheet
              </p>
            </div>
          </div>
        </div>

        <button
          onclick={handleClose}
          type="button"
          class="w-9 h-9 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-lg border border-slate-700/60"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-7">

        <!-- SECTION 1: CHURCH SELECTION (Full Width, Clear & Spacious) -->
        <div class="bg-slate-950/60 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-inner space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
            <div class="flex items-center gap-2">
              <span class="text-lg">⛪</span>
              <span class="text-base font-bold text-white">الخطوة 1: اسم الكنيسة</span>
              <span class="text-rose-400 font-bold">*</span>
              <span class="text-xs text-slate-400 mr-2">(يتم قفل البرنامج باسم هذه الكنيسة)</span>
            </div>

            <!-- Toggle between diocesan list and custom free entry -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => { isCustomMode = false; errorMsg = null; }}
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 {!isCustomMode ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'}"
              >
                <span>🏛️ من قائمة الكنائس</span>
                <span class="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full">{churches.length}</span>
              </button>
              <button
                type="button"
                onclick={() => { isCustomMode = true; selectedChurch = ''; errorMsg = null; }}
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 {isCustomMode ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-white'}"
              >
                <span>➕ كنيسة جديدة حرة</span>
              </button>
            </div>
          </div>

          {#if !isCustomMode}
            <!-- Search & Selected Display -->
            <div class="space-y-3">
              <!-- Selected Church Banner (if one is chosen) -->
              {#if selectedChurch}
                <div class="bg-gradient-to-r from-indigo-950/80 via-indigo-900/40 to-slate-900 border-2 border-indigo-500/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="text-2xl shrink-0">⛪</span>
                    <div class="min-w-0">
                      <div class="text-[11px] text-indigo-300 font-semibold">الكنيسة المختارة المعتمدة:</div>
                      <div class="text-base sm:text-lg font-extrabold text-white leading-snug break-words">
                        {selectedChurch}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => selectedChurch = ''}
                    class="self-end sm:self-center text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/40 hover:bg-indigo-700/50 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border border-indigo-500/30"
                  >
                    تغيير الكنيسة 🔄
                  </button>
                </div>
              {/if}

              <!-- Search input -->
              <div class="relative">
                <input
                  type="text"
                  bind:value={churchSearchQuery}
                  placeholder="🔍 اكتب للبحث في قائمة الكنائس (مثال: الخصوص، شبين، العذراء، مارجرجس، كاراس)..."
                  class="w-full bg-slate-900 border border-slate-700/80 text-white rounded-2xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-500 shadow-inner"
                />
                <span class="absolute right-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
                {#if churchSearchQuery}
                  <button
                    type="button"
                    onclick={() => churchSearchQuery = ''}
                    class="absolute left-3.5 top-3 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕ مسح
                  </button>
                {/if}
              </div>

              <!-- Spacious Churches List (Full Name clearly visible, NO truncation!) -->
              <div class="max-h-60 overflow-y-auto pr-1 space-y-1.5 rounded-2xl border border-slate-800/80 p-2 bg-slate-900/50">
                {#if filteredChurches.length === 0}
                  <div class="py-8 text-center text-sm text-slate-400 space-y-2">
                    <p>لا توجد كنيسة مطابقة لـ "{churchSearchQuery}"</p>
                    <button
                      type="button"
                      onclick={() => { isCustomMode = true; customChurchName = churchSearchQuery; }}
                      class="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
                    >
                      إضافة "{churchSearchQuery}" كاسم كنيسة جديدة حرة ←
                    </button>
                  </div>
                {:else}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {#each filteredChurches as church}
                      <button
                        type="button"
                        onclick={() => selectChurch(church)}
                        class="text-right p-3 rounded-2xl text-xs sm:text-sm transition cursor-pointer flex items-start justify-between gap-3 border {selectedChurch === church ? 'bg-indigo-600/30 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/20' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/90 hover:text-white border-slate-800/80'}"
                      >
                        <div class="flex items-start gap-2.5 min-w-0">
                          <span class="text-base shrink-0 mt-0.5">⛪</span>
                          <span class="leading-relaxed break-words font-medium">{church}</span>
                        </div>
                        {#if selectedChurch === church}
                          <span class="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            ✓
                          </span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Custom Church Name Input -->
            <div class="space-y-2">
              <label for="customChurchInput" class="block text-xs font-semibold text-slate-300">
                اكتب اسم الكنيسة بالكامل كما سيظهر في شيت التراخيص وشاشات البرنامج:
              </label>
              <div class="relative">
                <input
                  id="customChurchInput"
                  type="text"
                  bind:value={customChurchName}
                  placeholder="مثال: كنيسة الشهيد العظيم مارجرجس - المنيا"
                  required
                  disabled={isSubmitting}
                  class="w-full bg-slate-900 border-2 border-indigo-500/60 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base shadow-inner font-medium"
                />
              </div>
              <p class="text-xs text-amber-300/80 flex items-center gap-1.5 mt-1">
                <span>💡</span>
                <span>تأكد من بدء الاسم بـ "كنيسة ..." ليتم قفل البرنامج على اسم الكنيسة تلقائياً.</span>
              </p>
            </div>
          {/if}
        </div>

        <!-- SECTION 2: USER & ACCOUNT DETAILS -->
        <div class="bg-slate-950/60 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-inner space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-800/60">
            <span class="text-lg">👤</span>
            <span class="text-base font-bold text-white">الخطوة 2: بيانات المستخدم والمسؤول</span>
            <span class="text-rose-400 font-bold">*</span>
            <span class="text-xs text-slate-400 mr-2">(يمكن إصدار أكثر من حساب لنفس الكنيسة بسيريالات مختلفة)</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- User Name Input -->
            <div>
              <label for="userNameInput" class="block text-sm font-semibold text-slate-200 mb-1.5">
                اسم المستخدم / المسؤول عن هذا الترخيص <span class="text-rose-400">*</span>
              </label>
              <div class="relative">
                <input
                  id="userNameInput"
                  type="text"
                  bind:value={userName}
                  placeholder="مثال: م. باسم ظريف / أ. نرمين ميشيل"
                  required
                  disabled={isSubmitting}
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner transition"
                />
                <span class="absolute right-3.5 top-3 text-slate-500 text-base">👤</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-1">اسم الشخص أو الجهاز التابع للكنيسة</p>
            </div>

            <!-- Role or Phone -->
            <div>
              <label for="userRoleInput" class="block text-sm font-semibold text-slate-200 mb-1.5">
                المسمى الوظيفي أو رقم الهاتف (اختياري)
              </label>
              <div class="relative">
                <input
                  id="userRoleInput"
                  type="text"
                  bind:value={userRoleOrPhone}
                  placeholder="مثال: سكرتارية الكنيسة / 01234567890"
                  disabled={isSubmitting}
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner transition"
                />
                <span class="absolute right-3.5 top-3 text-slate-500 text-base">📞</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-1">للتواصل والتوثيق في الشيت</p>
            </div>
          </div>

          <!-- Extra Notes -->
          <div>
            <label for="notesInput" class="block text-sm font-semibold text-slate-200 mb-1.5">
              ملاحظات إضافية (اختياري)
            </label>
            <input
              id="notesInput"
              type="text"
              bind:value={extraNotes}
              placeholder="مثال: جهاز أمانة الخدمة، ترخيص سنوي، أو أي تفاصيل خاصة..."
              disabled={isSubmitting}
              class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
            />
          </div>
        </div>

        <!-- SECTION 3: LIVE PREVIEW & CONFIRMATION -->
        <div class="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 border border-indigo-800/50 rounded-3xl p-5 shadow-xl space-y-3">
          <div class="flex items-center justify-between border-b border-indigo-900/40 pb-2">
            <span class="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-2">
              <span>📋</span>
              <span>معاينة الترخيص والربط في الـ Sheet قبل التوليد:</span>
            </span>
            <span class="text-[11px] bg-indigo-900/60 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-700/50">
              سيريال جديد مستقل
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">⛪ الكنيسة المعتمدة:</span>
              <span class="font-extrabold text-white text-sm block break-words">
                {effectiveChurchName || '— (يرجى تحديد الكنيسة)'}
              </span>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">👤 المستخدم المسؤول:</span>
              <span class="font-bold text-white text-sm block">
                {userName || '— (يرجى كتابة الاسم)'}
              </span>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">🔑 السيريال المقفل بالعتاد:</span>
              <span class="code-font font-bold text-emerald-400 text-sm tracking-wider block">
                CCARE-••••-••••-••••
              </span>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 pt-1 flex items-center gap-2">
            <span class="text-emerald-400 font-bold">✓</span>
            <span>سيتم حفظ الكنيسة والمستخدم وسيريال التفعيل مباشرة في جدول التراخيص (Sheet) بقاعدة البيانات المشفرة.</span>
          </div>
        </div>

        <!-- Error Alert -->
        {#if errorMsg}
          <div class="bg-rose-950/60 border border-rose-800/80 rounded-2xl p-4 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
            <span class="text-lg">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Modal Footer Actions -->
        <div class="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onclick={handleClose}
            disabled={isSubmitting}
            class="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition cursor-pointer text-center"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            class="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 transform hover:-translate-y-0.5"
          >
            {#if isSubmitting}
              <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>جاري توليد السيريال والربط بالـ Sheet...</span>
            {:else}
              <span>✨ توليد السيريال وحفظه في الـ Sheet</span>
            {/if}
          </button>
        </div>

      </form>
    </div>
  </div>
{/if}
