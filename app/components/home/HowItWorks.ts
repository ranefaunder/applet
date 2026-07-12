import { html, css } from "/utils/markup";
import { t } from "/utils/i18n";

const STEPS = [
  {
    title: "Describe your idea",
    body: "Tell Appliet what you need — a packing list, budget tracker, or anything else.",
  },
  {
    title: "Apply it",
    body: "Appliet applies your idea into a working app you can use right away.",
  },
  {
    title: "Edit anytime",
    body: "Improve your app with prompts whenever you want.",
  },
];

export default function HowItWorks() {
  const view = html`
    <section data-scope="HowItWorks">
      <div class="head">
        <h2 ui-heading="lg">${t("Make every idea an app")}</h2>
        <p class="lead">${t("Describe it, apply it — right where you work.")}</p>
      </div>
      <ol class="steps">
        ${STEPS.map((step, index) => html`
          <li class="step">
            <span class="step-number">${index + 1}</span>
            <h3 ui-heading="sm">${t(step.title as Parameters<typeof t>[0])}</h3>
            <p>${t(step.body as Parameters<typeof t>[0])}</p>
          </li>
        `)}
      </ol>
    </section>
  `;

  const style = css`
    @scope ([data-scope="HowItWorks"]) to ([data-scope]) {
      .head {
        text-align: center;
        max-width: 36rem;
        margin: 0 auto 2.5rem;
      }

      .lead {
        margin-top: 0.75rem;
        font-size: 1.125rem;
        color: var(--neutral-600);
        text-wrap: balance;
      }

      .steps {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        counter-reset: step;
      }

      .step {
        padding: 1.75rem;
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        background: var(--white);
      }

      .step-number {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 999px;
        background: linear-gradient(145deg, var(--primary-500), var(--primary-700));
        color: var(--white);
        font-weight: 600;
        font-size: 0.9375rem;
        margin-bottom: 1rem;
      }

      .step p {
        color: var(--neutral-600);
        margin-top: 0.375rem;
        line-height: 1.55;
      }

      @container (max-width: 720px) {
        .steps {
          grid-template-columns: 1fr;
        }
      }
    }
  `;

  return [view, style];
}
