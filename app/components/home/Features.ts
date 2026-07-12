import { html, css } from "/utils/markup";
import { t } from "/utils/i18n";

const FEATURES = [
  {
    icon: "⚡",
    title: "Applied in minutes",
    body: "Describe your idea and Appliet applies it instantly — no setup, no waiting.",
  },
  {
    icon: "🔒",
    title: "Truly yours",
    body: "Your apps store data right in your browser. No accounts to wire up, no servers to manage.",
  },
  {
    icon: "✨",
    title: "No code required",
    body: "Just describe it in plain language. Appliet applies the rest.",
  },
] as const;

export default function Features() {
  const view = html`
    <section data-scope="Features">
      <div class="grid">
        ${FEATURES.map(
          (feature) => html`
            <article class="feature">
              <span class="feature-icon" aria-hidden="true">${feature.icon}</span>
              <h3 ui-heading="sm">${t(feature.title)}</h3>
              <p>${t(feature.body)}</p>
            </article>
          `,
        )}
      </div>
    </section>
  `;

  const style = css`
    @scope ([data-scope="Features"]) to ([data-scope]) {
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }

      .feature {
        padding: 1.75rem;
        border: 1px solid var(--neutral-200);
        border-radius: 1.25rem;
        background: var(--white);
        transition: border-color 0.2s ease, transform 0.2s ease;
      }

      .feature:hover {
        border-color: var(--primary-200);
        transform: translateY(-2px);
      }

      .feature-icon {
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 0.875rem;
        background: var(--primary-50);
        font-size: 1.375rem;
        margin-bottom: 1rem;
      }

      .feature p {
        margin-top: 0.5rem;
        color: var(--neutral-600);
        line-height: 1.55;
      }

      @container (max-width: 720px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    }
  `;

  return [view, style];
}
