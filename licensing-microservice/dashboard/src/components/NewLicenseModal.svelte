<script lang="ts">
  let {
    isOpen,
    onClose,
    onSubmit,
    isSubmitting = false
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (clientName: string, notes: string) => Promise<void>;
    isSubmitting?: boolean;
  } = $props();

  let clientName = $state('');
  let notes = $state('');
  let errorMsg = $state<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!clientName.trim()) {
      errorMsg = 'يرجى إدخال اسم العميل أو الكنيسة.';
      return;
    }
    errorMsg = null;
    try {
      await onSubmit(clientName.trim(), notes.trim());
      clientName = '';
      notes = '';
      onClose();
    } catch (err: any) {
      errorMsg = err.message || 'حدث خطأ أثناء إصدار الترخيص.';
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-right animate-in fade-in zoom-in duration-150">
      <div class="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span>✨</span>
          <span>إصدار ترخيص جديد</span>
        </h3>
        <button onclick={onClose} class="text-slate-400 hover:text-white cursor-pointer text-xl">&times;</button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="clientNameInput" class="block text-sm font-medium text-slate-300 mb-1.5">
            اسم العميل أو الكنيسة <span class="text-rose-400">*</span>
          </label>
          <input
            id="clientNameInput"
            type="text"
            bind:value={clientName}
            placeholder="مثال: كنيسة الشهيد مارجرجس - المنيا"
            required
            disabled={isSubmitting}
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label for="notesInput" class="block text-sm font-medium text-slate-300 mb-1.5">
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            id="notesInput"
            rows="2"
            bind:value={notes}
            placeholder="تفاصيل العميل، المسؤول، أو التكلفة..."
            disabled={isSubmitting}
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          ></textarea>
        </div>

        {#if errorMsg}
          <div class="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 text-rose-300 text-xs">
            {errorMsg}
          </div>
        {/if}

        <div class="mt-6 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onclick={onClose}
            disabled={isSubmitting}
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
          >
            {#if isSubmitting}
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              <span>جاري التوليد...</span>
            {:else}
              <span>توليد السيريال</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
