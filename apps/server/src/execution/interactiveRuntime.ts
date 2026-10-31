import type { Judge0ExecutableLanguageId } from "./languagePolicy.js";

export const AWAITING_INPUT_MARKER = "__DIFFLANE_AWAITING_INPUT__";

export interface InteractiveHook {
  sourceCode: string;
  extraFiles: { path: string; content: string }[];
  compilerOptions?: string;
  renames: Record<string, string>;
}

const PYTHON_LAUNCHER = (userFile: string, displayName: string) => `import builtins, os, runpy, sys, traceback

_MARKER = ${JSON.stringify(AWAITING_INPUT_MARKER)}

def _await_input():
    try:
        sys.stdout.flush()
    except Exception:
        pass
    sys.stderr.write(_MARKER)
    sys.stderr.flush()
    os._exit(0)

class _InteractiveStdin:
    def __init__(self, inner):
        self._inner = inner

    def readline(self, *args):
        line = self._inner.readline(*args)
        if line == "":
            _await_input()
        return line

    def read(self, size=-1):
        data = self._inner.read(size)
        if data == "" and size != 0:
            _await_input()
        return data

    def readlines(self, *args):
        lines = self._inner.readlines(*args)
        if not lines:
            _await_input()
        return lines

    def __iter__(self):
        return self

    def __next__(self):
        return self.readline()

    def __getattr__(self, name):
        return getattr(self._inner, name)

sys.stdin = _InteractiveStdin(sys.stdin)
_user_path = os.path.abspath(${JSON.stringify(userFile)})
sys.argv[0] = ${JSON.stringify(displayName)}
try:
    runpy.run_path(_user_path, run_name="__main__")
except SystemExit:
    raise
except BaseException as error:
    tb = error.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename != _user_path:
        tb = tb.tb_next
    traceback.print_exception(type(error), error, tb)
    sys.exit(1)
`;

const NODE_HOOK = `"use strict";
const MARKER = ${JSON.stringify(AWAITING_INPUT_MARKER)};
const readline = require("readline");
let awaiting = false;
function awaitInput() {
  if (awaiting) return;
  awaiting = true;
  process.stderr.write(MARKER, () => process.exit(0));
}
let pendingQuestions = 0;
function trackQuestion(original) {
  return function (...args) {
    pendingQuestions += 1;
    const last = args[args.length - 1];
    if (typeof last === "function") {
      args[args.length - 1] = (...answer) => {
        pendingQuestions -= 1;
        return last(...answer);
      };
      return original.apply(this, args);
    }
    const result = original.apply(this, args);
    if (result && typeof result.then === "function") {
      return result.then((value) => {
        pendingQuestions -= 1;
        return value;
      });
    }
    return result;
  };
}
function watchInterface(rl) {
  let userCloseListeners = 0;
  const originalOn = rl.on.bind(rl);
  rl.on = rl.addListener = function (event, listener) {
    if (event === "close") userCloseListeners += 1;
    return originalOn(event, listener);
  };
  originalOn("close", () => {
    setImmediate(() => {
      const waitingForLines = rl.listenerCount("line") > 0 && userCloseListeners === 0;
      if (pendingQuestions > 0 || waitingForLines) awaitInput();
    });
  });
  return rl;
}
readline.Interface.prototype.question = trackQuestion(readline.Interface.prototype.question);
const originalCreate = readline.createInterface;
readline.createInterface = function (...args) {
  return watchInterface(originalCreate.apply(this, args));
};
try {
  const promises = require("readline/promises");
  promises.Interface.prototype.question = trackQuestion(promises.Interface.prototype.question);
  const originalPromisesCreate = promises.createInterface;
  promises.createInterface = function (...args) {
    return watchInterface(originalPromisesCreate.apply(this, args));
  };
} catch (error) {}
`;

const C_HOOK = `#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <unistd.h>

static int difflane_blocked_reading(pid_t pid) {
  char path[64];
  char buffer[512];
  snprintf(path, sizeof path, "/proc/%d/stat", (int)pid);
  int fd = open(path, O_RDONLY);
  if (fd < 0) return 0;
  ssize_t count = read(fd, buffer, sizeof buffer - 1);
  close(fd);
  if (count <= 0) return 0;
  buffer[count] = 0;
  char *end = strrchr(buffer, ')');
  if (!end || end[1] != ' ' || end[2] != 'S') return 0;
  snprintf(path, sizeof path, "/proc/%d/wchan", (int)pid);
  fd = open(path, O_RDONLY);
  if (fd >= 0) {
    count = read(fd, buffer, sizeof buffer - 1);
    close(fd);
    if (count > 0) {
      buffer[count] = 0;
      if (strcmp(buffer, "0") != 0 && !strstr(buffer, "pipe")) return 0;
    }
  }
  return 1;
}

__attribute__((constructor)) static void difflane_interactive_stdin(void) {
  int fds[2];
  if (pipe(fds) != 0) return;
  pid_t parent = getpid();
  pid_t child = fork();
  if (child < 0) {
    close(fds[0]);
    close(fds[1]);
    return;
  }
  if (child == 0) {
    char buffer[4096];
    ssize_t count;
    while ((count = read(0, buffer, sizeof buffer)) > 0) {
      ssize_t offset = 0;
      while (offset < count) {
        ssize_t written = write(fds[1], buffer + offset, (size_t)(count - offset));
        if (written <= 0) _exit(0);
        offset += written;
      }
    }
    int stable = 0;
    for (;;) {
      if (getppid() != parent) _exit(0);
      int pending = 0;
      if (ioctl(fds[0], FIONREAD, &pending) != 0) pending = 0;
      if (pending == 0 && difflane_blocked_reading(parent)) {
        if (++stable >= 4) {
          static const char marker[] = ${JSON.stringify(AWAITING_INPUT_MARKER)};
          ssize_t ignored = write(2, marker, sizeof marker - 1);
          (void)ignored;
          kill(parent, SIGKILL);
          _exit(0);
        }
      } else {
        stable = 0;
      }
      usleep(15000);
    }
  }
  dup2(fds[0], 0);
  close(fds[0]);
  close(fds[1]);
  setvbuf(stdout, NULL, _IONBF, 0);
}
`;

