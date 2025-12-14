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
    await micropip.install("jedi");
    await micropip.install(
      `/pyodide_packages/algo_visualizer_python-0.0.0-py3-none-any.whl?v=${Date.now()}`,
    );

    // Create a simple Python script wrapper for completions and hover
    pyodide.runPython(`
      import jedi
      
      def get_completions(source, line, column):
          try:
              script = jedi.Script(source, path="main.py")
              completions = script.complete(line, column)
              
              results = []
              for c in completions:
                  results.append({
                      "label": c.name,
                      "kind": c.type,
                      "detail": c.description,
                      "insertText": c.name
                  })
              return results
          except Exception as e:
              return []

      def get_hover(source, line, column):
          try:
              script = jedi.Script(source, path="main.py")
              # help() is good for docs, infer() is good for types. 
              # help() usually falls back to infer() if no docs found, but explicitly checking gives us more control.
              contexts = script.help(line, column)
              if not contexts:
                  contexts = script.infer(line, column)
              
              if not contexts:
                  return None

              c = contexts[0]
              
              # Construct a signature-like string
              # c.description usually gives "def func(a, b)" or "class Foo"
              signature = c.description
              
              # If it's a function/method, we might want to try to get a better signature with type hints if possible
              # but default description is often good enough for basics.
              
              return {
                  "code": signature,
                  "docstring": c.docstring(),
                  "type": c.type
              }
          except Exception as e:
              return None
    `);

    jediReady = true;
    ctx.postMessage({ type: "ready" });
    console.log("Python LSP (Jedi) ready");
  } catch (err) {
    console.error("Failed to init Python LSP:", err);
  }
}

initPyodide();

ctx.addEventListener("message", async (event: MessageEvent) => {
  const { id, type, code, line, column } = event.data;

  if (!pyodide || !jediReady) {
    ctx.postMessage({ id, results: type === "complete" ? [] : null });
    return;
  }

  try {
    if (type === "complete") {
      const getCompletions = pyodide.globals.get("get_completions");
      const resultsProxy = getCompletions(code, line, column);
      const results = resultsProxy.toJs({ dict_converter: Object.fromEntries });
      resultsProxy.destroy();

      ctx.postMessage({ id, results });
    } else if (type === "hover") {
      const getHover = pyodide.globals.get("get_hover");
      const resultProxy = getHover(code, line, column);
      const result = resultProxy
        ? resultProxy.toJs({ dict_converter: Object.fromEntries })
        : null;
      if (resultProxy) resultProxy.destroy();

      ctx.postMessage({ id, result });
    }
  } catch (err) {
    console.error(`LSP error (${type}):`, err);
    ctx.postMessage({
      id,
      results: type === "complete" ? [] : null,
      result: null,
    });
  }
});
