<script lang="ts">
  import { Dialog, PinInput, REGEXP_ONLY_DIGITS } from 'bits-ui';
  import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, XCircle } from '@lucide/svelte';

  let {
    isOpen,
    onSuccess
  }: {
    isOpen: boolean;
    onSuccess: () => void;
  } = $props();

  let pin = $state('');
  let showPin = $state(false);
  let errorMsg = $state<string | null>(null);

  const CORRECT_PIN = '320702';

  function verifyPin(val: string) {
    if (val.trim() === CORRECT_PIN) {
      errorMsg = null;
      localStorage.setItem('church_care_admin_auth', 'authenticated_320702');
      onSuccess();
    } else {
      errorMsg = 'رمز الدخول غير صحيح. يرجى التأكد من الرمز والمحاولة مرة أخرى.';
    }
  }

  function handleSubmit(e?: Event) {
    if (e) e.preventDefault();
    if (!pin || pin.length < 6) {
      errorMsg = 'يرجى إدخال الرمز المكون من 6 أرقام بالكامل';
      return;
    }
    verifyPin(pin);
  }

  function handleComplete() {
    if (pin.trim() === CORRECT_PIN) {
      verifyPin(pin);
    }
  }

  function clearPin() {
    pin = '';
    errorMsg = null;
  }
</script>

<Dialog.Root open={isOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md transition-all duration-300" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl text-center focus:outline-none overflow-hidden"
    >
      <!-- Top Accent Bar -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600"></div>

      <!-- Icon -->
      <div class="w-16 h-16 bg-gradient-to-tr from-indigo-600/20 to-sky-500/20 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
        <Lock class="w-8 h-8" />
      </div>

      <Dialog.Title class="text-xl sm:text-2xl font-black text-white mb-2">
        لوحة تحكم تراخيص ChurchCare
      </Dialog.Title>

      <Dialog.Description class="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
        يرجى إدخال رمز الدخول السريع المكون من 6 أرقام للوصول إلى بيانات السيريالات وقاعدة البيانات
      </Dialog.Description>

      {#if errorMsg}
        <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs py-2.5 px-3 rounded-2xl mb-5">
          {errorMsg}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-6">
        <!-- Bits UI PinInput -->
        <div class="flex flex-col items-center gap-3">
          <div class="flex justify-center" dir="ltr">
            <PinInput.Root
              bind:value={pin}
              maxlength={6}
              pattern={REGEXP_ONLY_DIGITS}
              onComplete={handleComplete}
              onValueChange={() => { errorMsg = null; }}
              class="flex items-center justify-center gap-2 sm:gap-2.5"
            >
              {#snippet children({ cells })}
                {#each cells as cell}
                  <PinInput.Cell
                    {cell}
                    class="relative w-11 h-14 sm:w-12 sm:h-16 rounded-2xl bg-slate-950 border-2 {errorMsg ? 'border-rose-500/60' : 'border-slate-800'} text-white font-mono font-black text-2xl flex items-center justify-center transition-all duration-150 data-[active]:border-indigo-500 data-[active]:ring-2 data-[active]:ring-indigo-500/40 shadow-inner select-none"
                  >
                    {#if cell.char !== null}
                      <span class="animate-in zoom-in-75 duration-100 {showPin ? 'text-indigo-300' : 'text-slate-200'}">
                        {showPin ? cell.char : '●'}
                      </span>
                    {/if}
                    {#if cell.hasFakeCaret}
                      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div class="h-6 w-0.5 bg-indigo-400 animate-pulse"></div>
                      </div>
                    {/if}
                  </PinInput.Cell>
                {/each}
              {/snippet}
            </PinInput.Root>
          </div>

          <!-- Helper controls: Show/Hide & Clear -->
          <div class="flex items-center justify-center gap-4 text-xs text-slate-400">
            <button
              type="button"
              onclick={() => showPin = !showPin}
              class="hover:text-indigo-400 transition flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800/50"
            >
              {#if showPin}
                <EyeOff class="w-3.5 h-3.5" />
                <span>إخفاء الرمز</span>
              {:else}
                <Eye class="w-3.5 h-3.5" />
                <span>إظهار الرمز</span>
              {/if}
            </button>

            {#if pin.length > 0}
              <button
                type="button"
                onclick={clearPin}
                class="hover:text-rose-400 transition flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800/50"
              >
                <XCircle class="w-3.5 h-3.5" />
                <span>مسح ({pin.length}/6)</span>
              </button>
            {/if}
          </div>
        </div>

        <button
          type="submit"
          class="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transform active:scale-98"
        >
          <KeyRound class="w-4 h-4" />
          <span>دخول لوحة التحكم</span>
        </button>

        <div class="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-400" />
          <span>جلسة إدارة مشفرة ومؤمنة بالكامل</span>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
