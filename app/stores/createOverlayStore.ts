import { signal } from "@preact/signals";

export const createOverlayOpen = signal(false);

export function openCreateOverlay(): void {
  createOverlayOpen.value = true;
}

export function closeCreateOverlay(): void {
  createOverlayOpen.value = false;
}
