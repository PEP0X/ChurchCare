<script lang="ts">
  import { generateId, validate, parse, type NationalIdAnalysis } from "egypt-natid";
  import { GOVERNORATES, regionLabel, governorateByCode } from "$lib/governorates";
  import { daysInMonth, formatDate, randomPastDate, copyText } from "$lib/utils";

  const today = new Date();
  const currentYear = today.getFullYear();

  type GenderMode = "Male" | "Female" | "Random";
  type DateMode = "age" | "date";

  let dateMode = $state<DateMode>("age");
  let age = $state(25);
  let year = $state(currentYear - 25);
  let month = $state(6);
  let day = $state(15);
  let gender = $state<GenderMode>("Random");
  let govCode = $state<number | null>(null);
  let count = $state(1);

  let generated = $state<string[]>([]);
  let generatedDate = $state<Date | null>(null);
  let copiedIndex = $state<number | null>(null);
  let copyAllLabel = $state("");

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  let copyAllTimer: ReturnType<typeof setTimeout> | undefined;

  const years = $derived.by(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 1900; y--) list.push(y);
    return list;
  });

  const daysForMonth = $derived(daysInMonth(year, month));

  const dateError = $derived.by<string | null>(() => {
    const d = new Date(year, month - 1, day);
    if (d > today) return "Selected birth date is in the future.";
    return null;
  });

  const birthParts = $derived.by(() => {
    if (dateMode === "age") {
      return randomPastDate(currentYear - age);
    }
    return { year, month, day: Math.min(day, daysForMonth) };
  });

  const birthLabel = $derived.by(() => {
    const p = birthParts;
    const d = new Date(p.year, p.month - 1, p.day);
    return formatDate(d);
  });

  function currentOptions() {
    const p = birthParts;
    const opts: {
      birthYear?: number;
      birthMonth?: number;
      birthDay?: number;
      governorateCode?: number;
      gender?: "Male" | "Female";
    } = {};
    if (p.year >= 1900) opts.birthYear = p.year;
    opts.birthMonth = p.month;
    opts.birthDay = p.day;
    if (govCode !== null) opts.governorateCode = govCode;
    if (gender !== "Random") opts.gender = gender;
    return opts;
  }

  function doGenerate() {
    if (dateError) return;
    const opts = currentOptions();
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = generateId(opts);
      if (validate(id)) list.push(id);
    }
    if (list.length === 0) return;
    generated = list;
    generatedDate = new Date();
    copiedIndex = null;
    copyAllLabel = "";
  }

  function analyze(id: string): NationalIdAnalysis | null {
    try {
      return parse(id);
    } catch {
      return null;
    }
  }

  const analyzed = $derived.by(() =>
    generated.map((id) => ({ id, analysis: analyze(id) }))
  );

  const single = $derived(analyzed.length === 1 ? analyzed[0] : null);

  async function copyOne(index: number, text: string) {
    const ok = await copyText(text);
    if (ok) {
      copiedIndex = index;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copiedIndex = null), 1500);
    }
  }

  async function copyAll() {
    const ok = await copyText(generated.join("\n"));
    if (ok) {
      copyAllLabel = "Copied!";
      clearTimeout(copyAllTimer);
      copyAllTimer = setTimeout(() => (copyAllLabel = ""), 1500);
    }
  }
</script>

