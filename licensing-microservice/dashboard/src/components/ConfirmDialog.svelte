<script lang="ts">
  import { Dialog, Separator } from 'bits-ui';
  import { AlertTriangle, AlertCircle, Info, X } from '@lucide/svelte';

  let {
    open = $bindable(false),
    title = 'تأكيد العملية',
    description = 'هل أنت متأكد من رغبتك في متابعة هذا الإجراء؟',
    confirmText = 'تأكيد المتابعة',
    cancelText = 'إلغاء',
    variant = 'danger',
    onConfirm
  }: {
    open: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void> | void;
  } = $props();

  let isSubmitting = $state(false);

  async function handleConfirm() {
    isSubmitting = true;
    try {
      await onConfirm();
      open = false;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-all duration-200" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-6 shadow-2xl text-right overflow-hidden focus:outline-none"
    >
      <!-- Top Glow Accent -->
      <div
        class="absolute top-0 left-0 right-0 h-1 {variant === 'danger'
          ? 'bg-rose-500'
          : variant === 'warning'
          ? 'bg-amber-500'
          : 'bg-indigo-500'}"
      ></div>

      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-2xl flex items-center justify-center text-lg border shadow-md {variant === 'danger'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              : variant === 'warning'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'}"
          >
            {#if variant === 'danger'}
              <AlertTriangle class="w-5 h-5" />
            {:else if variant === 'warning'}
              <AlertCircle class="w-5 h-5" />
            {:else}
              <Info class="w-5 h-5" />
            {/if}
          </div>

          <div>
            <Dialog.Title class="text-lg font-black text-white">
              {title}
            </Dialog.Title>
          </div>
        </div>

        <Dialog.Close
          class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700/60"
          aria-label="إغلاق"
        >
          <X class="w-4 h-4" />
        </Dialog.Close>
      </div>

      <Dialog.Description class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
        {description}
      </Dialog.Description>

      <Separator.Root class="bg-slate-800/80 my-3 h-px w-full" />

      <div class="flex items-center justify-end gap-3 pt-2">
        <Dialog.Close
          class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm transition cursor-pointer text-center"
        >
          {cancelText}
        </Dialog.Close>

        <button
          type="button"
          onclick={handleConfirm}
          disabled={isSubmitting}
          class="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 {variant === 'danger'
            ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/20'
            : variant === 'warning'
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-600/20'
            : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/20'}"
        >
          {#if isSubmitting}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>جاري المعالجة...</span>
          {:else}
            <span>{confirmText}</span>
          {/if}
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
