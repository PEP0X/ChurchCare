<script lang="ts">
  import {
    validate,
    sanitize,
    parse,
    type NationalIdAnalysis,
  } from "egypt-natid";
  import { formatDate, copyText } from "$lib/utils";
  import { regionLabel } from "$lib/governorates";

  let rawInput = $state("");
  let copied = $state(false);

  const cleaned = $derived(sanitize(rawInput));
  const isValid = $derived(validate(cleaned));

  const analysis = $derived.by<NationalIdAnalysis | null>(() => {
    if (cleaned.length === 14 && isValid) {
      try {
        return parse(cleaned);
      } catch {
        return null;
      }
    }
    return null;
  });

  const error = $derived.by<string | null>(() => {
    if (cleaned.length === 0) return null;
    if (cleaned.length !== 14)
      return `A National ID must be exactly 14 digits — currently ${cleaned.length}.`;
    if (cleaned.length === 14 && !isValid)
      return "Invalid National ID: it failed the structural and Modulo-11 checksum validation.";
    return null;
  });

  const digitFields = $derived.by(() => {
    if (cleaned.length !== 14) return [];
    return cleaned.split("").map((digit, i) => {
      let label: string;
      let hint: string;
      if (i === 0) {
        label = "Century";
        hint = digit === "2" ? "19xx" : "20xx";
      } else if (i <= 2) {
        label = "Year";
        hint = (cleaned[0] === "2" ? "19" : "20") + cleaned.slice(1, 3);
      } else if (i <= 4) {
        label = "Month";
        hint = cleaned.slice(3, 5);
      } else if (i <= 6) {
        label = "Day";
        hint = cleaned.slice(5, 7);
      } else if (i <= 8) {
        label = "Governorate";
        hint = cleaned.slice(7, 9);
      } else if (i <= 11) {
        label = "Serial";
        hint = cleaned.slice(9, 12);
      } else if (i === 12) {
        label = "Gender";
        hint = Number(digit) % 2 === 0 ? "Female" : "Male";
      } else {
        label = "Check";
        hint = "Mod-11";
      }
      return { digit, label, hint };
    });
  });

  const sampleIds = [
    "30209280119491",
    "30011050232502",
    "29207241235591",
    "30610168884963",
  ];

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    if (!analysis) return;
    const ok = await copyText(analysis.nationalId);
    if (ok) {
      copied = true;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copied = false), 1500);
    }
  }

  function loadSample(sample: string) {
    rawInput = sample;
  }

  function clear() {
    rawInput = "";
    copied = false;
  }
</script>

