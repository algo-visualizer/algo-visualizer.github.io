export const instrumentCode = (code: string, breakpoints: Set<number>) => {
  const lines = code.split("\n");
  const resultLines: string[] = [];
  const lineMap: Record<string, number> = {};

  let resultLineIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const originalLineNum = i + 1;
    const lineContent = lines[i] || "";

    // Inject breakpoint if needed
    if (breakpoints.has(originalLineNum)) {
      let indent = "";

      // Logic:
      // 1. If the current line has statements (non-whitespace), use its indentation.
      // 2. If the current line is blank, use the indentation of the first preceding non-blank line.

      if (/\S/.test(lineContent)) {
        const match = lineContent.match(/^(\s*)/);
        indent = match?.[1] ?? "";

        // If the current non-blank line is an else/elif/except/finally clause,
        // add one extra indentation level
        const trimmed = lineContent.trimStart();
        if (/^(?:else|elif|except|finally)\b/.test(trimmed)) {
          const indentUnit = /\t/.test(indent) ? "\t" : "    ";
          indent += indentUnit;
        }
      } else {
        // Search backwards
        for (let j = i - 1; j >= 0; j--) {
          const line = lines[j];
          if (line !== undefined && /\S/.test(line)) {
            const match = line.match(/^(\s*)/);
            indent = match?.[1] ?? "";

            // If the first non-blank line above ends with a colon, add one extra indentation level
            if (line.trimEnd().endsWith(":")) {
              const indentUnit = /\t/.test(indent) ? "\t" : "    ";
              indent += indentUnit;
            }
            break;
          }
        }
      }

      // Inject the internal breakpoint call (no arguments)
      // This matches the Python bootstrap definition which uses inspect.currentframe()
      resultLines.push(`${indent}_visual_api_breakpoint()`);

      // Map the injected line to the original line
      lineMap[String(resultLineIndex)] = originalLineNum;
      resultLineIndex++;
    }

    resultLines.push(lineContent);
    // Map the original line execution to original line
    // This ensures manual calls to breakpoint() are also mapped correctly
    lineMap[String(resultLineIndex)] = originalLineNum;
    resultLineIndex++;
  }

  return {
    instrumentedCode: resultLines.join("\n"),
    lineMap,
  };
};
