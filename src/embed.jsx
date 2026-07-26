import { createRoot } from "react-dom/client";
import ListWidget from "./ListWidget";
import widgetStyles from "./ListWidget.css?inline";

const ELEMENT_NAME = "oi-list-widget";

class OIListWidgetElement extends HTMLElement {
  connectedCallback = () => {
    if (this._root) {
      return;
    }

    const shadowRoot = this.attachShadow({ mode: "open" });
    const styleElement = document.createElement("style");
    styleElement.textContent = widgetStyles;
    const mountNode = document.createElement("div");
    shadowRoot.append(styleElement, mountNode);

    this._root = createRoot(mountNode);
    this._root.render(
      <ListWidget dataUrl={this.getAttribute("data-url") || "/results.json"} embedded />,
    );
  };

  disconnectedCallback = () => {
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
  };
}

if (!customElements.get(ELEMENT_NAME)) {
  customElements.define(ELEMENT_NAME, OIListWidgetElement);
}

const mount = (target, options = {}) => {
  if (!(target instanceof Element)) {
    throw new Error("OIListWidget.mount(target, options) requires a DOM element target.");
  }
  const root = createRoot(target);
  root.render(<ListWidget dataUrl={options.dataUrl || "/results.json"} embedded />);
  return () => {
    root.unmount();
  };
};

window.OIListWidget = {
  mount,
};
