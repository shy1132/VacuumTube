//custom CSS styles

const { ipcRenderer } = require("electron");
const configManager = require("../config");

let config = configManager.get();
let injectedStyles = new Set();

function injectCSS(filename, css) {
  const styleId = `userstyle-${filename.replace(/[^a-zA-Z0-9]/g, "-")}`;

  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.type = "text/css";
  style.textContent = css;
  document.head.appendChild(style);

  injectedStyles.add(filename);
  console.log(`[Userstyles] Injected: ${filename}`);
}

function removeCSS(filename) {
  const styleId = `userstyle-${filename.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const style = document.getElementById(styleId);
  if (style) {
    style.remove();
    injectedStyles.delete(filename);
    console.log(`[Userstyles] Removed: ${filename}`);
  }
}

async function loadUserstyles() {
  if (!config.userstyles) {
    console.log("[Userstyles] Disabled in config");
    return;
  }

  try {
    const styles = await ipcRenderer.invoke("get-userstyles");

    injectedStyles.forEach((filename) => removeCSS(filename));

    styles.forEach(({ filename, css }) => {
      injectCSS(filename, css);
    });

    console.log(`[Userstyles] Loaded ${styles.length} stylesheets`);
  } catch (error) {
    console.error("[Userstyles] Failed to load styles:", error);
  }
}

module.exports = async () => {
  console.log("[Userstyles] Initializing...");

  await loadUserstyles();

  ipcRenderer.on("config-update", (event, newConfig) => {
    const wasEnabled = config.userstyles;
    config = newConfig;

    if (config.userstyles && !wasEnabled) {
      loadUserstyles();
    } else if (!config.userstyles && wasEnabled) {
      injectedStyles.forEach((filename) => removeCSS(filename));
    }
  });

  ipcRenderer.on("userstyle-updated", (event, { filename, css }) => {
    if (config.userstyles) {
      injectCSS(filename, css);
    }
  });

  ipcRenderer.on("userstyle-removed", (event, { filename }) => {
    removeCSS(filename);
  });

  console.log("[Userstyles] Initialized");
};
