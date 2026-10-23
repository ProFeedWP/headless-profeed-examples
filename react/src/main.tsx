import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Feed } from "./Feed";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main>
      <p className="eyebrow">Headless Profeed / React</p>
      <h1>Your company. Your feed.</h1>
      <p className="intro">
        Public LinkedIn company posts, rendered in your browser with your own
        design.
      </p>
      <Feed />
      <footer>Screenshots use authored sample posts.</footer>
      <nav className="links">
        <a href="https://headless.profeedwp.com/guides/react-linkedin-feed">
          Integration guide
        </a>
        <a href="https://headless.profeedwp.com/docs">API quickstart</a>
      </nav>
    </main>
  </StrictMode>,
);
