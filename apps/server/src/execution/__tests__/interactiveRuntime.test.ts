import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AWAITING_INPUT_MARKER,
  buildInteractiveHook,
  hasAwaitingInputMarker,
  renameJavaMainClass,
  stripAwaitingInputMarker,
} from "../interactiveRuntime.js";
import { prepareJudge0Submission } from "../judge0Submission.js";

test("C/C++ keep the user's source with a #line directive and link the hook unit", () => {
  const hook = buildInteractiveHook("cpp", "test.cpp", "int main(){}", "main.cpp");
  assert.equal(hook.sourceCode, '#line 1 "test.cpp"\nint main(){}');
  assert.equal(hook.compilerOptions, "__difflane_stdin.cpp");
  assert.match(hook.extraFiles[0].content, /__attribute__\(\(constructor\)\)/);
});

test("Python, JavaScript and TypeScript run the user's file through a launcher", () => {
  const python = buildInteractiveHook("python", "app.py", "print(1)", "script.py");
  assert.match(python.sourceCode, /runpy\.run_path/);
  assert.deepEqual(python.extraFiles, [{ path: "app.py", content: "print(1)" }]);

  const javascript = buildInteractiveHook("javascript", "index.js", "console.log(1)", "script.js");
  assert.match(javascript.sourceCode, /require\("\.\/index\.js"\)/);

  const typescript = buildInteractiveHook("typescript", "main.ts", "let a = 1;", "script.ts");
  assert.match(typescript.sourceCode, /import "\.\/main";/);
  assert.match(typescript.extraFiles[0].content, /export \{\};/);
});

test("a user file named like Judge0's own source is renamed and mapped back in diagnostics", () => {
  const hook = buildInteractiveHook("python", "script.py", "x", "script.py");
  assert.equal(hook.extraFiles[0].path, "__difflane_user_script.py");
  assert.deepEqual(hook.renames, { "__difflane_user_script.py": "script.py" });
});

test("Java wraps System.in in a launcher; a user class named Main is renamed", () => {
  const other = buildInteractiveHook("java", "test.java", "public class test {}", "Main.java");
  assert.match(other.sourceCode, /test\.main\(args\)/);
  assert.equal(other.extraFiles[0].path, "test.java");

  const main = buildInteractiveHook("java", "Main.java", 'public class Main { String s = "Main"; } // Main', "Main.java");
  assert.match(main.sourceCode, /DifflaneUserMain\.main\(args\)/);
  assert.equal(main.extraFiles[0].content, 'public class DifflaneUserMain { String s = "Main"; } // Main');
});

test("renaming Main leaves strings, chars, comments and longer identifiers alone", () => {
  assert.equal(
    renameJavaMainClass("class Main { MainHelper h; /* Main */ char c = 'M'; String t = \"Main\"; Main m = new Main(); }"),
    "class DifflaneUserMain { MainHelper h; /* Main */ char c = 'M'; String t = \"Main\"; DifflaneUserMain m = new DifflaneUserMain(); }",
  );
});

test("the awaiting-input marker and the shell's Killed notice are stripped", () => {
  const stderr = `warning\nrun.sh: line 1:     3 Killed                  ./a.out\n${AWAITING_INPUT_MARKER}`;
  assert.equal(hasAwaitingInputMarker(stderr), true);
  assert.equal(stripAwaitingInputMarker(stderr), "warning\n");
  assert.equal(hasAwaitingInputMarker("plain error"), false);
});

test("interactive submissions carry the hook files and compiler options", () => {
  const prepared = prepareJudge0Submission("c", "src/prog.c", [{ path: "src/prog.c", content: "int main(){}" }], { interactive: true });
  assert.equal(prepared.compilerOptions, "__difflane_stdin.c");
  assert.ok(prepared.additionalFilesBase64);
  const batch = prepareJudge0Submission("c", "src/prog.c", [{ path: "src/prog.c", content: "int main(){}" }]);
  assert.equal(batch.compilerOptions, undefined);
  assert.equal(batch.sourceCode, "int main(){}");
});
