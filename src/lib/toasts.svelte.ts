export type ToastKind = "info" | "success" | "neutral" | "error";

export interface Toast {
 id: string;
 message: string;
 kind: ToastKind;
 dismissable: boolean;
 ttlMs: number | null;
}

export interface ToastInit {
 message: string;
 kind: ToastKind;
 dismissable?: boolean;
 ttlMs?: number | null;
}

const DEFAULT_TTL_MS = 3000;

function createToasts() {
 const items = $state<Toast[]>([]);
 // Plain record (not reactive — timer handles are an implementation detail).
 const timers: Record<string, ReturnType<typeof setTimeout>> = Object.create(null);
 let counter = 0;

 function nextId(): string {
  counter += 1;
  return `t${Date.now().toString(36)}-${counter}`;
 }

 function scheduleDismiss(id: string, ttlMs: number) {
  cancelTimer(id);
  timers[id] = setTimeout(() => {
   dismiss(id);
  }, ttlMs);
 }

 function cancelTimer(id: string) {
  const handle = timers[id];
  if (handle !== undefined) {
   clearTimeout(handle);
   delete timers[id];
  }
 }

 function add(init: ToastInit): string {
  const id = nextId();
  const ttlMs = init.ttlMs === undefined ? DEFAULT_TTL_MS : init.ttlMs;
  const toast: Toast = {
   id,
   message: init.message,
   kind: init.kind,
   dismissable: init.dismissable ?? true,
   ttlMs,
  };
  items.push(toast);
  if (ttlMs !== null) scheduleDismiss(id, ttlMs);
  return id;
 }

 function update(id: string, patch: Partial<ToastInit>): void {
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const current = items[idx];
  const next: Toast = {
   ...current,
   message: patch.message ?? current.message,
   kind: patch.kind ?? current.kind,
   dismissable: patch.dismissable ?? current.dismissable,
   ttlMs: patch.ttlMs === undefined ? current.ttlMs : patch.ttlMs,
  };
  items[idx] = next;
  if (patch.ttlMs !== undefined) {
   cancelTimer(id);
   if (next.ttlMs !== null) scheduleDismiss(id, next.ttlMs);
  }
 }

 function dismiss(id: string): void {
  cancelTimer(id);
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return;
  items.splice(idx, 1);
 }

 function clear(): void {
  for (const id of Object.keys(timers)) cancelTimer(id);
  items.length = 0;
 }

 return {
  get items(): Toast[] {
   return items;
  },
  add,
  update,
  dismiss,
  clear,
 };
}

export const toasts = createToasts();
