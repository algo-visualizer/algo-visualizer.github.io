import * as monaco from "monaco-editor";

export { monaco };

export type Monaco = typeof monaco;

export type MonacoEditor = ReturnType<typeof monaco.editor.create>;
