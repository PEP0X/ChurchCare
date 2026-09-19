<script lang="ts">
  import { Dialog, Tabs, Label, Separator } from 'bits-ui';
  import {
    Sparkles,
    Church,
    User,
    FileText,
    Check,
    X,
    Search,
    RotateCcw,
    Plus,
    Smartphone,
    Briefcase
  } from '@lucide/svelte';
  import { arabicSearchMatch } from '../lib/arabicSearch';
  import { validateEgyptPhone } from '../lib/egyptPhone';

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

  let activeTab = $state<'list' | 'custom'>('list');
  let selectedChurch = $state('');
  let customChurchName = $state('');
  let churchSearchQuery = $state('');

  // Servant details
  let servantName = $state('');
  let servantRole = $state<string>('أمين خدمة');
  let customRoleInput = $state('');
  let servantPhone = $state('');
  let extraNotes = $state('');
  let errorMsg = $state<string | null>(null);

  // Arabic normalized search for churches
  let filteredChurches = $derived(
    churches.filter((c) => arabicSearchMatch(c, churchSearchQuery))
  );

  let effectiveChurchName = $derived(
    activeTab === 'custom' ? customChurchName.trim() : selectedChurch.trim()
  );

  // Egypt Phone Validation
  let phoneValidation = $derived(validateEgyptPhone(servantPhone));

  let effectiveRole = $derived(
    servantRole === 'أخرى' ? customRoleInput.trim() || 'خادم' : servantRole
  );

  function selectChurch(church: string) {
    selectedChurch = church;
    errorMsg = null;
  }

  function resetForm() {
    selectedChurch = '';
    customChurchName = '';
    activeTab = 'list';
    churchSearchQuery = '';
    servantName = '';
    servantRole = 'أمين خدمة';
    customRoleInput = '';
    servantPhone = '';
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
    const name = servantName.trim();

    if (!church) {
      errorMsg = 'يرجى اختيار اسم الكنيسة من القائمة أو كتابة اسم كنيسة جديدة.';
      return;
    }

    if (!name) {
      errorMsg = 'يرجى كتابة اسم الخادم المسند إليه هذا الترخيص.';
      return;
    }

    // Phone validation for Egypt
    if (!phoneValidation.isValid) {
      errorMsg = phoneValidation.error || 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).';
      return;
    }

    // Structured notes with Role and Phone
    const notesParts: string[] = [
      `[الدور: ${effectiveRole}]`,
      `[هاتف: ${phoneValidation.normalized}]`
    ];

    if (extraNotes.trim()) {
      notesParts.push(extraNotes.trim());
    }

    const finalNotes = notesParts.join(' | ');

    errorMsg = null;
    try {
      await onSubmit(church, name, finalNotes);
      handleClose();
    } catch (err: any) {
      errorMsg = err.message || 'حدث خطأ أثناء إصدار الترخيص.';
    }
  }
</script>

<Dialog.Root
  open={isOpen}
  onOpenChange={(open) => {
    if (!open) handleClose();
  }}