<div class="card">
  <header class="card-header">
    <h2>Check a National ID</h2>
    <p>Paste any ID — spaces, dashes and Arabic numerals (٠-٩) are handled automatically.</p>
  </header>

  <div class="input-row">
    <div class="input-wrap">
      <input
        type="text"
        placeholder="e.g. 30105050175597"
        maxlength="20"
        bind:value={rawInput}
        spellcheck="false"
        autocomplete="off"
      />
      {#if rawInput.length > 0}
        <button class="clear-btn" title="Clear" onclick={clear}>×</button>
      {/if}
    </div>
    <button class="btn primary" onclick={copy} disabled={!analysis}>
      {copied ? "Copied!" : "Copy"}
    </button>
  </div>

  <div class="samples">
    <span>Sample:</span>
    {#each sampleIds as sample (sample)}
      <button class="chip" onclick={() => loadSample(sample)}>{sample}</button>
    {/each}
  </div>

  {#if error}
    <div class="banner error">
      <span class="dot"></span>
      <span>{error}</span>
    </div>
  {:else if analysis}
    <div class="banner valid">
      <span class="dot"></span>
      <span>Valid National ID — passed structural and Modulo-11 checksum checks.</span>
    </div>
  {:else}
    <div class="banner idle">
      <span class="dot"></span>
      <span>Waiting for a 14-digit National ID…</span>
    </div>
  {/if}

  {#if analysis}
    <div class="id-display">
      <code class="mono">{analysis.nationalId}</code>
      <div class="id-pills">
        <span class="pill">{analysis.gender}</span>
        <span class="pill">Age {analysis.age}</span>
        <span class="pill">{analysis.isAdult ? "Adult" : "Minor"}</span>
        <span class="pill">{analysis.insideEgypt ? "Inside Egypt" : "Abroad"}</span>
      </div>
    </div>

    <div class="grid">
      <div class="cell">
        <span class="cell-label">Gender</span>
        <span class="cell-value">{analysis.gender}</span>
        <span class="cell-hint">{analysis.gender === "Male" ? "Odd serial digit" : "Even serial digit"}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Birth date</span>
        <span class="cell-value">{formatDate(analysis.birthDate)}</span>
        <span class="cell-hint">{analysis.birthYear}-{analysis.birthMonth}-{analysis.birthDay}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Age</span>
        <span class="cell-value">{analysis.age} years</span>
        <span class="cell-hint">{analysis.isAdult ? "18 or older" : "Under 18"}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Governorate</span>
        <span class="cell-value">
          {analysis.governorate ? `${analysis.governorate.nameEn} (${analysis.governorate.code})` : "Unknown"}
        </span>
        <span class="cell-hint" lang="ar">{analysis.governorate?.nameAr ?? "—"}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Economic region</span>
        <span class="cell-value">{regionLabel(analysis.region)}</span>
        <span class="cell-hint">{analysis.region}</span>
      </div>
      <div class="cell">
        <span class="cell-label">Place of birth</span>
        <span class="cell-value">{analysis.insideEgypt ? "Inside Egypt" : "Born abroad"}</span>
        <span class="cell-hint">{analysis.governorate?.nameEn ?? "Foreign"}</span>
      </div>
    </div>

    <section class="breakdown">
      <h3>Digit breakdown</h3>
      <div class="digit-grid">
        {#each digitFields as field, i (i)}
          <div class="digit-chip" class:first={i === 0} class:check={i === 13}>
            <span class="digit">{field.digit}</span>
            <span class="digit-label">{field.label}</span>
            <span class="digit-sub">{field.hint}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <footer class="disclaimer">
    This tool validates National IDs using publicly known structural rules and
    mathematical algorithms only. It does not verify identities against any
    government authority or official database.
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
    gap: 16px;
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

  .input-row {
    display: flex;
    gap: 10px;
  }

  .input-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrap input {
    width: 100%;
    font-family: var(--mono);
    font-size: 1.05rem;
    letter-spacing: 0.5px;
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    border: none;
    background: none;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    line-height: 1;
  }

  .clear-btn:hover {
    color: var(--text);
    background: var(--border);
  }

  .samples {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .chip {
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    border-radius: 999px;
    padding: 3px 10px;
    font-family: var(--mono);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .chip:hover {
    border-color: var(--accent);
    color: var(--accent);
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

  .banner.valid {
    background: color-mix(in srgb, var(--success) 12%, transparent);
    border-color: color-mix(in srgb, var(--success) 45%, transparent);
    color: var(--success);
  }
  .banner.valid .dot { background: var(--success); }

  .banner.error {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border-color: color-mix(in srgb, var(--danger) 45%, transparent);
    color: var(--danger);
  }
  .banner.error .dot { background: var(--danger); }

  .banner.idle {
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--muted);
  }
  .banner.idle .dot { background: var(--muted); }

  .id-display {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .mono {
    font-family: var(--mono);
    font-size: 1.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 14px 18px;
    border-radius: 12px;
    color: var(--accent);
  }

  .id-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pill {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.78rem;
    background: var(--surface-2);
    color: var(--text);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .cell {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cell-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .cell-value {
    font-size: 0.98rem;
    font-weight: 600;
  }

  .cell-hint {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .breakdown h3 {
    margin: 4px 0 12px;
    font-size: 0.9rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .digit-grid {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: 4px;
  }

  .digit-chip {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    min-width: 0;
  }

  .digit {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    text-align: center;
    padding: 6px 0;
    font-family: var(--mono);
    font-size: 0.95rem;
    font-weight: 600;
  }

  .digit-chip.first .digit {
    border-color: var(--accent);
    color: var(--accent);
  }

  .digit-chip.check .digit {
    border-color: var(--success);
    color: var(--success);
  }

  .digit-label {
    font-size: 0.62rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .digit-sub {
    font-size: 0.68rem;
    font-family: var(--mono);
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .disclaimer {
    font-size: 0.75rem;
    color: var(--muted);
    border-top: 1px dashed var(--border);
    padding-top: 12px;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .grid { grid-template-columns: 1fr; }
    .digit-grid { grid-template-columns: repeat(7, 1fr); }
  }
</style>
