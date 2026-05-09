<script lang="ts">
 import {
  triggerScan,
  pollUntilScanDone,
  type ScanSummary,
 } from "$lib/api";

 type Props = {
  onComplete?: (summary: ScanSummary) => void;
 };
 let { onComplete }: Props = $props();

 let scanning = $state(false);
 let alreadyRunning = $state(false);
 let summary: ScanSummary | null = $state(null);
 let errorMsg = $state("");

 let resultTimer: ReturnType<typeof setTimeout> | null = null;

 function clearResultLater(ms = 6000) {
  if (resultTimer) clearTimeout(resultTimer);
  resultTimer = setTimeout(() => {
   summary = null;
   errorMsg = "";
   alreadyRunning = false;
  }, ms);
 }

 async function handleClick() {
  if (scanning) return;
  scanning = true;
  alreadyRunning = false;
  summary = null;
  errorMsg = "";
  if (resultTimer) {
   clearTimeout(resultTimer);
   resultTimer = null;
  }

  const triggeredAtMs = Date.now();
  try {
   const trig = await triggerScan();
   if (trig.status === "already_running") {
    alreadyRunning = true;
   }
   const result = await pollUntilScanDone(triggeredAtMs);
   if (result === null) {
    errorMsg = "Scan timed out";
   } else {
    summary = result;
    onComplete?.(result);
   }
  } catch (e) {
   errorMsg = e instanceof Error ? e.message : "Scan failed";
  } finally {
   scanning = false;
   clearResultLater();
  }
 }

 function buttonText(): string {
  if (scanning && alreadyRunning) return "Already scanning…";
  if (scanning) return "Scanning…";
  if (summary) {
   const { added, updated, removed } = summary;
   if (added === 0 && updated === 0 && removed === 0) return "No changes";
   const parts: string[] = [];
   if (added) parts.push(`${added} added`);
   if (updated) parts.push(`${updated} updated`);
   if (removed) parts.push(`${removed} removed`);
   return `Done — ${parts.join(", ")}`;
  }
  return "Scan now";
 }
</script>

<span class="scan-now">
 <button
  type="button"
  class="scan-btn"
  onclick={handleClick}
  disabled={scanning}
  title="Trigger an immediate scan of all documentation sources"
 >
  {buttonText()}
 </button>
 {#if errorMsg}
  <span class="scan-error" role="alert">{errorMsg}</span>
 {/if}
</span>

<style>
 .scan-now {
  display: inline-flex;
  align-items: center;
  gap: 10px;
 }

 .scan-btn {
  font-size: 16px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border: 2px solid var(--border-strong);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s;
  min-width: 110px;
  white-space: nowrap;
 }

 .scan-btn:hover:not(:disabled) {
  background: var(--bg-hover);
 }

 .scan-btn:disabled {
  opacity: 0.5;
  cursor: default;
 }

 .scan-error {
  font-size: 14px;
  color: var(--error);
 }
</style>
