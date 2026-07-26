import "./App.css";
import ListWidget from "./ListWidget";
import { DEFAULT_RESULTS_URL, withBase } from "./assetUrls";

const App = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const isEmbedMode = searchParams.get("embed") === "1";
  const dataUrlParam = searchParams.get("dataUrl") || DEFAULT_RESULTS_URL;

  if (isEmbedMode) {
    return (
      <main className="app app-embedded">
        <ListWidget dataUrl={dataUrlParam} embedded />
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Lista zadań z OI</h1>
        <img src={withBase("favicon.png")} alt="Logo OI" className="header-logo" />
      </header>

      <ListWidget dataUrl={DEFAULT_RESULTS_URL} />

      <footer className="app-footer">
        <div className="footer-section support-section">
          <span className="footer-label">Wspierane przez</span>
          <a href="https://oki.org.pl/" target="_blank" rel="noreferrer" className="partner-link">
            <img src={withBase("oki-logo.png")} alt="Logo OKI" />
          </a>
        </div>

        <div className="footer-divider" />

        <div className="footer-section project-section">
          <span className="footer-label">Projekt</span>
          <a
            href="https://github.com/Opencoder-Foundation/oi-list"
            target="_blank"
            rel="noreferrer"
            className="repo-link"
          >
            <svg
              className="github-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>oi-list</span>
          </a>
        </div>

        <div className="footer-divider" />

        <div className="footer-section credits-section">
          <span className="footer-label">Twórcy</span>
          <div className="authors-list">
            <a 
              href="https://github.com/Domiko7" 
              target="_blank" 
              rel="noreferrer" 
              className="author-badge"
            >
              Dominik Stempel <span className="handle">@Domiko7</span>
            </a>
            <span className="separator">&</span>
            <a 
              href="https://github.com/tejtex" 
              target="_blank" 
              rel="noreferrer" 
              className="author-badge"
            >
              Robert Borowski <span className="handle">@tejtex</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default App;