import { loadPyodide, type PyodideInterface } from "pyodide";
import { instrumentCode } from "../utils/instrumentation";

const ctx: Worker = self as any;

let pyodide: PyodideInterface | null = null;
let pyodideReady = false;

async function initPyodide() {
  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
    });

    pyodide.setStdout({
      batched: (output) => {
        ctx.postMessage({ type: "stdout", stdout: output });
      },
    });

    // Install local algo-visualizer-python package from /public/pyodide/
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install(
      "/pyodide_packages/algo_visualizer_python-0.0.0-py3-none-any.whl",
    );

    pyodideReady = true;
    ctx.postMessage({ type: "ready" });
  } catch (err: any) {
    console.error("Failed to init Pyodide:", err);
  }
}

ctx.addEventListener("message", async (event) => {
  const { type, code, breakpoints } = event.data;

  if (type === "init") {
    await initPyodide();
    return;
  }

  if (type === "run") {
    if (!pyodide || !pyodideReady) {
      console.error("Pyodide not ready.");
      return;
    }

    // 1. Reset module state for new execution
    pyodide.runPython(`
from visual.core import _visual_api_reset_state
_visual_api_reset_state()

from visual.core import *
`);

    // 2. Instrument Code and get Line Map
    // Note: We need to reconstruct the Set(breakpoints) if it was passed as valid JSON (array)
    // Since postMessage clones data, Sets might come as Sets or we might pass arrays.
    // Safest is to ensure it's a Set.
    const bps = new Set(breakpoints as number[]);

    const { instrumentedCode, lineMap } = instrumentCode(code, bps);

    // 3. Inject Line Map
    const mapJson = JSON.stringify(lineMap);

    // Use globals.set to avoid string escaping issues with direct injection
    pyodide.globals.set("_temp_linemap_json", mapJson);
    pyodide.runPython(`
_visual_api_set_linemap(_temp_linemap_json)
`);
    pyodide.globals.delete("_temp_linemap_json");

    // 4. Run Code
    try {
      await pyodide.runPythonAsync(instrumentedCode);
    } catch (err: any) {
      ctx.postMessage({
        type: "result",
        snapshots: [],
        error: err.toString(),
      });
      return;
    }

    // 5. Retrieve Snapshots
    const snapshotsJson = pyodide.runPython(`_visual_api_get_snapshots_json()`);
    const snapshots = JSON.parse(snapshotsJson);
    ctx.postMessage({
      type: "result",
      snapshots: snapshots,
    });
  }
});
