import { html, css } from "/utils/markup";
import { t } from "/utils/i18n";

const QUESTIONS = [
  {
    q: "What is Appliet?",
    a: "Appliet lets you apply your ideas as small personal apps. Describe what you need and Appliet builds a working app that runs in your browser and keeps your data on your device.",
  },
  {
    q: "What kind of apps can I build?",
    a: "Anything small and personal: trackers, journals, calculators, checklists, simple games, or quick one-off tools that make your life easier.",
  },
  {
    q: "Where is my data stored?",
    a: "Each app saves its data locally in your browser. Nothing is sent to a server, so your notes and entries stay private to you.",
  },
] as const;

export default function Faq() {
  const view = html`
    <section data-scope="Faq">
      <h2 ui-heading="lg" class="title">${t("Frequently asked questions")}</h2>
      <div class="list">
        ${QUESTIONS.map(
          (item) => html`
            <details class="item">
              <summary>
                <span>${t(item.q)}</span>
                <span class="chevron" aria-hidden="true"></span>
              </summary>
              <p>${t(item.a)}</p>
            </details>
          `,
        )}
      </div>
    </section>
  `;

  const style = css`
    @scope ([data-scope="Faq"]) to ([data-scope]) {
      .title {
        text-align: center;
        margin-bottom: 2rem;
      }

      .list {
        max-width: 42rem;
        margin-inline: auto;
        display: grid;
        gap: 0.75rem;
      }

      .item {
        border: 1px solid var(--neutral-200);
        border-radius: 1rem;
        background: var(--white);
        overflow: hidden;
      }

      .item[open] {
        border-color: var(--primary-200);
      }

      summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.125rem 1.25rem;
        font-weight: 500;
        cursor: pointer;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      .chevron {
        width: 0.625rem;
        height: 0.625rem;
        border-right: 2px solid var(--neutral-400);
        border-bottom: 2px solid var(--neutral-400);
        transform: rotate(45deg);
        transition: transform 0.2s ease;
        flex-shrink: 0;
      }

      .item[open] .chevron {
        transform: rotate(-135deg);
      }

      .item p {
        padding: 0 1.25rem 1.25rem;
        color: var(--neutral-600);
        line-height: 1.6;
      }
    }
  `;

  return [view, style];
}