<div class="card">
  <header class="card-header">
    <h2>Generate a National ID</h2>
    <p>Generate mathematically valid dummy IDs for testing — with full control over age, birth date, gender and governorate.</p>
  </header>

  <div class="segmented">
    <button
      class:active={dateMode === "age"}
      onclick={() => (dateMode = "age")}
    >By Age</button>
    <button
      class:active={dateMode === "date"}
      onclick={() => (dateMode = "date")}
    >By Birth Date</button>
  </div>

  {#if dateMode === "age"}
    <div class="field">
      <div class="field-head">
        <label for="age">Age</label>
        <span class="value-readout">{age} years</span>
      </div>
      <input
        id="age"
        type="range"
        min="0"
        max="120"
        bind:value={age}
      />
      <div class="range-labels">
        <span>0</span><span>120</span>
      </div>
    </div>
    <p class="hint">
      This becomes a birth year of <strong>{currentYear - age}</strong>, with a random day & month.
    </p>
  {:else}
    <div class="date-grid">
      <div class="field">
        <label for="year">Year</label>
        <select id="year" bind:value={year}>
          {#each years as y (y)}
            <option value={y}>{y}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label for="month">Month</label>
        <select id="month" bind:value={month}>
          {#each Array.from({ length: 12 }, (_, i) => i + 1) as m (m)}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label for="day">Day</label>
        <select id="day" bind:value={day}>
          {#each Array.from({ length: daysForMonth }, (_, i) => i + 1) as d (d)}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="field">
    <span class="field-label">Gender</span>
    <div class="segmented">
      <button
        class:active={gender === "Random"}
        onclick={() => (gender = "Random")}
      >Random</button>
      <button
        class:active={gender === "Male"}
        onclick={() => (gender = "Male")}
      >Male</button>
      <button
        class:active={gender === "Female"}
        onclick={() => (gender = "Female")}
      >Female</button>
    </div>
  </div>

  <div class="field">
    <label for="gov">Governorate</label>
    <select id="gov" bind:value={govCode}>
      <option value={null as unknown as number}>Random governorate</option>
      {#each GOVERNORATES as g (g.code)}
        <option value={g.code}>{g.nameEn} — {g.nameAr} (code {g.code})</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="count">How many to generate</label>
    <input
      id="count"
      type="number"
      min="1"
      max="50"
      bind:value={count}
    />
  </div>

  {#if dateError}
    <div class="banner error">
      <span class="dot"></span>
      <span>{dateError}</span>
    </div>
  {:else}
    <div class="banner idle">
      <span class="dot"></span>
      <span>Summary: born <strong>{birthLabel}</strong>
        {#if gender !== "Random"}
          , {gender.toLowerCase()}
        {/if}
        {#if govCode !== null}
          , {governorateByCode(govCode)?.nameEn ?? govCode}
        {/if}
        .</span>
    </div>
  {/if}

  <div class="actions">
    <button class="btn primary" onclick={doGenerate} disabled={!!dateError}>
      Generate {count > 1 ? `${count} IDs` : "ID"}
    </button>
    {#if generated.length > 1}
      <button class="btn" onclick={copyAll}>{copyAllLabel || "Copy all"}</button>
    {/if}
  </div>

  {#if generated.length > 0}
    <div class="results">
      {#if single && single.analysis}
        <div class="single-result">
          <div class="result-main">
            <code class="mono">{single.id}</code>
            <span class="valid-badge">✓ Valid</span>
          </div>
          <div class="result-meta">
            <div class="meta-row">
              <span>Gender</span><strong>{single.analysis.gender}</strong>
            </div>
            <div class="meta-row">
              <span>Birth date</span><strong>{formatDate(single.analysis.birthDate)}</strong>
            </div>
            <div class="meta-row">
              <span>Age</span><strong>{single.analysis.age}</strong>
            </div>
            <div class="meta-row">
              <span>Governorate</span>
              <strong>
                {single.analysis.governorate ? `${single.analysis.governorate.nameEn} (${single.analysis.governorate.code})` : "Unknown"}
              </strong>
            </div>
            <div class="meta-row">
              <span>Region</span><strong>{regionLabel(single.analysis.region)}</strong>
            </div>
          </div>
          <button class="btn" onclick={() => copyOne(0, single.id)}>
            {copiedIndex === 0 ? "Copied!" : "Copy ID"}
          </button>
        </div>
      {:else}
        <div class="list-head">
          <span>{generated.length} IDs generated {generatedDate ? `at ${generatedDate.toLocaleTimeString()}` : ""}</span>
        </div>
        <div class="id-list">
          {#each analyzed as item, i (item.id)}
            <div class="id-row">
              <code class="mono">{item.id}</code>
              {#if item.analysis}
                <span class="pill">{item.analysis.gender}</span>
                <span class="pill">{item.analysis.governorate?.nameEn ?? "?"}</span>
                <span class="pill">Age {item.analysis.age}</span>
              {/if}
              <span class="valid-badge small">✓</span>
              <button class="btn small" onclick={() => copyOne(i, item.id)}>
                {copiedIndex === i ? "Copied!" : "Copy"}
              </button>
            </div>
          {/each}
        </div>
        <div class="distribution">
          {#each GOVERNORATES as g (g.code)}
            {#if analyzed.filter((item) => item.analysis?.governorate?.code === g.code).length > 0}
              <span class="dist-chip">
                {g.nameEn}: {analyzed.filter((item) => item.analysis?.governorate?.code === g.code).length}
              </span>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <footer class="disclaimer">
    Generated IDs are for testing purposes only and do not correspond to real individuals.
  </footer>
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .card-header h2 {
    margin: 0 0 4px;
    font-size: 1.15rem;
  }

  .card-header p {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .field label, .field-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }

  .value-readout {
    font-family: var(--mono);
    font-weight: 600;
    color: var(--accent);
    font-size: 0.95rem;
  }

  .segmented {
    display: inline-flex;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 3px;
    gap: 3px;
  }

  .segmented button {
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 500;
    padding: 7px 16px;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .segmented button:hover {
    color: var(--text);
  }

  .segmented button.active {
    background: var(--accent);
    color: #fff;
  }

  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    color: var(--muted);
  }

  .hint {
    margin: -8px 0 0;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .hint strong {
    color: var(--text);
    font-family: var(--mono);
  }

  .date-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  select, input[type="number"] {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    padding: 10px 12px;
    font-size: 0.92rem;
    width: 100%;
  }

  input[type="number"] {
    width: 120px;
    font-family: var(--mono);
  }

  select:focus, input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 0.88rem;
    border: 1px solid;
  }

  .banner .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .banner.idle {
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--muted);
  }
  .banner.idle .dot { background: var(--accent); }
  .banner.idle strong { color: var(--text); }

  .banner.error {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border-color: color-mix(in srgb, var(--danger) 45%, transparent);
    color: var(--danger);
  }
  .banner.error .dot { background: var(--danger); }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .results {
    border-top: 1px dashed var(--border);
    padding-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .single-result {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .result-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .mono {
    font-family: var(--mono);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 12px 16px;
    border-radius: 12px;
    color: var(--accent);
    word-break: break-all;
  }

  .valid-badge {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    color: var(--success);
    border: 1px solid color-mix(in srgb, var(--success) 45%, transparent);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .valid-badge.small {
    padding: 2px 8px;
    font-size: 0.72rem;
  }

  .result-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .meta-row {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-row span {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  .meta-row strong {
    font-size: 0.88rem;
  }

  .list-head {
    font-size: 0.82rem;
    color: var(--muted);
  }

  .id-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .id-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
  }

  .id-row .mono {
    font-size: 1rem;
    padding: 4px 8px;
    border: none;
    background: transparent;
    flex: 1;
  }

  .pill {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.72rem;
    color: var(--muted);
    white-space: nowrap;
  }

  .btn.small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .distribution {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dist-chip {
    border: 1px solid var(--border);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .disclaimer {
    font-size: 0.75rem;
    color: var(--muted);
    border-top: 1px dashed var(--border);
    padding-top: 12px;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .date-grid { grid-template-columns: 1fr; }
  }
</style>
