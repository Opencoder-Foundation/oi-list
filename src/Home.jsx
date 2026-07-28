import "./Home.css";
import ListWidget from "./ListWidget";
import { PROBLEMS_URL, withBase } from "./assetUrls";
import Footer from "./Footer";

const Home = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const isEmbedMode = searchParams.get("embed") === "1";
  const dataUrlParam = searchParams.get("dataUrl") || PROBLEMS_URL;

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
        <div className="header-title">
          <h1>Lista zadań z OI</h1>
          <img
            src={withBase("favicon.png")}
            alt="Logo OI"
            className="header-logo"
          />
        </div>
      </header>

      <ListWidget dataUrl={PROBLEMS_URL} />

      <Footer />
    </main>
  );
};

export default Home;