>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md transition-all duration-200" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-3xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl sm:rounded-4xl p-5 sm:p-8 lg:p-9 shadow-2xl text-right focus:outline-none"
    >
      <!-- Top Glow Line -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"></div>

      <!-- Header -->
      <div class="flex justify-between items-start mb-5">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <Dialog.Title class="text-xl sm:text-2xl font-black text-white tracking-wide">
              إصدار ترخيص وسيريال جديد
            </Dialog.Title>
            <Dialog.Description class="text-xs sm:text-sm text-slate-400 mt-0.5">
              توليد سيريال فريد مقفل بالعتاد، وتعيين بيانات الخادم والمسؤول والتأكد من رقم الهاتف
            </Dialog.Description>
          </div>
        </div>

        <Dialog.Close
          class="w-9 h-9 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700/60"
          aria-label="إغلاق"
        >
          <X class="w-4 h-4" />
        </Dialog.Close>
      </div>

      <Separator.Root class="bg-slate-800/80 h-px w-full mb-6" />

      <form onsubmit={handleSubmit} class="space-y-6">

        <!-- SECTION 1: CHURCH SELECTION (اسم الكنيسة زي ما هي) -->
        <div class="bg-slate-950/60 border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-inner space-y-4">
          <Tabs.Root bind:value={activeTab} class="w-full">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
              <div class="flex items-center gap-2">
                <Church class="w-5 h-5 text-indigo-400" />
                <span class="text-sm sm:text-base font-bold text-white">الخطوة 1: اسم الكنيسة (زي ما هي)</span>
                <span class="text-rose-400 font-bold">*</span>
                <span class="text-xs text-slate-400 mr-1 hidden sm:inline">(يتم قفل البرنامج باسم هذه الكنيسة)</span>
              </div>

              <!-- Bits UI Tabs List -->
              <Tabs.List class="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
                <Tabs.Trigger
                  value="list"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-400 hover:text-slate-200"
                >
                  <span>🏛️ من قائمة الكنائس</span>
                  <span class="text-[10px] bg-slate-950/70 px-1.5 py-0.2 rounded-full font-mono">{churches.length}</span>
                </Tabs.Trigger>

                <Tabs.Trigger
                  value="custom"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-400 hover:text-slate-200"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>كنيسة جديدة حرة</span>
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            <!-- TAB 1: Search in Diocesan List with Normalized Arabic Search -->
            <Tabs.Content value="list" class="space-y-3 pt-3 focus:outline-none">
              <!-- Selected Church Banner -->
              {#if selectedChurch}
                <div class="bg-gradient-to-r from-indigo-950/80 via-indigo-900/40 to-slate-900 border-2 border-indigo-500/60 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
                      <Church class="w-5 h-5" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-[11px] text-indigo-300 font-semibold">الكنيسة المختارة المعتمدة:</div>
                      <div class="text-sm sm:text-base font-extrabold text-white leading-snug break-words">
                        {selectedChurch}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => (selectedChurch = '')}
                    class="self-end sm:self-center text-xs font-medium text-indigo-300 hover:text-white bg-indigo-800/40 hover:bg-indigo-700/50 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border border-indigo-500/30 flex items-center gap-1.5"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>تغيير الاختيار</span>
                  </button>
                </div>
              {/if}

              <!-- Search input with Arabic Normalization -->
              <div class="relative">
                <input
                  type="text"
                  bind:value={churchSearchQuery}
                  placeholder="🔍 ابحث في الكنائس (مثال: الخصوص، شبين، كنيسه العذراء، مارجرجس، طوخ)..."
                  class="w-full bg-slate-900 border border-slate-700/80 text-white rounded-2xl px-4 py-2.5 sm:py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm placeholder:text-slate-500 shadow-inner"
                />
                <Search class="w-4 h-4 text-slate-500 absolute right-3.5 top-3 sm:top-3.5" />
                {#if churchSearchQuery}
                  <button
                    type="button"
                    onclick={() => (churchSearchQuery = '')}
                    class="absolute left-3.5 top-2.5 sm:top-3 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕ مسح
                  </button>
                {/if}
              </div>

              <!-- Churches Grid List -->
              <div class="max-h-56 overflow-y-auto pr-1 space-y-1.5 rounded-2xl border border-slate-800/80 p-2 bg-slate-900/50">
                {#if filteredChurches.length === 0}
                  <div class="py-6 text-center text-xs sm:text-sm text-slate-400 space-y-2">
                    <p>لا توجد كنيسة مطابقة لـ "{churchSearchQuery}"</p>
                    <button
                      type="button"
                      onclick={() => {
                        activeTab = 'custom';
                        customChurchName = churchSearchQuery;
                      }}
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
                        class="text-right p-3 rounded-2xl text-xs sm:text-sm transition cursor-pointer flex items-start justify-between gap-3 border {selectedChurch === church
                          ? 'bg-indigo-600/30 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/90 hover:text-white border-slate-800/80'}"
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
            </Tabs.Content>

            <!-- TAB 2: Custom Church Name -->
            <Tabs.Content value="custom" class="space-y-3 pt-3 focus:outline-none">
              <Label.Root for="customChurchInput" class="block text-xs font-semibold text-slate-300">
                اكتب اسم الكنيسة بالكامل كما سيظهر في شاشات البرنامج وشيت التراخيص:
              </Label.Root>
              <input
                id="customChurchInput"
                type="text"
                bind:value={customChurchName}
                placeholder="مثال: كنيسة الشهيد العظيم مارجرجس - المنيا"
                disabled={isSubmitting}
                class="w-full bg-slate-900 border-2 border-indigo-500/60 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base shadow-inner font-medium"
              />
              <p class="text-xs text-amber-300/80 flex items-center gap-1.5">
                <span>💡</span>
                <span>يُفضل بدء الاسم بـ "كنيسة ..." لتوحيد التسمية وقفل البرنامج على اسم الكنيسة.</span>
              </p>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <!-- SECTION 2: SERVANT, ROLE & EGYPT PHONE VALIDATION -->
        <div class="bg-slate-950/60 border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-inner space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-800/60">
            <User class="w-5 h-5 text-indigo-400" />
            <span class="text-sm sm:text-base font-bold text-white">الخطوة 2: بيانات الخادم والمسؤول والتحقق من الهاتف</span>
            <span class="text-rose-400 font-bold">*</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1. اسم الخادم -->
            <div>
              <Label.Root for="servantNameInput" class="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5">
                اسم الخادم <span class="text-rose-400">*</span>
              </Label.Root>
              <div class="relative">
                <input
                  id="servantNameInput"
                  type="text"
                  bind:value={servantName}
                  placeholder="مثال: القس بيشوي عزيز / الشماس مينا مكرم / أ. مريم"
                  required
                  disabled={isSubmitting}
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2.5 sm:py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner transition"
                />
                <User class="w-4 h-4 text-slate-500 absolute right-3.5 top-3 sm:top-3.5" />
              </div>
              <p class="text-[11px] text-slate-500 mt-1">اسم الخادم أو الكاهن المسند إليه الترخيص</p>
            </div>

            <!-- 2. التليفون مع Validation أرقام مصر -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <Label.Root for="servantPhoneInput" class="text-xs sm:text-sm font-semibold text-slate-200">
                  رقم الهاتف (مصر) <span class="text-rose-400">*</span>
                </Label.Root>
                {#if servantPhone}
                  {#if phoneValidation.isValid}
                    <span class="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                      <span>✓</span>
                      <span>{phoneValidation.carrier}</span>
                    </span>
                  {:else}
                    <span class="text-[10px] text-rose-400 font-medium">رقم غير صالح</span>
                  {/if}
                {/if}
              </div>

              <div class="relative" dir="ltr">
                <input
                  id="servantPhoneInput"
                  type="tel"
                  bind:value={servantPhone}
                  placeholder="01012345678"
                  required
                  maxlength="15"
                  disabled={isSubmitting}
                  class="w-full bg-slate-900 border {servantPhone ? (phoneValidation.isValid ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-rose-500/60 ring-1 ring-rose-500/30') : 'border-slate-700/80'} rounded-2xl px-4 py-2.5 sm:py-3 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner font-mono tracking-wider transition"
                />
                <Smartphone class="w-4 h-4 text-slate-500 absolute left-3.5 top-3 sm:top-3.5" />
              </div>

              <!-- Phone feedback message -->
              {#if servantPhone && !phoneValidation.isValid}
                <p class="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{phoneValidation.error}</span>
                </p>
              {:else}
                <p class="text-[11px] text-slate-500 mt-1">
                  أرقام المحمول المصرية المعتمدة: 010 (فودافون)، 011 (اتصالات)، 012 (أورنج)، 015 (وي)
                </p>
              {/if}
            </div>
          </div>

          <!-- 3. الدور / الوظيفة (كاهن - امين خدمة - Data Entry) -->
          <div class="pt-2">
            <Label.Root class="block text-xs sm:text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Briefcase class="w-4 h-4 text-indigo-400" />
              <span>الدور / الوظيفة الكنسية:</span>
              <span class="text-rose-400">*</span>
            </Label.Root>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <!-- Option 1: كاهن -->
              <button
                type="button"
                onclick={() => (servantRole = 'كاهن')}
                class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between {servantRole === 'كاهن'
                  ? 'bg-amber-600/25 border-amber-500 text-white shadow-md shadow-amber-600/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'}"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">✝️</span>
                  <div>
                    <div class="text-xs sm:text-sm font-bold {servantRole === 'كاهن' ? 'text-amber-300' : 'text-slate-300'}">
                      كاهن
                    </div>
                    <div class="text-[10px] text-slate-500">رعاية وافتقاد</div>
                  </div>
                </div>
                {#if servantRole === 'كاهن'}
                  <span class="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                {/if}
              </button>

              <!-- Option 2: أمين خدمة -->
              <button
                type="button"
                onclick={() => (servantRole = 'أمين خدمة')}
                class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between {servantRole === 'أمين خدمة'
                  ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'}"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">⭐</span>
                  <div>
                    <div class="text-xs sm:text-sm font-bold {servantRole === 'أمين خدمة' ? 'text-indigo-300' : 'text-slate-300'}">
                      أمين خدمة
                    </div>
                    <div class="text-[10px] text-slate-500">مسؤول القطاع</div>
                  </div>
                </div>
                {#if servantRole === 'أمين خدمة'}
                  <span class="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                {/if}
              </button>

              <!-- Option 3: Data Entry -->
              <button
                type="button"
                onclick={() => (servantRole = 'مدخل بيانات (Data Entry)')}
                class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between {servantRole === 'مدخل بيانات (Data Entry)'
                  ? 'bg-sky-600/25 border-sky-500 text-white shadow-md shadow-sky-600/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'}"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">💻</span>
                  <div>
                    <div class="text-xs sm:text-sm font-bold {servantRole === 'مدخل بيانات (Data Entry)' ? 'text-sky-300' : 'text-slate-300'}">
                      Data Entry
                    </div>
                    <div class="text-[10px] text-slate-500">إدخال وطباعة</div>
                  </div>
                </div>
                {#if servantRole === 'مدخل بيانات (Data Entry)'}
                  <span class="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                {/if}
              </button>

              <!-- Option 4: مخصص -->
              <button
                type="button"
                onclick={() => (servantRole = 'أخرى')}
                class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between {servantRole === 'أخرى'
                  ? 'bg-emerald-600/25 border-emerald-500 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'}"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">✏️</span>
                  <div>
                    <div class="text-xs sm:text-sm font-bold {servantRole === 'أخرى' ? 'text-emerald-300' : 'text-slate-300'}">
                      أخرى / مخصص
                    </div>
                    <div class="text-[10px] text-slate-500">دور وظيفي آخر</div>
                  </div>
                </div>
                {#if servantRole === 'أخرى'}
                  <span class="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                {/if}
              </button>
            </div>

            {#if servantRole === 'أخرى'}
              <div class="mt-2.5">
                <input
                  type="text"
                  bind:value={customRoleInput}
                  placeholder="اكتب المسمى الوظيفي (مثال: سكرتير المطرانية، أمين الصندوق، دياكون)..."
                  class="w-full bg-slate-900 border border-slate-700/80 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            {/if}
          </div>

          <!-- Extra Notes -->
          <div>
            <Label.Root for="notesInput" class="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5">
              ملاحظات إضافية على الترخيص (اختياري)
            </Label.Root>
            <input
              id="notesInput"
              type="text"
              bind:value={extraNotes}
              placeholder="مثال: جهاز أمانة الخدمة الرئيسي، لابتوب الخدمة المتنقل..."
              disabled={isSubmitting}
              class="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner"
            />
          </div>
        </div>

        <!-- SECTION 3: LIVE PREVIEW & CONFIRMATION -->
        <div class="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 border border-indigo-800/50 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div class="flex items-center justify-between border-b border-indigo-900/40 pb-2">
            <span class="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-2">
              <FileText class="w-4 h-4" />
              <span>معاينة الترخيص والبيانات قبل التوليد:</span>
            </span>
            <span class="text-[11px] bg-indigo-900/60 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-700/50 font-mono">
              سيريال جديد
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">⛪ الكنيسة:</span>
              <span class="font-extrabold text-white text-xs sm:text-sm block break-words">
                {effectiveChurchName || '— (يرجى التحديد)'}
              </span>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">👤 الخادم والدور:</span>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-white text-xs sm:text-sm">
                  {servantName || '— (يرجى كتابة الاسم)'}
                </span>
                <span class="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/60">
                  {effectiveRole}
                </span>
              </div>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">📱 الهاتف (مصر):</span>
              <span class="font-mono font-bold text-xs sm:text-sm block {phoneValidation.isValid ? 'text-emerald-400' : 'text-slate-500'}" dir="ltr">
                {phoneValidation.isValid ? phoneValidation.normalized : (servantPhone || '—')}
              </span>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
              <span class="text-slate-400 block mb-1">🔑 السيريال المقفل:</span>
              <span class="code-font font-bold text-emerald-400 text-xs sm:text-sm tracking-wider block">
                CCARE-••••-••••-••••
              </span>
            </div>
          </div>
        </div>

        <!-- Error Alert -->
        {#if errorMsg}
          <div class="bg-rose-950/60 border border-rose-800/80 rounded-2xl p-4 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-in fade-in-0">
            <span class="text-lg">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        {/if}

        <Separator.Root class="bg-slate-800/80 h-px w-full" />

        <!-- Footer Actions -->
        <div class="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-2">
          <Dialog.Close
            type="button"
            disabled={isSubmitting}
            class="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm transition cursor-pointer text-center"
          >
            إلغاء
          </Dialog.Close>

          <button
            type="submit"
            disabled={isSubmitting}
            class="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 transform hover:-translate-y-0.5"
          >
            {#if isSubmitting}
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جاري توليد السيريال والربط بالـ Sheet...</span>
            {:else}
              <Sparkles class="w-4 h-4" />
              <span>توليد السيريال وحفظه في الـ Sheet</span>
            {/if}
          </button>
        </div>

      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
