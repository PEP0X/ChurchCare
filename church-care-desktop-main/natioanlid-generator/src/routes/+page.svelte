<script lang="ts">
  import Checker from "$lib/components/Checker.svelte";
  import Generator from "$lib/components/Generator.svelte";

  type Tab = "checker" | "generator";

  let activeTab = $state<Tab>("checker");
</script>

<svelte:head>
  <title>Egyptian National ID Toolkit</title>
</svelte:head>

<div class="app">
  <header class="topbar">
    <div class="brand">
      <div class="logo-badge">NID</div>
      <div>
        <h1>Egyptian National ID Toolkit</h1>
        <p>Validate, analyze and generate Egyptian National IDs</p>
      </div>
    </div>
  </header>

  <nav class="tabs" aria-label="Main tools">
    <button
      class:active={activeTab === "checker"}
      onclick={() => (activeTab = "checker")}
    >
      <span class="tab-title">Checker</span>
      <span class="tab-sub">Validate &amp; analyze any ID</span>
    </button>
    <button
      class:active={activeTab === "generator"}
      onclick={() => (activeTab = "generator")}
    >
      <span class="tab-title">Generator</span>
      <span class="tab-sub">Custom age, gender &amp; governorate</span>
    </button>
  </nav>

  <main class="content">
    {#if activeTab === "checker"}
      <Checker />
    {:else}
      <Generator />
    {/if}
  </main>

  <footer class="footer">
    Built with the open-source <code>egypt-natid</code> library. Not affiliated with any Egyptian government entity.
  </footer>
</div>

<style>
  :global(:root) {
    --accent: #c8a24b;
    --accent-strong: #e0b952;
    --bg: #0e1116;
    --bg-gradient: radial-gradient(1200px 600px at 20% -10%, #1b2230 0%, #0e1116 55%);
    --surface: #161b24;
    --surface-2: #1d2430;
    --border: #2a3442;
    --text: #e8ecf2;
    --muted: #8b95a5;
    --success: #4cc38a;
    --danger: #e06c75;
    --mono: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, monospace;
    --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    min-height: 100%;
  }

  :global(body) {
    font-family: var(--sans);
    color: var(--text);
    background: var(--bg-gradient);
    background-color: var(--bg);
    background-attachment: fixed;
    -webkit-font-smoothing: antialiased;
  }

  :global(.btn) {
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    padding: 10px 18px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: var(--sans);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :global(.btn:hover:not(:disabled)) {
    border-color: var(--accent);
  }

  :global(.btn.primary) {
    background: linear-gradient(135deg, var(--accent-strong), var(--accent));
    border-color: transparent;
    color: #1a1406;
  }

  :global(.btn.primary:hover:not(:disabled)) {
    filter: brightness(1.08);
  }

  :global(.btn:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global(input[type="text"]) {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    padding: 12px 14px;
    font-size: 0.95rem;
    transition: border-color 0.15s ease;
  }

  :global(input[type="text"]:focus) {
    outline: none;
    border-color: var(--accent);
  }

  :global(input[type="text"]::placeholder) {
    color: var(--muted);
  }

  .app {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 20px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .logo-badge {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent-strong), var(--accent));
    color: #1a1406;
    font-family: var(--mono);
    font-weight: 700;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: 0.02em;
    box-shadow: 0 4px 20px rgba(200, 162, 75, 0.25);
  }

  .brand h1 {
    margin: 0;
    font-size: 1.3rem;
    letter-spacing: -0.01em;
  }

  .brand p {
    margin: 2px 0 0;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tabs button {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    color: var(--text);
  }

  .tabs button:hover {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  }

  .tabs button.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  }

  .tab-title {
    font-size: 1rem;
    font-weight: 600;
  }

  .tab-sub {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .tabs button.active .tab-sub {
    color: var(--accent);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .footer {
    text-align: center;
    font-size: 0.76rem;
    color: var(--muted);
  }

  .footer code {
    font-family: var(--mono);
    color: var(--accent);
  }

  @media (max-width: 640px) {
    .app { padding: 20px 14px 40px; }
    .brand h1 { font-size: 1.05rem; }
    .brand p { display: none; }
  }
</style>
