<script lang="ts">
  import { onMount } from 'svelte';
  import { Tabs, Label, Separator } from 'bits-ui';
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
    Briefcase,
    Shield,
    ShieldCheck,
    Laptop,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Zap,
    Lock,
    KeyRound,
    HelpCircle
  } from '@lucide/svelte';
  import { arabicSearchMatch } from '../lib/arabicSearch';
  import { validateEgyptPhone } from '../lib/egyptPhone';

  let {
    onBack,
    onSubmit,
    isSubmitting = false,
    churches = []
  }: {
    onBack: () => void;
    onSubmit: (
      churchName: string,
      userName: string,
      notes: string
    ) => Promise<void>;
    isSubmitting?: boolean;
    churches?: string[];
  } = $props();

  // Tab: List vs Custom
  let activeTab = $state<'list' | 'custom'>('list');
  let selectedChurch = $state('');
  let customChurchName = $state('');
  let churchSearchQuery = $state('');
  let selectedAreaFilter = $state<string>('ALL');

  // Servant details
  let servantName = $state('');
  let servantRole = $state<string>('أمين خدمة');
  let customRoleInput = $state('');
  let servantPhone = $state('');
  let extraNotes = $state('');
  let errorMsg = $state<string | null>(null);

  // Quick area filters for Diocesan churches
  const AREA_FILTERS = [
    { id: 'ALL', label: 'جميع الكنائس' },
    { id: 'الخصوص', label: 'منطقة الخصوص' },
    { id: 'شبين', label: 'شبين القناطر وكفرها' },
    { id: 'طوخ', label: 'طوخ وقها وقراها' },
    { id: 'الخانكة', label: 'الخانكة وأبو زعبل' },
    { id: 'القلج', label: 'القلج والجبل الأصفر' }
  ];

  // Derived: Filtered Churches with Area Tag + Arabic Normalization
  let filteredChurches = $derived(
    churches.filter((c) => {
      // 1. Area filter
      if (selectedAreaFilter !== 'ALL') {
        if (!c.includes(selectedAreaFilter)) return false;
      }
      // 2. Arabic Search match
      return arabicSearchMatch(c, churchSearchQuery);
    })
  );

  let effectiveChurchName = $derived(
    activeTab === 'custom' ? customChurchName.trim() : selectedChurch.trim()
  );

  // Egypt Phone Validation
  let phoneValidation = $derived(validateEgyptPhone(servantPhone));

  let effectiveRole = $derived(
    servantRole === 'أخرى' ? customRoleInput.trim() || 'خادم' : servantRole
  );

  // Step Validation Statuses
  let isChurchValid = $derived(effectiveChurchName.length > 0);
  let isServantValid = $derived(servantName.trim().length > 0);
  let isPhoneValid = $derived(phoneValidation.isValid);

  // Completion calculation (0 - 100%) for the 3 steps
  let completionCount = $derived(
    (isChurchValid ? 1 : 0) +
    (isServantValid ? 1 : 0) +
    (isPhoneValid ? 1 : 0)
  );
  let completionPercentage = $derived(Math.round((completionCount / 3) * 100));

  let isFormReady = $derived(isChurchValid && isServantValid && isPhoneValid);

  function selectChurch(church: string) {
    selectedChurch = church;
    errorMsg = null;
  }

  function resetForm() {
    selectedChurch = '';
    customChurchName = '';
    activeTab = 'list';
    churchSearchQuery = '';
    selectedAreaFilter = 'ALL';
    servantName = '';
    servantRole = 'أمين خدمة';
    customRoleInput = '';
    servantPhone = '';
    extraNotes = '';
    errorMsg = null;
  }

  async function handleFormSubmit(e?: Event) {
    if (e) e.preventDefault();

    const church = effectiveChurchName;
    const name = servantName.trim();

    if (!church) {
      errorMsg = 'يرجى اختيار اسم الكنيسة من القائمة المعتمدة أو كتابة اسم كنيسة جديدة.';
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    if (!name) {
      errorMsg = 'يرجى كتابة اسم الخادم المسند إليه هذا الترخيص.';
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    if (!phoneValidation.isValid) {
      errorMsg =
        phoneValidation.error ||
        'يرجى إدخال رقم هاتف مصري معتمد (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).';
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    // Build structured notes with Role and Phone
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
    } catch (err: any) {
      errorMsg = err.message || 'حدث خطأ أثناء إصدار الترخيص.';
    }
  }

  // Keyboard shortcut listener (Esc to go back, Ctrl+Enter to submit)
  onMount(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onBack();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (isFormReady && !isSubmitting) {
          handleFormSubmit();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div class="w-full pb-16 animate-in fade-in-0 duration-300">
  <!-- Top Navigation & Breadcrumb Header -->
  <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
    <div class="flex items-center gap-3.5">
      <button
        type="button"
        onclick={onBack}
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer shadow-sm group"
        title="العودة إلى جدول التراخيص (Esc)"
      >
        <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
        <span class="text-xs sm:text-sm font-semibold">العودة للجدول</span>
        <span class="hidden sm:inline text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">Esc</span>
      </button>

      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
          <span>لوحة التحكم</span>
          <span>/</span>
          <span>إدارة التراخيص</span>
          <span>/</span>
          <span class="text-indigo-400 font-semibold">إصدار ترخيص وسيريال جديد</span>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            إصدار ترخيص وسيريال كنسي جديد
          </h1>
          <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <ShieldCheck class="w-3.5 h-3.5 text-indigo-400" />
            <span>نظام التشفير بالعتاد HWID-v2</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Actions in Header (Desktop) -->
    <div class="flex items-center gap-2.5 self-end md:self-auto">
      <button
        type="button"
        onclick={resetForm}
        disabled={isSubmitting}
        class="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>تفريغ الحقول</span>
      </button>

      <button
        type="button"
        onclick={() => handleFormSubmit()}
        disabled={!isFormReady || isSubmitting}
        class="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
      >
        {#if isSubmitting}
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>جاري التوليد...</span>
        {:else}
          <Zap class="w-4 h-4 fill-white" />
          <span>توليد السيريال وحفظ الترخيص</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Global Error Alert -->
  {#if errorMsg}
    <div class="mb-6 bg-rose-950/60 border border-rose-800/90 rounded-2xl p-4 text-rose-200 text-xs sm:text-sm flex items-center gap-3 shadow-xl animate-in fade-in-0 duration-200">
      <AlertCircle class="w-5 h-5 text-rose-400 shrink-0" />
      <div class="flex-1 font-medium">{errorMsg}</div>
      <button
        type="button"
        onclick={() => (errorMsg = null)}
        class="text-rose-400 hover:text-white p-1 rounded-lg"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Main 2-Column Fullpage Layout -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
    
    <!-- ================= RIGHT COLUMN: FORM STEPS (8 COLS) ================= -->
    <div class="lg:col-span-8 space-y-6">

      <!-- STEP 1: CHURCH SELECTION -->
      <section class="bg-slate-900/60 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 relative overflow-hidden backdrop-blur-sm">
        <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80 flex-wrap">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-md">
              <Church class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/50">
                  الخطوة 1
                </span>
                <h2 class="text-base sm:text-lg font-black text-white">
                  اختيار الكنيسة (اسم الكنيسة المعتمد)
                </h2>
                <span class="text-rose-400 font-bold">*</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                يتم ربط رخصة التشغيل وقفل البرنامج باسم هذه الكنيسة المسجلة
              </p>
            </div>
          </div>

          <!-- Status badge -->
          {#if isChurchValid}
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>تم اختيار الكنيسة</span>
            </span>
          {:else}
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span>مطلوب التحديد</span>
            </span>
          {/if}
        </div>

        <Tabs.Root bind:value={activeTab} class="w-full">
          <!-- Tabs Selection Header -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <span class="text-xs font-semibold text-slate-300">طريقة تحديد الكنيسة:</span>
            <Tabs.List class="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <Tabs.Trigger
                value="list"
                class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-slate-200"
              >
                <span>🏛️ كنائس الإيبارشية المعتمدة</span>
                <span class="text-[11px] bg-slate-900/90 px-2 py-0.5 rounded-full font-mono font-normal">
                  {churches.length}
                </span>
              </Tabs.Trigger>

              <Tabs.Trigger
                value="custom"
                class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-slate-200"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>كنيسة جديدة حرة</span>
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <!-- TAB 1: Diocesan Churches List with Filters & Arabic Search -->
          <Tabs.Content value="list" class="space-y-4 pt-1 focus:outline-none">
            <!-- Selected Church Banner -->
            {#if selectedChurch}
              <div class="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/60 border-2 border-indigo-500/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/30">
                    <Church class="w-6 h-6" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[11px] text-indigo-300 font-bold flex items-center gap-1.5">
                      <span>✓ الكنيسة المختارة رسمياً:</span>
                      <span class="bg-indigo-900/60 text-indigo-200 px-2 py-0.2 rounded text-[10px]">معتمدة بالإيبارشية</span>
                    </div>
                    <div class="text-sm sm:text-base font-extrabold text-white leading-snug break-words mt-0.5">
                      {selectedChurch}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onclick={() => (selectedChurch = '')}
                  class="self-end sm:self-center text-xs font-bold text-indigo-200 hover:text-white bg-indigo-900/60 hover:bg-indigo-800 px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 border border-indigo-500/40 flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>تغيير الكنيسة</span>
                </button>
              </div>
            {/if}

            <!-- Quick Area Filter Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span class="text-slate-400 font-medium ml-1 shrink-0">تصفية سريعة:</span>
              {#each AREA_FILTERS as area}
                <button
                  type="button"
                  onclick={() => (selectedAreaFilter = area.id)}
                  class="px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 text-xs {selectedAreaFilter === area.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 border border-indigo-400'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'}"
                >
                  {area.label}
                </button>
              {/each}
            </div>

            <!-- Search Bar with Arabic normalization -->
            <div class="relative">
              <input
                type="text"
                bind:value={churchSearchQuery}
                placeholder="🔍 ابحث بالاسم أو المنطقة (مثال: الخصوص، شبين، كنيسة العذراء، مارجرجس، طوخ، كفر شبين)..."
                class="w-full bg-slate-950/90 border border-slate-700/80 text-white rounded-2xl px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm placeholder:text-slate-500 shadow-inner"
              />
              <Search class="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
              {#if churchSearchQuery}
                <button
                  type="button"
                  onclick={() => (churchSearchQuery = '')}
                  class="absolute left-4 top-3 text-xs text-slate-400 hover:text-white cursor-pointer bg-slate-800 px-2 py-0.5 rounded-lg"
                >
                  ✕ مسح
                </button>
              {/if}
            </div>

            <!-- Churches Grid List -->
            <div class="max-h-72 overflow-y-auto pr-1 space-y-1.5 rounded-2xl border border-slate-800/80 p-2 bg-slate-950/40">
              {#if filteredChurches.length === 0}
                <div class="py-8 text-center text-xs sm:text-sm text-slate-400 space-y-3">
                  <p>لا توجد كنيسة مطابقة لبحثك "{churchSearchQuery}"</p>
                  <button
                    type="button"
                    onclick={() => {
                      activeTab = 'custom';
                      customChurchName = churchSearchQuery;
                    }}
                    class="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 px-4 py-2 rounded-xl border border-indigo-800/50 cursor-pointer font-bold"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>إضافة "{churchSearchQuery}" كاسم كنيسة جديدة حرة</span>
                  </button>
                </div>
              {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {#each filteredChurches as church}
                    <button
                      type="button"
                      onclick={() => selectChurch(church)}
                      class="text-right p-3.5 rounded-2xl text-xs sm:text-sm transition cursor-pointer flex items-start justify-between gap-3 border group {selectedChurch === church
                        ? 'bg-gradient-to-r from-indigo-950/90 to-indigo-900/60 text-white font-bold border-indigo-500 shadow-lg shadow-indigo-600/15 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800/80 hover:text-white border-slate-800/70'}"
                    >
                      <div class="flex items-start gap-2.5 min-w-0">
                        <span class="text-base shrink-0 mt-0.5 group-hover:scale-110 transition-transform">⛪</span>
                        <div class="min-w-0">
                          <span class="leading-relaxed break-words font-medium block">{church}</span>
                          <span class="text-[10px] text-slate-500 mt-0.5 block">إيبارشية شبين القناطر وتوابعها</span>
                        </div>
                      </div>
                      {#if selectedChurch === church}
                        <span class="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-md">
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
          <Tabs.Content value="custom" class="space-y-4 pt-1 focus:outline-none">
            <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <Label.Root for="customChurchInput" class="block text-xs font-bold text-slate-200">
                اكتب اسم الكنيسة بالكامل كما سيتم اعتماده في البرنامج وملف التراخيص:
              </Label.Root>
              <input
                id="customChurchInput"
                type="text"
                bind:value={customChurchName}
                placeholder="مثال: كنيسة الشهيد العظيم مارجرجس - المنيا / كنيسة العذراء مريم - دمنهور"
                disabled={isSubmitting}
                class="w-full bg-slate-900 border-2 border-indigo-500/60 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base shadow-inner font-semibold placeholder:text-slate-500"
              />
              <div class="p-3 bg-amber-950/30 rounded-xl border border-amber-800/30 text-xs text-amber-200/90 flex items-start gap-2">
                <span class="text-base shrink-0">💡</span>
                <span class="leading-relaxed">
                  يُفضل كتابة الاسم بصيغة رسمية واضحة تبدأ بـ "كنيسة ..." وتحديد المكان بدقة، حيث سيتم إقفال البرنامج كنسياً ولا يمكن تغييره للمستخدم إلا من خلال السيرفر.
                </span>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      <!-- STEP 2: SERVANT DETAILS, ECCLESIASTICAL ROLE & EGYPT PHONE -->
      <section class="bg-slate-900/60 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 relative overflow-hidden backdrop-blur-sm">
        <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80 flex-wrap">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-md">
              <User class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/50">
                  الخطوة 2
                </span>
                <h2 class="text-base sm:text-lg font-black text-white">
                  بيانات الخادم / المسؤول والتواصل
                </h2>
                <span class="text-rose-400 font-bold">*</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                تحديد الشخص المسؤول عن استلام الترخيص والتحقق من رقم الهاتف المصري
              </p>
            </div>
          </div>

          <!-- Status badge -->
          {#if isServantValid && isPhoneValid}
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>مكتمل</span>
            </span>
          {:else}
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span>مطلوب استكماله</span>
            </span>
          {/if}
        </div>

        <!-- Name & Phone Subgrid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- 1. Servant Name -->
          <div>
            <Label.Root for="servantNameInput" class="block text-xs sm:text-sm font-bold text-slate-200 mb-2">
              اسم الخادم / الكاهن <span class="text-rose-400">*</span>
            </Label.Root>
            <div class="relative">
              <input
                id="servantNameInput"
                type="text"
                bind:value={servantName}
                placeholder="مثال: القس بيشوي عزيز / الشماس مينا مكرم / أ. مريم"
                required
                disabled={isSubmitting}
                class="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 pr-11 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner transition"
              />
              <User class="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
            </div>
            <p class="text-[11px] text-slate-400 mt-1">الاسم الثلاثي أو الكنسي للمسؤول</p>
          </div>

          <!-- 2. Egypt Phone with Live Validation -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <Label.Root for="servantPhoneInput" class="text-xs sm:text-sm font-bold text-slate-200">
                رقم المحمول (مصر) <span class="text-rose-400">*</span>
              </Label.Root>
              {#if servantPhone}
                {#if phoneValidation.isValid}
                  <span class="text-[10px] text-emerald-300 font-extrabold flex items-center gap-1 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-700/60 shadow-sm">
                    <Check class="w-3 h-3" />
                    <span>{phoneValidation.carrier}</span>
                  </span>
                {:else}
                  <span class="text-[10px] text-rose-400 font-medium bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-800/40">
                    رقم غير صالح
                  </span>
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
                class="w-full bg-slate-950 border {servantPhone ? (phoneValidation.isValid ? 'border-emerald-500/70 ring-1 ring-emerald-500/30' : 'border-rose-500/70 ring-1 ring-rose-500/30') : 'border-slate-700/80'} rounded-2xl px-4 py-3 pl-11 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner font-mono tracking-wider transition"
              />
              <Smartphone class="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            </div>

            {#if servantPhone && !phoneValidation.isValid}
              <p class="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <span>⚠️</span>
                <span>{phoneValidation.error}</span>
              </p>
            {:else}
              <p class="text-[11px] text-slate-400 mt-1">
                الشبكات المدعومة: 010 (فودافون) • 011 (اتصالات) • 012 (أورنج) • 015 (وي)
              </p>
            {/if}
          </div>
        </div>

        <!-- 3. Church Role Selector Cards -->
        <div class="pt-2">
          <Label.Root class="block text-xs sm:text-sm font-bold text-slate-200 mb-2.5 flex items-center gap-2">
            <Briefcase class="w-4 h-4 text-indigo-400" />
            <span>الدور والمسمى الوظيفي الكنسي:</span>
            <span class="text-rose-400">*</span>
          </Label.Root>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <!-- Option 1: كاهن -->
            <button
              type="button"
              onclick={() => (servantRole = 'كاهن')}
              class="p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 {servantRole === 'كاهن'
                ? 'bg-amber-600/25 border-amber-500 text-white shadow-lg shadow-amber-600/10 ring-1 ring-amber-500/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">✝️</span>
                {#if servantRole === 'كاهن'}
                  <span class="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">✓</span>
                {/if}
              </div>
              <div>
                <div class="text-xs sm:text-sm font-bold {servantRole === 'كاهن' ? 'text-amber-300' : 'text-slate-200'}">
                  كاهن راعي
                </div>
                <div class="text-[10px] text-slate-500">رعاية وافتقاد</div>
              </div>
            </button>

            <!-- Option 2: أمين خدمة -->
            <button
              type="button"
              onclick={() => (servantRole = 'أمين خدمة')}
              class="p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 {servantRole === 'أمين خدمة'
                ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">⭐</span>
                {#if servantRole === 'أمين خدمة'}
                  <span class="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                {/if}
              </div>
              <div>
                <div class="text-xs sm:text-sm font-bold {servantRole === 'أمين خدمة' ? 'text-indigo-300' : 'text-slate-200'}">
                  أمين خدمة
                </div>
                <div class="text-[10px] text-slate-500">مسؤول القطاع</div>
              </div>
            </button>

            <!-- Option 3: مدخل بيانات -->
            <button
              type="button"
              onclick={() => (servantRole = 'مدخل بيانات (Data Entry)')}
              class="p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 {servantRole === 'مدخل بيانات (Data Entry)'
                ? 'bg-sky-600/25 border-sky-500 text-white shadow-lg shadow-sky-600/10 ring-1 ring-sky-500/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">💻</span>
                {#if servantRole === 'مدخل بيانات (Data Entry)'}
                  <span class="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                {/if}
              </div>
              <div>
                <div class="text-xs sm:text-sm font-bold {servantRole === 'مدخل بيانات (Data Entry)' ? 'text-sky-300' : 'text-slate-200'}">
                  Data Entry
                </div>
                <div class="text-[10px] text-slate-500">إدخال وطباعة</div>
              </div>
            </button>

            <!-- Option 4: سكرتير المطرانية -->
            <button
              type="button"
              onclick={() => (servantRole = 'سكرتارية المطرانية والكنيسة')}
              class="p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 {servantRole === 'سكرتارية المطرانية والكنيسة'
                ? 'bg-purple-600/25 border-purple-500 text-white shadow-lg shadow-purple-600/10 ring-1 ring-purple-500/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">📋</span>
                {#if servantRole === 'سكرتارية المطرانية والكنيسة'}
                  <span class="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                {/if}
              </div>
              <div>
                <div class="text-xs sm:text-sm font-bold {servantRole === 'سكرتارية المطرانية والكنيسة' ? 'text-purple-300' : 'text-slate-200'}">
                  سكرتارية
                </div>
                <div class="text-[10px] text-slate-500">متابعة إدارية</div>
              </div>
            </button>

            <!-- Option 5: أخرى -->
            <button
              type="button"
              onclick={() => (servantRole = 'أخرى')}
              class="p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 {servantRole === 'أخرى'
                ? 'bg-emerald-600/25 border-emerald-500 text-white shadow-lg shadow-emerald-600/10 ring-1 ring-emerald-500/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'}"
            >
              <div class="flex items-center justify-between">
                <span class="text-xl">✏️</span>
                {#if servantRole === 'أخرى'}
                  <span class="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                {/if}
              </div>
              <div>
                <div class="text-xs sm:text-sm font-bold {servantRole === 'أخرى' ? 'text-emerald-300' : 'text-slate-200'}">
                  مسمى مخصص
                </div>
                <div class="text-[10px] text-slate-500">دور وظيفي آخر</div>
              </div>
            </button>
          </div>

          {#if servantRole === 'أخرى'}
            <div class="mt-3">
              <input
                type="text"
                bind:value={customRoleInput}
                placeholder="اكتب المسمى الوظيفي الكنسي بالتحديد (مثال: أمين الصندوق، دياكون، مسؤول الكشافة)..."
                class="w-full bg-slate-950 border border-slate-700/80 text-white rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          {/if}
        </div>
      </section>

      <!-- STEP 3: HARDWARE & INSTALLATION NOTES -->
      <section class="bg-slate-900/60 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 relative overflow-hidden backdrop-blur-sm">
        <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80 flex-wrap">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-md">
              <Laptop class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/50">
                  الخطوة 3
                </span>
                <h2 class="text-base sm:text-lg font-black text-white">
                  ملاحظات التثبيت وإعدادات الجهاز
                </h2>
                <span class="text-xs text-slate-400 font-medium">(اختياري)</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                تدوين مكان الجهاز في الكنيسة، أو أي تفاصيل إضافية لتسهيل المتابعة
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label.Root for="extraNotesInput" class="block text-xs sm:text-sm font-bold text-slate-200 mb-2">
            ملاحظات التثبيت وموقع الجهاز:
          </Label.Root>
          <input
            id="extraNotesInput"
            type="text"
            bind:value={extraNotes}
            placeholder="مثال: جهاز كمبيوتر أمانة الخدمة الرئيسي - الدور الأرضي / لابتوب أبونا المتنقل..."
            disabled={isSubmitting}
            class="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-inner placeholder:text-slate-500"
          />
        </div>

        <!-- Hardware Locking Explanatory Card -->
        <div class="p-4 bg-gradient-to-r from-indigo-950/50 via-slate-950 to-slate-950 rounded-2xl border border-indigo-900/50 flex items-start gap-3">
          <Lock class="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div class="text-xs text-slate-300 leading-relaxed space-y-1">
            <span class="font-bold text-indigo-300 block">🔒 سياسة الأمان والقفل العتادي (HWID Lock):</span>
            <p>
              يتم إصدار السيريال كـ <span class="font-mono text-emerald-400">Unactivated</span> لأول مرة. وعند تشغيل البرنامج على جهاز الكنيسة وإدخال السيريال، يتم التعرف تلقائياً على البصمة الفريدة للعتاد (Motherboard + CPU ID) وقفل الترخيص عليها فورياً. ولن يفتح البرنامج على أي كمبيوتر آخر إلا بعد فك ربط الجهاز من لوحة التحكم هذه.
            </p>
          </div>
        </div>
      </section>

    </div>

    <!-- ================= LEFT COLUMN: STICKY LIVE PREVIEW & ACTIONS (4 COLS) ================= -->
    <div class="lg:col-span-4 space-y-5 lg:sticky lg:top-4">

      <!-- VIRTUAL LICENSE HOLOGRAPHIC CARD -->
      <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-2 border-indigo-500/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <!-- Top Glow Gradient Line -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400"></div>

        <!-- Card Header with Official Emblem -->
        <div class="flex items-center justify-between pb-3 border-b border-indigo-900/60 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Shield class="w-4 h-4" />
            </div>
            <div>
              <div class="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                ChurchCare Official License
              </div>
              <div class="text-[11px] text-slate-300 font-semibold">
                إيبارشية شبين القناطر وتوابعها
              </div>
            </div>
          </div>
          <span class="text-[10px] font-mono bg-indigo-900/70 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-700/60">
            2026/2027
          </span>
        </div>

        <!-- Dynamic Church Name -->
        <div class="space-y-1 mb-4">
          <span class="text-[11px] text-indigo-300 font-medium">اسم الكنيسة المعتمد:</span>
          <div class="text-base sm:text-lg font-black text-white leading-tight min-h-[2.5rem] break-words flex items-center">
            {#if effectiveChurchName}
              <span>{effectiveChurchName}</span>
            {:else}
              <span class="text-slate-500 italic font-normal text-xs">— بانتظار اختيار الكنيسة —</span>
            {/if}
          </div>
        </div>

        <!-- Dynamic Servant & Role -->
        <div class="grid grid-cols-2 gap-2 pb-4 border-b border-indigo-900/40 mb-4">
          <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">👤 الخادم المسند:</span>
            <div class="font-bold text-xs text-white truncate">
              {servantName || '— لم يحدد'}
            </div>
            <div class="text-[10px] text-indigo-300 font-medium mt-0.5">
              {effectiveRole}
            </div>
          </div>

          <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">📱 المحمول (مصر):</span>
            <div class="font-mono font-bold text-xs truncate {phoneValidation.isValid ? 'text-emerald-400' : 'text-slate-400'}" dir="ltr">
              {phoneValidation.isValid ? phoneValidation.normalized : (servantPhone || '—')}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5 truncate">
              {phoneValidation.isValid ? phoneValidation.carrier : 'غير مؤكد'}
            </div>
          </div>
        </div>

        <!-- Serial Key Preview Placeholder -->
        <div class="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-3.5 mb-2 shadow-inner">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span class="flex items-center gap-1.5 font-bold text-indigo-300">
              <KeyRound class="w-3.5 h-3.5" />
              <span>مفتاح السيريال المشفر:</span>
            </span>
            <span class="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.2 rounded border border-emerald-800/40">
              توليد تلقائي
            </span>
          </div>
          <div class="font-mono font-extrabold text-sm sm:text-base text-emerald-400 tracking-wider text-center py-1">
            CCARE-••••-••••-••••
          </div>
          <div class="text-[10px] text-center text-slate-500 mt-1 flex items-center justify-center gap-1">
            <Lock class="w-3 h-3 text-slate-500" />
            <span>سيتم تشفيره وربطه بالـ Firebase فور الضغط</span>
          </div>
        </div>
      </div>

      <!-- FORM COMPLETION CHECKLIST & PROGRESS -->
      <div class="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3.5">
        <div class="flex items-center justify-between text-xs font-bold">
          <span class="text-white flex items-center gap-1.5">
            <span>جاهزية بيانات الترخيص</span>
          </span>
          <span class="font-mono {completionPercentage === 100 ? 'text-emerald-400' : 'text-indigo-400'}">
            {completionPercentage}%
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            class="h-full rounded-full transition-all duration-300 {completionPercentage === 100
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-indigo-500 to-sky-400'}"
            style="width: {completionPercentage}%"
          ></div>
        </div>

        <!-- Checklist Items (3 Steps) -->
        <div class="space-y-2 text-xs pt-1">
          <div class="flex items-center justify-between text-slate-300">
            <span class="flex items-center gap-2">
              <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold {isChurchValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                {isChurchValid ? '✓' : '1'}
              </span>
              <span>تحديد اسم الكنيسة</span>
            </span>
            <span class="{isChurchValid ? 'text-emerald-400 font-bold' : 'text-slate-500'}">
              {isChurchValid ? 'مكتمل' : 'مطلوب'}
            </span>
          </div>

          <div class="flex items-center justify-between text-slate-300">
            <span class="flex items-center gap-2">
              <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold {isServantValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                {isServantValid ? '✓' : '2'}
              </span>
              <span>اسم الخادم المسؤول</span>
            </span>
            <span class="{isServantValid ? 'text-emerald-400 font-bold' : 'text-slate-500'}">
              {isServantValid ? 'مكتمل' : 'مطلوب'}
            </span>
          </div>

          <div class="flex items-center justify-between text-slate-300">
            <span class="flex items-center gap-2">
              <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold {isPhoneValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                {isPhoneValid ? '✓' : '3'}
              </span>
              <span>رقم هاتف مصري معتمد</span>
            </span>
            <span class="{isPhoneValid ? 'text-emerald-400 font-bold' : 'text-slate-500'}">
              {isPhoneValid ? 'مكتمل' : 'مطلوب'}
            </span>
          </div>
        </div>

        <Separator.Root class="bg-slate-800 h-px w-full my-3" />

        <!-- Primary Generation CTA -->
        <button
          type="button"
          onclick={() => handleFormSubmit()}
          disabled={!isFormReady || isSubmitting}
          class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {#if isSubmitting}
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>جاري توليد السيريال والربط بالسيرفر...</span>
          {:else}
            <Zap class="w-5 h-5 fill-white" />
            <span>توليد السيريال وحفظ الترخيص</span>
          {/if}
        </button>

        <button
          type="button"
          onclick={onBack}
          disabled={isSubmitting}
          class="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer text-center"
        >
          إلغاء والعودة لجدول التراخيص
        </button>
      </div>

      <!-- Quick Guidance & Help Card -->
      <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <div class="flex items-center gap-2 font-bold text-slate-300">
          <HelpCircle class="w-4 h-4 text-indigo-400" />
          <span>تلميحات للمسؤول:</span>
        </div>
        <ul class="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
          <li>سيتم إدراج الترخيص فورياً في قاعدة البيانات وتحديث شيت الـ Excel.</li>
          <li>يمكنك نسخ السيريال بضغطة زر واحدة وإرساله مباشرة للخادم عبر واتساب.</li>
          <li>يمكن فك ربط جهاز الترخيص لاحقاً إذا غيرت الكنيسة كمبيوتر الخدمة.</li>
        </ul>
      </div>

    </div>

  </div>
</div>
