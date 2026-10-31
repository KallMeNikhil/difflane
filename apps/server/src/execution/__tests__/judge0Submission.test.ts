import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareJudge0Submission } from "../judge0Submission.js";
import { resolveJudge0LanguageIds } from "../languagePolicy.js";
import { crc32, createZipArchive } from "../zipArchive.js";

function listZipEntries(base64: string): Map<string, string> {
  const buffer = Buffer.from(base64, "base64");
  const entries = new Map<string, string>();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf-8");
    const dataStart = offset + 30 + nameLength;
    entries.set(name, buffer.subarray(dataStart, dataStart + size).toString("utf-8"));
    offset = dataStart + size;
  }
  return entries;
}

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("zip archive ends with an end-of-central-directory record listing every entry", () => {
  const zip = createZipArchive([
    { path: "a.txt", content: "A" },
    { path: "dir/b.txt", content: "Bé" },
  ]);
  const eocd = zip.subarray(zip.length - 22);
  assert.equal(eocd.readUInt32LE(0), 0x06054b50);
  assert.equal(eocd.readUInt16LE(10), 2);
  const entries = listZipEntries(zip.toString("base64"));
  assert.equal(entries.get("dir/b.txt"), "Bé");
});

test("sends the entry as source and only files under the entry's folder as additional files", () => {
  const prepared = prepareJudge0Submission("python", "app/main.py", [
    { path: "app/main.py", content: "import helpers" },
    { path: "app/helpers.py", content: "X = 1" },
    { path: "app/pkg/mod.py", content: "Y = 2" },
    { path: "other/skip.py", content: "Z = 3" },
  ]);
  assert.equal(prepared.sourceCode, "import helpers");
  const entries = listZipEntries(prepared.additionalFilesBase64!);
  assert.deepEqual([...entries.keys()].sort(), ["helpers.py", "pkg/mod.py"]);
});

test("omits additional files entirely for a single-file program", () => {
  const prepared = prepareJudge0Submission("cpp", "main.cpp", [{ path: "main.cpp", content: "int main(){}" }]);
  assert.equal(prepared.additionalFilesBase64, undefined);
});

test("never ships a file that would overwrite Judge0's own source file name", () => {
  const prepared = prepareJudge0Submission("python", "run.py", [
    { path: "run.py", content: "print(1)" },
    { path: "script.py", content: "print(2)" },
  ]);
  assert.equal(prepared.additionalFilesBase64, undefined);
});

test("wraps a Java entry whose class is not Main so it compiles as Main.java", () => {
  const prepared = prepareJudge0Submission("java", "src/HelloWorld.java", [
    { path: "src/HelloWorld.java", content: "public class HelloWorld { public static void main(String[] a) {} }" },
  ]);
  assert.match(prepared.sourceCode, /public class Main/);
  assert.match(prepared.sourceCode, /HelloWorld\.main\(args\)/);
  const entries = listZipEntries(prepared.additionalFilesBase64!);
  assert.ok(entries.has("HelloWorld.java"));
});

test("places a packaged Java entry under its package folder and calls it by qualified name", () => {
  const prepared = prepareJudge0Submission("java", "App.java", [
    { path: "App.java", content: "package com.demo;\npublic class App { public static void main(String[] a) {} }" },
  ]);
  assert.match(prepared.sourceCode, /com\.demo\.App\.main\(args\)/);
  assert.ok(listZipEntries(prepared.additionalFilesBase64!).has("com/demo/App.java"));
});

test("leaves a Java entry already named Main untouched", () => {
  const source = "public class Main { public static void main(String[] a) {} }";
  const prepared = prepareJudge0Submission("java", "Main.java", [{ path: "Main.java", content: source }]);
  assert.equal(prepared.sourceCode, source);
});

test("diagnostics name the workspace file instead of Judge0's sandbox file", () => {
  const python = prepareJudge0Submission("python", "app/main.py", [{ path: "app/main.py", content: "" }]);
  assert.equal(
    python.rewriteDiagnostics('  File "/box/script.py", line 2, in <module>\n  File "/box/helpers.py", line 1'),
    '  File "main.py", line 2, in <module>\n  File "helpers.py", line 1',
  );
  const c = prepareJudge0Submission("c", "prog.c", [{ path: "prog.c", content: "" }]);
  assert.equal(c.rewriteDiagnostics("main.c:3:19: error: expected ';'"), "prog.c:3:19: error: expected ';'");
  assert.equal(c.rewriteDiagnostics("see domain.c:1"), "see domain.c:1");
});

test("picks the newest runtime per language and falls back to legacy ids", () => {
  const ids = resolveJudge0LanguageIds([
    { id: 71, name: "Python (3.8.1)" },
    { id: 113, name: "Python (3.14.0)" },
    { id: 70, name: "Python (2.7.17)" },
    { id: 109, name: "Python (3.13.2)" },
    { id: 102, name: "JavaScript (Node.js 22.08.0)" },
    { id: 63, name: "JavaScript (Node.js 12.14.0)" },
    { id: 91, name: "Java (JDK 17.0.6)" },
    { id: 96, name: "JavaFX (JDK 17.0.6, OpenJFX 22.0.2)" },
  ]);
  assert.equal(ids.python, 113);
  assert.equal(ids.javascript, 102);
  assert.equal(ids.java, 91);
  assert.equal(ids.c, 50);
  assert.equal(ids.typescript, 74);
});
