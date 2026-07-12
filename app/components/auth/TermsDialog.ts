import { html, css } from "/utils/markup";
import { useRef, useEffect } from "preact/hooks";
import { t } from "/utils/i18n";

export default function TermsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function handler() {
      dialogRef.current?.showModal();
    }
    window.addEventListener("open-terms-dialog", handler);
    return () => window.removeEventListener("open-terms-dialog", handler);
  }, []);

  const view = html`
    <dialog id="terms-dialog" ref=${dialogRef} ui-dialog="md" closedby="any">
      <header ui-row="x-between">
        <h2>Terms of use</h2>
        <button ui-button="square inline" ui-icon="x" onClick=${() => dialogRef.current?.close()} aria-label="Close"></button>
      </header>
      <div class="terms-body">
        <p>${t("Appliet is a platform for creating personal applets. By using the service you accept these terms.")}</p>
        <p>Use the service for personal, non-abusive purposes. We may update features as the product evolves.</p>
      </div>
    </dialog>
  `;

  const style = css`
    @scope ([data-scope="TermsDialog"]) to ([data-scope]) {
      .terms-body {
        display: grid;
        gap: 1rem;
        line-height: 1.6;
        color: var(--neutral-700);
      }
    }
  `;

  return [view, style];
}
