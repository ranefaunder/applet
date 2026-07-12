import { html, css } from "/utils/markup";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";

export default function ClosingCta() {
  const lang = getLang(typeof window !== "undefined" ? window.location.pathname : "/en/") ?? "en";

  function focusPrompt(e: Event) {
    e.preventDefault();
    const input = document.getElementById("app-prompt");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => (input as HTMLTextAreaElement | null)?.focus(), 400);
  }

  const view = html`
    <section data-scope="ClosingCta">
      <div class="card">
        <span class="badge" aria-hidden="true">
          <span class="faunder-logo-font">A</span>
        </span>
        <h2 ui-heading="xxl" class="title">${t("What will you apply?")}</h2>
        <p class="subtitle">${t("Describe your idea and watch Appliet apply it in minutes.")}</p>
        <div class="actions">
          <a href="/${lang}/" ui-button="primary" onClick=${focusPrompt}>
            ${t("Apply It")}
          </a>
          <a href="/${lang}/apps" ui-button="secondary">
            ${t("My applets")}
          </a>
        </div>
      </div>
    </section>
  `;

  const style = css`
    @scope ([data-scope="ClosingCta"]) to ([data-scope]) {
      .card {
        position: relative;
        text-align: center;
        padding: 4rem 1.5rem;
        border-radius: 1.75rem;
        border: 1px solid var(--neutral-200);
        background:
          radial-gradient(60% 80% at 50% 0%, oklch(from var(--primary-100) l c h / 70%), transparent 70%),
          var(--white);
        overflow: hidden;
      }

      .badge {
        display: grid;
        place-items: center;
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto 1.5rem;
        border-radius: 1rem;
        background: linear-gradient(145deg, var(--primary-500), var(--primary-700));
        box-shadow: 0 8px 20px -8px oklch(from var(--primary-900) l c h / 50%);
      }

      .badge span {
        font-size: 1.75rem;
        line-height: 1;
        color: var(--white);
      }

      .title {
        margin-bottom: 0.75rem;
      }

      .subtitle {
        font-size: 1.125rem;
        color: var(--neutral-600);
        text-wrap: balance;
        max-width: 32rem;
        margin: 0 auto 2rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
      }
    }
  `;

  return [view, style];
}
