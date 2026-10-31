import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExecutionResultPayload } from "@difflane/shared-types";
import type { InputAnswer } from "../../execution/interactiveSession";
import type { ShellEntry, ShellFileSystem } from "../shellFileSystem";
import { VirtualShell, type ShellRunRequest } from "../virtualShell";

class MemoryFileSystem implements ShellFileSystem {
  private readonly items = new Map<string, ShellEntry>();
  private readonly contents = new Map<string, string>();
  private nextId = 1;

  entries(): ShellEntry[] {
    return [...this.items.values()];
  }
  readFile(id: string): string {
    return this.contents.get(id) ?? "";
  }
  writeFile(id: string, content: string): void {
    this.contents.set(id, content);
  }
  createFile(parentId: string | null, name: string): ShellEntry {
    const entry: ShellEntry = { id: `e${this.nextId++}`, parentId, name, type: "file" };
    this.items.set(entry.id, entry);
    this.contents.set(entry.id, "");
    return entry;
  }
  createFolder(parentId: string | null, name: string): ShellEntry {
    const entry: ShellEntry = { id: `e${this.nextId++}`, parentId, name, type: "folder" };
    this.items.set(entry.id, entry);
    return entry;
  }
  move(id: string, parentId: string | null, name: string): void {
    const entry = this.items.get(id)!;
    this.items.set(id, { ...entry, parentId, name });
  }
  remove(id: string): void {
    for (const child of this.entries().filter((entry) => entry.parentId === id)) {
      this.remove(child.id);
    }
    this.items.delete(id);
    this.contents.delete(id);
  }
  seed(path: string, content?: string): ShellEntry {
    const parts = path.split("/");
    let parentId: string | null = null;
    for (const [position, name] of parts.entries()) {
      const isFile = position === parts.length - 1 && content !== undefined;
      const existing = this.entries().find((entry) => entry.parentId === parentId && entry.name === name);
      const entry: ShellEntry = existing ?? (isFile ? this.createFile(parentId, name) : this.createFolder(parentId, name));
      if (isFile) this.writeFile(entry.id, content);
      parentId = entry.id;
    }
    return this.items.get(parentId!)!;
  }
  find(path: string): ShellEntry | undefined {
    let parentId: string | null = null;
    let found: ShellEntry | undefined;
    for (const name of path.split("/")) {
      found = this.entries().find((entry) => entry.parentId === parentId && entry.name === name);
      if (!found) return undefined;
      parentId = found.id;
    }
    return found;
  }
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");

function setup(runner?: { run: (request: ShellRunRequest, signal: AbortSignal) => Promise<ExecutionResultPayload> }) {
  const fs = new MemoryFileSystem();
  fs.seed("README.md", "# Demo\nhello world\n");
  fs.seed("src/main.py", "from util import add\nprint(add(1, 2))\n");
  fs.seed("src/util.py", "def add(a, b):\n    return a + b\n");
  fs.seed("src/lib");
  const shell = new VirtualShell({ fs, runner, userName: "nik" });
  const exec = async (line: string) => {
    let output = "";
    const status = await shell.execute(line, { write: (text) => (output += text) });
    return { status, output: stripAnsi(output) };
  };
  return { fs, shell, exec };
}

test("pwd, cd and ls navigate the workspace tree", async () => {
  const { exec } = setup();
  assert.equal((await exec("pwd")).output, "/\n");
  assert.equal((await exec("ls")).output, "README.md  src/\n");
  await exec("cd src");
  assert.equal((await exec("pwd")).output, "/src\n");
  assert.equal((await exec("ls -1")).output, "lib/\nmain.py\nutil.py\n");
  await exec("cd lib");
  await exec("cd -");
  assert.equal((await exec("pwd")).output, "/src\n");
  await exec("cd ~");
  assert.equal((await exec("pwd")).output, "/\n");
  const missing = await exec("cd nope");
  assert.equal(missing.status, 1);
  assert.match(missing.output, /No such file or directory/);
});

test("cat, head, tail, wc and grep read workspace files", async () => {
  const { exec } = setup();
  assert.equal((await exec("cat README.md")).output, "# Demo\nhello world\n");
  assert.equal((await exec("head -n 1 README.md")).output, "# Demo\n");
  assert.equal((await exec("tail -1 README.md")).output, "hello world\n");
  assert.equal((await exec("wc -l README.md")).output, "      2 README.md\n");
  assert.equal((await exec("grep -n hello README.md")).output, "2:hello world\n");
  assert.equal((await exec("grep -r add src")).output, "src/main.py:from util import add\nsrc/main.py:print(add(1, 2))\nsrc/util.py:def add(a, b):\n");
  assert.equal((await exec("grep missing README.md")).status, 1);
});

test("pipes and redirects create and edit files", async () => {
  const { exec, fs } = setup();
  await exec('echo "first line" > notes.txt');
  await exec("echo second >> notes.txt");
  assert.equal(fs.readFile(fs.find("notes.txt")!.id), "first line\nsecond\n");
  assert.equal((await exec("cat notes.txt | grep sec | wc -l")).output, "      1\n");
  await exec("cat README.md | head -n 1 > src/lib/title.txt");
  assert.equal(fs.readFile(fs.find("src/lib/title.txt")!.id), "# Demo\n");
});

test("mkdir, touch, cp, mv and rm change the tree", async () => {
  const { exec, fs } = setup();
  assert.equal((await exec("mkdir -p a/b/c && touch a/b/c/x.txt")).status, 0);
  assert.ok(fs.find("a/b/c/x.txt"));
  await exec("cp src/util.py a/");
  assert.equal(fs.readFile(fs.find("a/util.py")!.id), fs.readFile(fs.find("src/util.py")!.id));
  await exec("mv a/util.py a/helpers.py");
  assert.ok(fs.find("a/helpers.py"));
  assert.equal(fs.find("a/util.py"), undefined);
  await exec("cp -r a a2");
  assert.ok(fs.find("a2/b/c/x.txt"));
  assert.match((await exec("rm a")).output, /Is a directory/);
  await exec("rm -r a a2");
  assert.equal(fs.find("a"), undefined);
  assert.match((await exec("rm -rf /")).output, /refusing/);
  assert.match((await exec("mv src src/lib")).output, /into itself/);
});

test("globs, find and tree", async () => {
  const { exec } = setup();
  assert.equal((await exec("ls src/*.py")).output, "src/main.py\nsrc/util.py\n");
  assert.equal((await exec("find . -name '*.py'")).output, "./src/main.py\n./src/util.py\n");
  assert.equal((await exec("find src -type d")).output, "src\nsrc/lib\n");
  assert.match((await exec("tree")).output, /2 directories, 3 files/);
});

test("operators, quoting and syntax errors", async () => {
  const { exec } = setup();
  assert.equal((await exec("cd nope || echo fallback")).output.endsWith("fallback\n"), true);
  assert.equal((await exec("cd nope && echo never")).output.includes("never"), false);
  assert.equal((await exec("echo 'a | b' ; echo c")).output, "a | b\nc\n");
  assert.match((await exec('echo "unterminated')).output, /unterminated double quote/);
  assert.equal((await exec("frobnicate")).status, 127);
  assert.match((await exec("cat")).output, /missing file operand/);
});

test("tab completion completes commands and paths", () => {
  const { shell } = setup();
  assert.equal(shell.complete("gre").line, "grep ");
  assert.equal(shell.complete("cat REA").line, "cat README.md ");
  assert.equal(shell.complete("cd s").line, "cd src/");
  const ambiguous = shell.complete("cat src/");
  assert.deepEqual(ambiguous.suggestions, ["src/lib/", "src/main.py", "src/util.py"]);
});

test("run sends the file path, language and piped stdin to the runner", async () => {
  const calls: ShellRunRequest[] = [];
  const { exec } = setup({
    run: async (request) => {
      calls.push(request);
      return {
        executionId: "x", workspaceCode: "ABC", snapshotId: "x", languageId: request.languageId, entryPath: request.entryPath,
        status: "success", exitCode: 0, createdAt: "", startedAt: null, completedAt: null, durationMs: null, requestedBy: null,
        stdout: "3\n", stderr: "", compileOutput: null, message: null, truncated: false, cpuTimeSeconds: 0.02, memoryKb: 1000,
      };
    },
  });
  const result = await exec("echo 5 | python src/main.py");
  assert.equal(result.status, 0);
  assert.deepEqual(calls, [{ entryPath: "src/main.py", languageId: "python", stdin: "5\n" }]);
  assert.match(result.output, /▶ Running src\/main.py \(Python\)/);
  assert.match(result.output, /^3$/m);
  assert.match((await exec("run README.md")).output, /can't run/);
});

function fakeInteractiveRunner(calls: ShellRunRequest[]) {
  return {
    run: async (request: ShellRunRequest): Promise<ExecutionResultPayload> => {
      calls.push(request);
      const lines = (request.stdin ?? "").split("\n").filter(Boolean);
      let stdout = "Name: ";
      if (lines.length >= 1) stdout += "Age: ";
      if (lines.length >= 2) stdout += `Hi ${lines[0]}, ${lines[1]}\n`;
      const awaiting = Boolean(request.interactive) && lines.length < 2;
      return {
        executionId: `run-${calls.length}`, workspaceCode: "ABC", snapshotId: "x", languageId: request.languageId, entryPath: request.entryPath,
        status: awaiting ? "awaiting_input" : "success", exitCode: awaiting ? null : 0, createdAt: "", startedAt: null, completedAt: null,
        durationMs: null, requestedBy: null, stdout, stderr: "", compileOutput: null, message: null, truncated: false, cpuTimeSeconds: null, memoryKb: null,
      };
    },
  };
}

test("run asks for each input when the program needs it, like a console", async () => {
  const calls: ShellRunRequest[] = [];
  const fs = new MemoryFileSystem();
  fs.seed("main.py", "name = input('Name: ')\n");
  const answers: InputAnswer[] = [{ kind: "line", text: "Nikhil" }, { kind: "line", text: "21" }];
  const shell = new VirtualShell({ fs, runner: fakeInteractiveRunner(calls), readProgramInput: async () => answers.shift()! });
  let output = "";
  const status = await shell.execute("run main.py", { write: (text) => (output += text) });

  assert.equal(status, 0);
  assert.deepEqual(
    calls.map((call) => [call.stdin, call.interactive, call.continuationOf]),
    [
      [undefined, true, undefined],
      ["Nikhil\n", true, "run-1"],
      ["Nikhil\n21\n", true, "run-2"],
    ],
  );
  assert.equal(stripAnsi(output).match(/Name: /g)?.length, 1);
  assert.match(stripAnsi(output), /Hi Nikhil, 21/);
});

test("piped input runs once without prompting; Ctrl+C cancels a waiting program", async () => {
  const calls: ShellRunRequest[] = [];
  const fs = new MemoryFileSystem();
  fs.seed("main.py", "input()\n");
  let prompted = 0;
  const shell = new VirtualShell({
    fs,
    runner: fakeInteractiveRunner(calls),
    readProgramInput: async () => {
      prompted += 1;
      return { kind: "cancel" };
    },
  });
  const sink = { write: () => undefined };

  await shell.execute("echo Nikhil | run main.py", sink);
  assert.equal(calls.at(-1)?.stdin, "Nikhil\n");
  assert.equal(calls.at(-1)?.interactive, undefined);
  assert.equal(prompted, 0);

  assert.notEqual(await shell.execute("run main.py", sink), 0);
  assert.equal(prompted, 1);
});
