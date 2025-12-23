import { loadPyodide, type PyodideInterface } from "pyodide";

// Define the worker context
const ctx: Worker = self as any;

let pyodide: PyodideInterface | null = null;
let jediReady = false;

// Initialize Pyodide and Jedi
async function initPyodide() {
  try {
    // Load Pyodide (using the same version as the main app)
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
    });

    // Install Jedi
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install(
      `/pyodide_packages/algo_visualizer_python-0.0.0-py3-none-any.whl?v=${Date.now()}`,
    );
    await micropip.install(
      `/pyodide_packages/python_lsp-0.0.0-py3-none-any.whl`,
    );

    // Create a simple Python script wrapper for completions and hover
    pyodide.runPython(`
from lsp import *
    `);

    jediReady = true;
    ctx.postMessage({ type: "ready" });
    console.log("Python LSP (Jedi) ready");
  } catch (err) {
    console.error("Failed to init Python LSP:", err);
  }
}

initPyodide();

const lspMap: Record<string, string> = {
  complete: "get_completions",
  hover: "get_hover",
  signature: "get_signature_help",
};

ctx.addEventListener("message", async (event: MessageEvent) => {
  const { id, type, code, line, column } = event.data;

  if (!pyodide || !jediReady) {
    ctx.postMessage({ id, result: type === "complete" ? [] : null });
    return;
  }

  try {
    const func = lspMap[type];
    if (func) {
      pyodide.globals.set("_temp_code", code);
      pyodide.globals.set("_temp_line", line);
      pyodide.globals.set("_temp_column", column);
      const resultProxy = pyodide.runPython(
        `${func}(_temp_code, _temp_line, _temp_column)`,
      );
      try {
        pyodide.globals.delete("_temp_code");
        pyodide.globals.delete("_temp_line");
        pyodide.globals.delete("_temp_column");
        const result = resultProxy
          ? resultProxy.toJs({ dict_converter: Object.fromEntries })
          : type === "complete"
            ? []
            : null;
        ctx.postMessage({ id, result });
      } finally {
        if (resultProxy) resultProxy.destroy();
      }
    }
  } catch (err) {
    console.error(`LSP error (${type}):`, err);
    ctx.postMessage({
      id,
      result: type === "complete" ? [] : null,
    });
  }
});
