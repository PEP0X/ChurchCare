<script lang="ts">
  let {
    isOpen,
    onSuccess
  }: {
    isOpen: boolean;
    onSuccess: () => void;
  } = $props();

  let pin = $state('');
  let errorMsg = $state<string | null>(null);

  const CORRECT_PIN = '320702';

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (pin.trim() === CORRECT_PIN) {
      errorMsg = null;
      localStorage.setItem('church_care_admin_auth', 'authenticated_320702');
      onSuccess();
    } else {
      errorMsg = 'رمز الدخول غير صحيح. يرجى المحاولة مرة أخرى.';
      pin = '';
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl text-center">
      <div class="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
        🔐
      </div>

      <h2 class="text-xl font-bold text-white mb-2">لوحة تحكم التراخيص</h2>
      <p class="text-xs text-slate-400 mb-6">يرجى إدخال رمز الدخول السريع (PIN) لمتابعة العمل</p>

      {#if errorMsg}
        <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4">
          {errorMsg}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <input
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            bind:value={pin}
            placeholder="• • • •"
            class="w-full text-center text-2xl tracking-[0.4em] bg-slate-950 border border-slate-800 rounded-2xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono placeholder:tracking-normal"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium py-3 rounded-2xl transition cursor-pointer text-sm shadow-lg shadow-indigo-500/20"
        >
          دخول لوحة التحكم
        </button>
      </form>
    </div>
  </div>
{/if}
