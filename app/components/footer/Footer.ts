import { html, css } from "/utils/markup";
import { t } from "/utils/i18n";
import { socialLinks } from "/app/stores/configStore";

export default function Footer() {
  const view = html`
    <footer data-scope="Footer" ui-container="lg" ui-margin="top-4xl">
      <p class="tagline">${t("Every idea deserves its own app.")}</p>
      <div class="links">
        <a href=${socialLinks.twitter} target="_blank" rel="noopener noreferrer">X</a>
        <a href=${socialLinks.bluesky} target="_blank" rel="noopener noreferrer">Bluesky</a>
      </div>
      <p class="copyright">© ${new Date().getFullYear()} Appliet</p>
    </footer>
  `;

  const style = css`
    @scope ([data-scope="Footer"]) to ([data-scope]) {
      & {
        padding-block: 3rem 4rem;
        color: var(--neutral-500);
        font-size: 0.875rem;
      }

      .tagline {
        font-size: 1rem;
        color: var(--neutral-700);
        margin-bottom: 1rem;
      }

      .links {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .links a {
        color: inherit;
      }
    }
  `;

  return [view, style];
}