const JAVA_LAUNCHER = (qualifiedUserClass: string) => `import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

public class Main {
  private static final class InteractiveStdin extends FilterInputStream {
    InteractiveStdin(InputStream in) {
      super(in);
    }

    private void awaitInput() {
      System.out.flush();
      System.err.print(${JSON.stringify(AWAITING_INPUT_MARKER)});
      System.err.flush();
      Runtime.getRuntime().halt(0);
    }

    @Override
    public int read() throws IOException {
      int value = super.read();
      if (value < 0) awaitInput();
      return value;
    }

    @Override
    public int read(byte[] buffer, int offset, int length) throws IOException {
      int count = super.read(buffer, offset, length);
      if (count < 0) awaitInput();
      return count;
    }
  }

  public static void main(String[] args) throws Throwable {
    System.setIn(new InteractiveStdin(new FileInputStream(FileDescriptor.in)));
    ${qualifiedUserClass}.main(args);
  }
}
`;

const JAVA_RENAMED_MAIN = "DifflaneUserMain";

export function renameJavaMainClass(source: string): string {
  let result = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      result += source.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      result += source.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === '"' || char === "'") {
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== char) {
        cursor += source[cursor] === "\\" ? 2 : 1;
      }
      result += source.slice(index, cursor + 1);
      index = cursor + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      let cursor = index;
      while (cursor < source.length && /[A-Za-z0-9_$]/.test(source[cursor])) cursor += 1;
      const word = source.slice(index, cursor);
      result += word === "Main" ? JAVA_RENAMED_MAIN : word;
      index = cursor;
      continue;
    }
    result += char;
    index += 1;
  }
  return result;
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

const JAVA_PACKAGE = /^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m;

export function buildInteractiveHook(
  languageId: Judge0ExecutableLanguageId,
  entryFileName: string,
  entryContent: string,
  judge0SourceFileName: string,
): InteractiveHook {
  switch (languageId) {
    case "c":
    case "cpp": {
      const hookFile = languageId === "c" ? "__difflane_stdin.c" : "__difflane_stdin.cpp";
      return {
        sourceCode: `#line 1 ${JSON.stringify(entryFileName)}\n${entryContent}`,
        extraFiles: [{ path: hookFile, content: C_HOOK }],
        compilerOptions: hookFile,
        renames: {},
      };
    }
    case "python": {
      const userFile = entryFileName === judge0SourceFileName ? `__difflane_user_${entryFileName}` : entryFileName;
      return {
        sourceCode: PYTHON_LAUNCHER(userFile, entryFileName),
        extraFiles: [{ path: userFile, content: entryContent }],
        renames: userFile === entryFileName ? {} : { [userFile]: entryFileName },
      };
    }
    case "javascript":
    case "typescript": {
      const extension = languageId === "javascript" ? ".js" : ".ts";
      const userFile = entryFileName === judge0SourceFileName ? `__difflane_user_${entryFileName}` : entryFileName;
      const userModule = `./${stripExtension(userFile)}`;
      const hookModule = "./__difflane_stdin";
      const sourceCode =
        languageId === "javascript"
          ? `require(${JSON.stringify(`${hookModule}.js`)});\nrequire(${JSON.stringify(`${userModule}.js`)});\n`
          : `import ${JSON.stringify(hookModule)};\nimport ${JSON.stringify(userModule)};\n`;
      const hookContent =
        languageId === "javascript"
          ? NODE_HOOK
          : `// @ts-nocheck\nexport {};\ndeclare const require: any;\ndeclare const process: any;\ndeclare const setImmediate: any;\n${NODE_HOOK}`;
      return {
        sourceCode,
        extraFiles: [
          { path: `__difflane_stdin${extension}`, content: hookContent },
          { path: userFile, content: entryContent },
        ],
        renames: userFile === entryFileName ? {} : { [userFile]: entryFileName },
      };
    }
    case "java": {
      const className = stripExtension(entryFileName);
      const packageName = JAVA_PACKAGE.exec(entryContent)?.[1];
      if (!packageName && className === "Main") {
        return {
          sourceCode: JAVA_LAUNCHER(JAVA_RENAMED_MAIN),
          extraFiles: [{ path: `${JAVA_RENAMED_MAIN}.java`, content: renameJavaMainClass(entryContent) }],
          renames: { [`${JAVA_RENAMED_MAIN}.java`]: entryFileName, [JAVA_RENAMED_MAIN]: "Main" },
        };
      }
      const qualifiedName = packageName ? `${packageName}.${className}` : className;
      const filePath = packageName ? `${packageName.replace(/\./g, "/")}/${className}.java` : `${className}.java`;
      return {
        sourceCode: JAVA_LAUNCHER(qualifiedName),
        extraFiles: [{ path: filePath, content: entryContent }],
        renames: {},
      };
    }
  }
}

export function hasAwaitingInputMarker(stderr: string): boolean {
  return stderr.includes(AWAITING_INPUT_MARKER);
}

export function stripAwaitingInputMarker(stderr: string): string {
  return stderr
    .split(AWAITING_INPUT_MARKER)
    .join("")
    .replace(/^.*\bline \d+:\s+\d+ Killed\b.*\n?/gm, "");
}
