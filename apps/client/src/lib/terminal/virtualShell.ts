import {
  detectLanguageForPath,
  findExecutionLanguageForMonacoId,
  type ExecutionLanguageId,
  type ExecutionResultPayload,
} from "@difflane/shared-types";
import { runInteractiveSession, type InputAnswer } from "../execution/interactiveSession";
import { normalizePath, ShellPathIndex, type ShellEntry, type ShellFileSystem } from "./shellFileSystem";
import { parseShellLine, ShellSyntaxError, type ShellCommand, type ShellWord } from "./shellParser";

export const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

export interface ShellRunRequest {
  entryPath: string;
  languageId: ExecutionLanguageId;
  stdin?: string;
  interactive?: boolean;
  continuationOf?: string;
}

export interface ShellRunner {
  run(request: ShellRunRequest, signal: AbortSignal): Promise<ExecutionResultPayload>;
}

export interface ShellHost {
  fs: ShellFileSystem;
  runner?: ShellRunner;
  userName?: string;
  openFile?: (fileId: string) => void;
  clearScreen?: () => void;
  readProgramInput?: (signal: AbortSignal) => Promise<InputAnswer>;
}

export interface ShellOutput {
  write(text: string): void;
}

interface CommandContext {
  args: string[];
  stdin: string | null;
  out: (text: string) => void;
  err: (text: string) => void;
  signal: AbortSignal;
}

type CommandHandler = (ctx: CommandContext) => number | Promise<number>;

interface CommandSpec {
  summary: string;
  handler: CommandHandler;
}

const RUN_ALIASES = ["python", "python3", "node", "ts-node", "java", "gcc", "g++", "cc", "c++", "clang", "clang++"];

class CommandFailure extends Error {}

function splitFlags(args: string[], allowed: string, valueFlags = ""): { flags: Set<string>; values: Map<string, string>; operands: string[] } {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const operands: string[] = [];
  let endOfFlags = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (endOfFlags || !arg.startsWith("-") || arg === "-") {
      operands.push(arg);
      continue;
    }
    if (arg === "--") {
      endOfFlags = true;
      continue;
    }
    for (let position = 1; position < arg.length; position += 1) {
      const flag = arg[position];
      if (valueFlags.includes(flag)) {
        const inline = arg.slice(position + 1);
        const value = inline || args[index + 1];
        if (value === undefined) {
          throw new CommandFailure(`option requires an argument -- '${flag}'`);
        }
        if (!inline) {
          index += 1;
        }
        values.set(flag, value);
        break;
      }
      if (!allowed.includes(flag)) {
        throw new CommandFailure(`invalid option -- '${flag}'`);
      }
      flags.add(flag);
    }
  }
  return { flags, values, operands };
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function formatLines(text: string): string[] {
  if (!text) {
    return [];
  }
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function ensureTrailingNewline(text: string): string {
  return text && !text.endsWith("\n") ? `${text}\n` : text;
}

export class VirtualShell {
  private cwdId: string | null = null;
  private previousCwdId: string | null = null;
  private readonly history: string[] = [];
  private readonly commands: Record<string, CommandSpec>;

  constructor(private readonly host: ShellHost) {
    this.commands = this.buildCommands();
  }

  get commandNames(): string[] {
    return Object.keys(this.commands).sort();
  }

  get historyEntries(): readonly string[] {
    return this.history;
  }

  private index(): ShellPathIndex {
    return new ShellPathIndex(this.host.fs.entries());
  }

  private cwdSegments(index: ShellPathIndex): string[] {
    if (this.cwdId && !index.get(this.cwdId)) {
      this.cwdId = null;
    }
    return index.segmentsOf(this.cwdId);
  }

  prompt(): string {
    const index = this.index();
    const path = `/${this.cwdSegments(index).join("/")}`;
    return `${ANSI.green}${this.host.userName ?? "you"}@difflane${ANSI.reset}:${ANSI.blue}${path}${ANSI.reset}$ `;
  }

  async execute(line: string, output: ShellOutput, signal: AbortSignal = new AbortController().signal): Promise<number> {
    const trimmed = line.trim();
    if (!trimmed) {
      return 0;
    }
    if (this.history[this.history.length - 1] !== trimmed) {
      this.history.push(trimmed);
      if (this.history.length > 200) {
        this.history.shift();
      }
    }

    let list;
    try {
      list = parseShellLine(trimmed);
    } catch (error) {
      output.write(`${ANSI.red}shell: ${error instanceof ShellSyntaxError ? error.message : "could not parse command"}${ANSI.reset}\n`);
      return 2;
    }

    let status = 0;
    for (const item of list) {
      if (signal.aborted) {
        return 130;
      }
      if ((item.connector === "&&" && status !== 0) || (item.connector === "||" && status === 0)) {
        continue;
      }
      status = await this.runPipeline(item.pipeline, output, signal);
    }
    return status;
  }

  private async runPipeline(pipeline: ShellCommand[], output: ShellOutput, signal: AbortSignal): Promise<number> {
    let stdin: string | null = null;
    let status = 0;
    for (let position = 0; position < pipeline.length; position += 1) {
      const command = pipeline[position];
      const isLast = position === pipeline.length - 1;
      let buffer = "";
      const err = (text: string) => output.write(`${ANSI.red}${ensureTrailingNewline(text)}${ANSI.reset}`);
      try {
        const index = this.index();
        const args = this.expandWords(command.words, index);
        const name = args.shift()!;
        if (command.stdinPath) {
          stdin = this.readFileAt(command.stdinPath, index, name);
        }
        const redirectToFile = Boolean(command.stdoutPath);
        const out = isLast && !redirectToFile ? (text: string) => output.write(text) : (text: string) => {
          buffer += text;
        };
        const spec = this.commands[name];
        if (!spec) {
          err(`${name}: command not found. Type "help" to see available commands.`);
          status = 127;
        } else {
          status = await spec.handler({ args, stdin, out, err, signal });
        }
        if (command.stdoutPath) {
          this.writeFileAt(command.stdoutPath.path, buffer, command.stdoutPath.append, name);
          buffer = "";
        }
      } catch (error) {
        err(error instanceof CommandFailure ? error.message : `shell: ${error instanceof Error ? error.message : "command failed"}`);
        status = 1;
      }
      stdin = buffer;
      if (signal.aborted) {
        return 130;
      }
    }
    return status;
  }

  private expandWords(words: ShellWord[], index: ShellPathIndex): string[] {
    const result: string[] = [];
    for (const word of words) {
      if (!word.glob) {
        result.push(word.text);
        continue;
      }
      const slash = word.text.lastIndexOf("/");
      const dirPart = slash === -1 ? "" : word.text.slice(0, slash + 1);
      const pattern = globToRegExp(word.text.slice(slash + 1));
      const dir = index.resolveSegments(normalizePath(this.cwdSegments(index), dirPart || "."));
      const parentId = dir.kind === "root" ? null : dir.kind === "entry" && dir.entry.type === "folder" ? dir.entry.id : undefined;
      const matches = parentId === undefined ? [] : index.children(parentId).filter((entry) => pattern.test(entry.name));
      if (matches.length === 0) {
        result.push(word.text);
      } else {
        result.push(...matches.map((entry) => `${dirPart}${entry.name}`));
      }
    }
    if (result.length === 0) {
      throw new CommandFailure("shell: empty command");
    }
    return result;
  }

  private resolve(path: string, index: ShellPathIndex) {
    return index.resolveSegments(normalizePath(this.cwdSegments(index), path));
  }

  private requireEntry(path: string, index: ShellPathIndex, command: string): ShellEntry | null {
    const resolved = this.resolve(path, index);
    if (resolved.kind === "root") {
      return null;
    }
    if (resolved.kind === "missing") {
      throw new CommandFailure(`${command}: ${path}: No such file or directory`);
    }
    return resolved.entry;
  }

  private requireFile(path: string, index: ShellPathIndex, command: string): ShellEntry {
    const entry = this.requireEntry(path, index, command);
    if (!entry || entry.type === "folder") {
      throw new CommandFailure(`${command}: ${path}: Is a directory`);
    }
    return entry;
  }

  private readFileAt(path: string, index: ShellPathIndex, command: string): string {
    return this.host.fs.readFile(this.requireFile(path, index, command).id);
  }

  private writeFileAt(path: string, content: string, append: boolean, command: string): void {
    const index = this.index();
    const resolved = this.resolve(path, index);
    if (resolved.kind === "root" || (resolved.kind === "entry" && resolved.entry.type === "folder")) {
      throw new CommandFailure(`${command}: ${path}: Is a directory`);
    }
    if (resolved.kind === "entry") {
      const previous = append ? this.host.fs.readFile(resolved.entry.id) : "";
      this.host.fs.writeFile(resolved.entry.id, previous + content);
      return;
    }
    if (resolved.parentId === undefined) {
      throw new CommandFailure(`${command}: ${path}: No such file or directory`);
    }
    const created = this.host.fs.createFile(resolved.parentId, resolved.name);
    this.host.fs.writeFile(created.id, content);
  }

  private readInputs(ctx: CommandContext, operands: string[], command: string): { label: string; text: string }[] {
    if (operands.length === 0 || (operands.length === 1 && operands[0] === "-")) {
      if (ctx.stdin === null) {
        throw new CommandFailure(`${command}: missing file operand (there is no keyboard input in this shell; pipe text in or name a file)`);
      }
      return [{ label: "(standard input)", text: ctx.stdin }];
    }
    const index = this.index();
    return operands.map((path) => ({ label: path, text: this.readFileAt(path, index, command) }));
  }

  complete(line: string): { line: string; suggestions: string[] } {
    const match = /(\S*)$/.exec(line);
    const partial = match ? match[1] : "";
    const before = line.slice(0, line.length - partial.length);
    const completions: string[] = [];

    if (!before.trim() || /(\||&&|;)\s*$/.test(before)) {
      completions.push(...this.commandNames.filter((name) => name.startsWith(partial)).map((name) => `${name} `));
    } else {
      const index = this.index();
      const slash = partial.lastIndexOf("/");
      const dirPart = slash === -1 ? "" : partial.slice(0, slash + 1);
      const namePart = partial.slice(slash + 1);
      const dir = this.resolve(dirPart || ".", index);
      const parentId = dir.kind === "root" ? null : dir.kind === "entry" && dir.entry.type === "folder" ? dir.entry.id : undefined;
      if (parentId !== undefined) {
        for (const entry of index.children(parentId)) {
          if (entry.name.startsWith(namePart)) {
            completions.push(`${dirPart}${entry.name}${entry.type === "folder" ? "/" : " "}`);
          }
        }
      }
    }

    if (completions.length === 0) {
      return { line, suggestions: [] };
    }
    if (completions.length === 1) {
      return { line: before + completions[0], suggestions: [] };
    }
    let common = completions[0];
    for (const candidate of completions) {
      while (!candidate.startsWith(common)) {
        common = common.slice(0, -1);
      }
    }
    return { line: before + common.trimEnd(), suggestions: completions.map((value) => value.trimEnd()) };
  }

  private listing(entry: ShellEntry, long: boolean): string {
    const name = entry.type === "folder" ? `${ANSI.blue}${ANSI.bold}${entry.name}/${ANSI.reset}` : entry.name;
    if (!long) {
      return name;
    }
    const size = entry.type === "file" ? String(this.host.fs.readFile(entry.id).length) : "-";
    return `${entry.type === "folder" ? "d" : "-"}  ${size.padStart(8)}  ${name}`;
  }

  private buildCommands(): Record<string, CommandSpec> {
    const fs = this.host.fs;

    const commands: Record<string, CommandSpec> = {
      help: {
        summary: "List the available commands",
        handler: ({ out }) => {
          out(`${ANSI.bold}Difflane workspace shell${ANSI.reset} — commands act on the shared workspace files.\n\n`);
          for (const name of this.commandNames) {
            out(`  ${ANSI.cyan}${name.padEnd(8)}${ANSI.reset} ${this.commands[name].summary}\n`);
          }
          out(`\nAlso: pipes (|), redirects (> >> <), && || ;, globs (*.py), Tab completion, ↑/↓ history, Ctrl+C.\n`);
          out(`Run code with ${ANSI.cyan}run <file>${ANSI.reset} (or python/node/java/gcc <file>).\n`);
          return 0;
        },
      },
      pwd: {
        summary: "Print the current directory",
        handler: ({ out }) => {
          const index = this.index();
          out(`/${this.cwdSegments(index).join("/")}\n`);
          return 0;
        },
      },
      cd: {
        summary: "Change directory (cd, cd .., cd -, cd /path)",
        handler: ({ args }) => {
          const target = args[0] ?? "/";
          if (target === "-") {
            [this.cwdId, this.previousCwdId] = [this.previousCwdId, this.cwdId];
            return 0;
          }
          const index = this.index();
          const resolved = this.resolve(target, index);
          if (resolved.kind === "missing") {
            throw new CommandFailure(`cd: ${target}: No such file or directory`);
          }
          if (resolved.kind === "entry" && resolved.entry.type !== "folder") {
            throw new CommandFailure(`cd: ${target}: Not a directory`);
          }
          this.previousCwdId = this.cwdId;
          this.cwdId = resolved.kind === "root" ? null : resolved.entry.id;
          return 0;
        },
      },
      ls: {
        summary: "List directory contents (-a, -l, -1)",
        handler: ({ args, out, err }) => {
          const { flags, operands } = splitFlags(args, "al1");
          const long = flags.has("l");
          const onePerLine = long || flags.has("1");
          const index = this.index();
          const targets = operands.length > 0 ? operands : ["."];
          let status = 0;
          targets.forEach((target, position) => {
            const resolved = this.resolve(target, index);
            if (resolved.kind === "missing") {
              err(`ls: cannot access '${target}': No such file or directory`);
              status = 2;
              return;
            }
            if (resolved.kind === "entry" && resolved.entry.type === "file") {
              out(`${this.listing({ ...resolved.entry, name: target }, long)}\n`);
              return;
            }
            const parentId = resolved.kind === "root" ? null : resolved.entry.id;
            if (targets.length > 1) {
              out(`${position > 0 ? "\n" : ""}${target}:\n`);
            }
            const children = index.children(parentId).filter((entry) => flags.has("a") || !entry.name.startsWith("."));
            if (children.length === 0) {
              return;
            }
            const rendered = children.map((entry) => this.listing(entry, long));
            out(onePerLine ? `${rendered.join("\n")}\n` : `${rendered.join("  ")}\n`);
          });
          return status;
        },
      },
      tree: {
        summary: "Show the folder tree",
        handler: ({ args, out }) => {
          const index = this.index();
          const target = args[0] ?? ".";
          const resolved = this.resolve(target, index);
          if (resolved.kind === "missing" || (resolved.kind === "entry" && resolved.entry.type !== "folder")) {
            throw new CommandFailure(`tree: ${target}: Not a directory`);
          }
          const rootId = resolved.kind === "root" ? null : resolved.entry.id;
          let folders = 0;
          let files = 0;
          const walk = (parentId: string | null, prefix: string) => {
            const children = index.children(parentId);
            children.forEach((entry, position) => {
              const last = position === children.length - 1;
              out(`${prefix}${last ? "└── " : "├── "}${this.listing(entry, false)}\n`);
              if (entry.type === "folder") {
                folders += 1;
                walk(entry.id, `${prefix}${last ? "    " : "│   "}`);
              } else {
                files += 1;
              }
            });
          };
          out(`${ANSI.blue}${target}${ANSI.reset}\n`);
          walk(rootId, "");
          out(`\n${folders} director${folders === 1 ? "y" : "ies"}, ${files} file${files === 1 ? "" : "s"}\n`);
          return 0;
        },
      },
      cat: {
        summary: "Print file contents (-n numbers lines)",
        handler: (ctx) => {
          const { flags, operands } = splitFlags(ctx.args, "n");
          for (const input of this.readInputs(ctx, operands, "cat")) {
            if (flags.has("n")) {
              formatLines(input.text).forEach((line, position) => ctx.out(`${String(position + 1).padStart(6)}  ${line}\n`));
            } else {
              ctx.out(input.text);
            }
          }
          return 0;
        },
      },
      head: {
        summary: "First lines of a file (-n N)",
        handler: (ctx) => this.headTail(ctx, "head"),
      },
      tail: {
        summary: "Last lines of a file (-n N)",
        handler: (ctx) => this.headTail(ctx, "tail"),
      },
      wc: {
        summary: "Count lines, words and characters (-l -w -c)",
        handler: (ctx) => {
          const { flags, operands } = splitFlags(ctx.args, "lwc");
          const all = flags.size === 0;
          for (const input of this.readInputs(ctx, operands, "wc")) {
            const parts: string[] = [];
            if (all || flags.has("l")) parts.push(String((input.text.match(/\n/g) ?? []).length).padStart(7));
            if (all || flags.has("w")) parts.push(String(input.text.split(/\s+/).filter(Boolean).length).padStart(7));
            if (all || flags.has("c")) parts.push(String(new TextEncoder().encode(input.text).length).padStart(7));
            ctx.out(`${parts.join(" ")}${operands.length > 0 ? ` ${input.label}` : ""}\n`);
          }
          return 0;
        },
      },
      grep: {
        summary: "Search text (-i -n -v -c -r)",
        handler: (ctx) => {
          const { flags, operands } = splitFlags(ctx.args, "invcrRE");
          const [pattern, ...paths] = operands;
          if (pattern === undefined) {
            throw new CommandFailure("grep: missing search pattern");
          }
          let regex: RegExp;
          try {
            regex = new RegExp(pattern, flags.has("i") ? "i" : "");
          } catch {
            regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags.has("i") ? "i" : "");
          }
          const recursive = flags.has("r") || flags.has("R");
          let inputs: { label: string; text: string }[];
          if (recursive) {
            const index = this.index();
            inputs = [];
            for (const target of paths.length > 0 ? paths : ["."]) {
              const resolved = this.resolve(target, index);
              if (resolved.kind === "missing") {
                throw new CommandFailure(`grep: ${target}: No such file or directory`);
              }
              if (resolved.kind === "entry" && resolved.entry.type === "file") {
                inputs.push({ label: target, text: fs.readFile(resolved.entry.id) });
                continue;
              }
              const folderId = resolved.kind === "root" ? null : resolved.entry.id;
              const base = index.segmentsOf(folderId).length;
              const descendants = folderId === null ? index.children(null).flatMap((entry) => [entry, ...index.descendants(entry.id)]) : index.descendants(folderId);
              for (const entry of descendants) {
                if (entry.type === "file") {
                  const relative = index.segmentsOf(entry.id).slice(base).join("/");
                  inputs.push({ label: target === "." ? relative : `${target.replace(/\/$/, "")}/${relative}`, text: fs.readFile(entry.id) });
                }
              }
            }
          } else {
            inputs = this.readInputs(ctx, paths, "grep");
          }
          const showLabel = recursive || inputs.length > 1;
          let matched = false;
          for (const input of inputs) {
            let count = 0;
            formatLines(input.text).forEach((line, position) => {
              if (regex.test(line) === flags.has("v")) {
                return;
              }
              count += 1;
              matched = true;
              if (flags.has("c")) {
                return;
              }
              const label = showLabel ? `${ANSI.cyan}${input.label}${ANSI.reset}:` : "";
              const lineNumber = flags.has("n") ? `${ANSI.green}${position + 1}${ANSI.reset}:` : "";
              ctx.out(`${label}${lineNumber}${line}\n`);
            });
            if (flags.has("c")) {
              ctx.out(`${showLabel ? `${input.label}:` : ""}${count}\n`);
            }
          }
          return matched ? 0 : 1;
        },
      },
      sort: {
        summary: "Sort lines (-r reverse, -n numeric, -u unique)",
        handler: (ctx) => {
          const { flags, operands } = splitFlags(ctx.args, "rnu");
          let lines = this.readInputs(ctx, operands, "sort").flatMap((input) => formatLines(input.text));
          lines.sort(flags.has("n") ? (a, b) => Number.parseFloat(a) - Number.parseFloat(b) : (a, b) => a.localeCompare(b));
          if (flags.has("r")) lines.reverse();
          if (flags.has("u")) lines = lines.filter((line, position) => line !== lines[position - 1]);
          ctx.out(lines.map((line) => `${line}\n`).join(""));
          return 0;
        },
      },
      uniq: {
        summary: "Drop repeated adjacent lines",
        handler: (ctx) => {
          const lines = this.readInputs(ctx, splitFlags(ctx.args, "").operands, "uniq").flatMap((input) => formatLines(input.text));
          ctx.out(lines.filter((line, position) => line !== lines[position - 1]).map((line) => `${line}\n`).join(""));
          return 0;
        },
      },
      echo: {
        summary: "Print text (-n: no trailing newline)",
        handler: ({ args, out }) => {
          const noNewline = args[0] === "-n";
          out(`${(noNewline ? args.slice(1) : args).join(" ")}${noNewline ? "" : "\n"}`);
          return 0;
        },
      },
      touch: {
        summary: "Create empty files",
        handler: ({ args }) => {
          const { operands } = splitFlags(args, "");
          if (operands.length === 0) throw new CommandFailure("touch: missing file operand");
          for (const path of operands) {
            const resolved = this.resolve(path, this.index());
            if (resolved.kind === "missing") {
              if (resolved.parentId === undefined) throw new CommandFailure(`touch: cannot touch '${path}': No such file or directory`);
              fs.createFile(resolved.parentId, resolved.name);
            }
          }
          return 0;
        },
      },
      mkdir: {
        summary: "Create folders (-p creates parents)",
        handler: ({ args }) => {
          const { flags, operands } = splitFlags(args, "p");
          if (operands.length === 0) throw new CommandFailure("mkdir: missing operand");
          for (const path of operands) {
            const segments = normalizePath(this.cwdSegments(this.index()), path);
            let parentId: string | null = null;
            for (let position = 0; position < segments.length; position += 1) {
              const index = this.index();
              const existing = index.child(parentId, segments[position]);
              const isLast = position === segments.length - 1;
              if (existing) {
                if (existing.type !== "folder") throw new CommandFailure(`mkdir: ${path}: Not a directory`);
                if (isLast && !flags.has("p")) throw new CommandFailure(`mkdir: cannot create directory '${path}': File exists`);
                parentId = existing.id;
                continue;
              }
              if (!isLast && !flags.has("p")) throw new CommandFailure(`mkdir: cannot create directory '${path}': No such file or directory`);
              parentId = fs.createFolder(parentId, segments[position]).id;
            }
          }
          return 0;
        },
      },
      rm: {
        summary: "Remove files (-r folders, -f ignore missing)",
        handler: ({ args }) => {
          const { flags, operands } = splitFlags(args, "rRfdv");
          const recursive = flags.has("r") || flags.has("R");
          if (operands.length === 0) throw new CommandFailure("rm: missing operand");
          for (const path of operands) {
            const index = this.index();
            const resolved = this.resolve(path, index);
            if (resolved.kind === "root") throw new CommandFailure("rm: refusing to remove the workspace root");
            if (resolved.kind === "missing") {
              if (flags.has("f")) continue;
              throw new CommandFailure(`rm: cannot remove '${path}': No such file or directory`);
            }
            if (resolved.entry.type === "folder" && !recursive) throw new CommandFailure(`rm: cannot remove '${path}': Is a directory (use rm -r)`);
            fs.remove(resolved.entry.id);
          }
          return 0;
        },
      },
      rmdir: {
        summary: "Remove empty folders",
        handler: ({ args }) => {
          for (const path of args) {
            const index = this.index();
            const entry = this.requireEntry(path, index, "rmdir");
            if (!entry) throw new CommandFailure("rmdir: refusing to remove the workspace root");
            if (entry.type !== "folder") throw new CommandFailure(`rmdir: ${path}: Not a directory`);
            if (index.children(entry.id).length > 0) throw new CommandFailure(`rmdir: ${path}: Directory not empty`);
            fs.remove(entry.id);
          }
          return 0;
        },
      },
      mv: {
        summary: "Move or rename files and folders",
        handler: ({ args }) => {
          const { operands } = splitFlags(args, "fiv");
          if (operands.length < 2) throw new CommandFailure("mv: missing destination operand");
          const destination = operands.pop()!;
          for (const source of operands) {
            const index = this.index();
            const entry = this.requireEntry(source, index, "mv");
            if (!entry) throw new CommandFailure("mv: cannot move the workspace root");
            const target = this.placementFor(destination, entry, operands.length > 1, index, "mv");
            if (target.parentId !== null && (target.parentId === entry.id || index.descendants(entry.id).some((child) => child.id === target.parentId))) {
              throw new CommandFailure(`mv: cannot move '${source}' into itself`);
            }
            if (target.replaceId === entry.id) continue;
            if (target.replaceId) fs.remove(target.replaceId);
            fs.move(entry.id, target.parentId, target.name);
          }
          return 0;
        },
      },
      cp: {
        summary: "Copy files (-r for folders)",
        handler: ({ args }) => {
          const { flags, operands } = splitFlags(args, "rRfv");
          if (operands.length < 2) throw new CommandFailure("cp: missing destination operand");
          const destination = operands.pop()!;
          for (const source of operands) {
            const index = this.index();
            const entry = this.requireEntry(source, index, "cp");
            if (!entry) throw new CommandFailure("cp: cannot copy the workspace root");
            if (entry.type === "folder" && !flags.has("r") && !flags.has("R")) throw new CommandFailure(`cp: -r not specified; omitting directory '${source}'`);
            const target = this.placementFor(destination, entry, operands.length > 1, index, "cp");
            if (entry.type === "folder" && target.parentId !== null && index.descendants(entry.id).some((child) => child.id === target.parentId)) {
              throw new CommandFailure(`cp: cannot copy '${source}' into itself`);
            }
            if (target.replaceId) {
              if (entry.type === "file") {
                fs.writeFile(target.replaceId, fs.readFile(entry.id));
                continue;
              }
              throw new CommandFailure(`cp: '${destination}' already exists`);
            }
            this.copyEntry(entry, target.parentId, target.name, index);
          }
          return 0;
        },
      },
      find: {
        summary: "Find files (find [dir] -name '*.py' -type f)",
        handler: ({ args, out }) => {
          const start = args[0] && !args[0].startsWith("-") ? args[0] : ".";
          const rest = start === args[0] ? args.slice(1) : args;
          let namePattern: RegExp | null = null;
          let type: "f" | "d" | null = null;
          for (let position = 0; position < rest.length; position += 1) {
            const flag = rest[position];
            const value = rest[position + 1];
            if ((flag === "-name" || flag === "-iname") && value) {
              namePattern = new RegExp(globToRegExp(value).source, flag === "-iname" ? "i" : "");
              position += 1;
            } else if (flag === "-type" && (value === "f" || value === "d")) {
              type = value;
              position += 1;
            } else {
              throw new CommandFailure(`find: unsupported expression '${flag}'`);
            }
          }
          const index = this.index();
          const resolved = this.resolve(start, index);
          if (resolved.kind === "missing") throw new CommandFailure(`find: '${start}': No such file or directory`);
          const prefix = start.replace(/\/$/, "");
          const rootId = resolved.kind === "root" ? null : resolved.entry.id;
          const base = index.segmentsOf(rootId).length;
          const matchesFilter = (entry: ShellEntry | null, name: string) =>
            (!type || (type === "d" ? !entry || entry.type === "folder" : entry?.type === "file")) && (!namePattern || namePattern.test(name));
          if (matchesFilter(resolved.kind === "entry" ? resolved.entry : null, resolved.kind === "entry" ? resolved.entry.name : start)) {
            out(`${prefix || "."}\n`);
          }
          if (resolved.kind === "entry" && resolved.entry.type === "file") return 0;
          const descendants = rootId === null ? index.children(null).flatMap((entry) => [entry, ...index.descendants(entry.id)]) : index.descendants(rootId);
          const lines = descendants
            .filter((entry) => matchesFilter(entry, entry.name))
            .map((entry) => `${prefix || "."}/${index.segmentsOf(entry.id).slice(base).join("/")}`)
            .sort();
          out(lines.map((line) => `${line}\n`).join(""));
          return 0;
        },
      },
      open: {
        summary: "Open a file in the editor",
        handler: ({ args }) => {
          if (!args[0]) throw new CommandFailure("open: missing file operand");
          const entry = this.requireFile(args[0], this.index(), "open");
          if (!this.host.openFile) throw new CommandFailure("open: the editor is not available");
          this.host.openFile(entry.id);
          return 0;
        },
      },
      run: {
        summary: "Run a C, C++, Java, Python, JS or TS file",
        handler: (ctx) => this.runFile(ctx, "run"),
      },
      clear: {
        summary: "Clear the screen (Ctrl+L)",
        handler: () => {
          this.host.clearScreen?.();
          return 0;
        },
      },
      history: {
        summary: "Show command history",
        handler: ({ out }) => {
          this.history.forEach((entry, position) => out(`${String(position + 1).padStart(5)}  ${entry}\n`));
          return 0;
        },
      },
      whoami: {
        summary: "Print your display name",
        handler: ({ out }) => {
          out(`${this.host.userName ?? "you"}\n`);
          return 0;
        },
      },
      date: {
        summary: "Print the current date and time",
        handler: ({ out }) => {
          out(`${new Date().toString()}\n`);
          return 0;
        },
      },
    };

    for (const alias of RUN_ALIASES) {
      commands[alias] = {
        summary: `Alias for run (runs the file with its detected language)`,
        handler: (ctx) => this.runFile(ctx, alias),
      };
    }
    return commands;
  }

  private headTail(ctx: CommandContext, command: "head" | "tail"): number {
    const normalizedArgs = ctx.args.map((arg) => (/^-\d+$/.test(arg) ? `-n${arg.slice(1)}` : arg));
    const { values, operands } = splitFlags(normalizedArgs, "", "n");
    const count = Number.parseInt(values.get("n") ?? "10", 10);
    if (!Number.isFinite(count) || count < 0) throw new CommandFailure(`${command}: invalid number of lines`);
    const inputs = this.readInputs(ctx, operands, command);
    inputs.forEach((input, position) => {
      if (inputs.length > 1) ctx.out(`${position > 0 ? "\n" : ""}==> ${input.label} <==\n`);
      const lines = formatLines(input.text);
      const selected = command === "head" ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count));
      ctx.out(selected.map((line) => `${line}\n`).join(""));
    });
    return 0;
  }

  private placementFor(
    destination: string,
    entry: ShellEntry,
    multipleSources: boolean,
    index: ShellPathIndex,
    command: string,
  ): { parentId: string | null; name: string; replaceId?: string } {
    const resolved = this.resolve(destination, index);
    if (resolved.kind === "root" || (resolved.kind === "entry" && resolved.entry.type === "folder")) {
      const parentId = resolved.kind === "root" ? null : resolved.entry.id;
      const existing = index.child(parentId, entry.name);
      if (existing && existing.id !== entry.id && (existing.type === "folder" || entry.type === "folder")) {
        throw new CommandFailure(`${command}: '${destination}/${entry.name}' already exists`);
      }
      return { parentId, name: entry.name, replaceId: existing?.id };
    }
    if (multipleSources) throw new CommandFailure(`${command}: target '${destination}' is not a directory`);
    if (resolved.kind === "entry") {
      if (entry.type === "folder") throw new CommandFailure(`${command}: cannot overwrite non-directory '${destination}' with a directory`);
      return { parentId: resolved.entry.parentId, name: resolved.entry.name, replaceId: resolved.entry.id };
    }
    if (resolved.parentId === undefined) throw new CommandFailure(`${command}: cannot create '${destination}': No such file or directory`);
    return { parentId: resolved.parentId, name: resolved.name };
  }

  private copyEntry(entry: ShellEntry, parentId: string | null, name: string, index: ShellPathIndex): void {
    if (entry.type === "file") {
      const created = this.host.fs.createFile(parentId, name);
      this.host.fs.writeFile(created.id, this.host.fs.readFile(entry.id));
      return;
    }
    const folder = this.host.fs.createFolder(parentId, name);
    for (const child of index.children(entry.id)) {
      this.copyEntry(child, folder.id, child.name, index);
    }
  }

  private async runFile(ctx: CommandContext, command: string): Promise<number> {
    const runner = this.host.runner;
    if (!runner) throw new CommandFailure(`${command}: code execution is not available here`);
    const target = ctx.args.find((arg) => !arg.startsWith("-") && arg.includes("."));
    if (!target) throw new CommandFailure(`${command}: usage: ${command} <file>   e.g. ${command} main.py`);
    const index = this.index();
    const entry = this.requireFile(target, index, command);
    const monacoId = entry.language ?? detectLanguageForPath(entry.name) ?? "plaintext";
    const descriptor = findExecutionLanguageForMonacoId(monacoId) ?? findExecutionLanguageForMonacoId(detectLanguageForPath(entry.name) ?? "");
    if (!descriptor) throw new CommandFailure(`${command}: ${target}: can't run ${monacoId} files (supported: C, C++, Java, Python, JavaScript, TypeScript)`);
    if (descriptor.kind === "preview") throw new CommandFailure(`${command}: ${target}: HTML/CSS files open in the Preview panel instead`);

    const entryPath = index.segmentsOf(entry.id).join("/");
    ctx.out(`${ANSI.dim}▶ Running ${entryPath} (${descriptor.displayName})…${ANSI.reset}\n`);

    let result: ExecutionResultPayload;
    const readProgramInput = this.host.readProgramInput;
    if (ctx.stdin !== null || !readProgramInput) {
      result = await runner.run({ entryPath, languageId: descriptor.id, stdin: ctx.stdin ?? undefined }, ctx.signal);
      if (result.stdout) ctx.out(result.stdout);
    } else {
      let printed = "";
      const session = await runInteractiveSession({
        signal: ctx.signal,
        execute: (request, signal) =>
          runner.run({ entryPath, languageId: descriptor.id, ...request, stdin: request.stdin || undefined }, signal),
        readInput: (signal) => readProgramInput(signal),
        onUpdate: (snapshot) => {
          const stdout = snapshot.result?.stdout ?? "";
          if (stdout.startsWith(printed)) {
            ctx.out(stdout.slice(printed.length));
          } else {
            ctx.out(`\n${ANSI.dim}[the program printed something different when re-run]${ANSI.reset}\n${stdout}`);
          }
          printed = stdout;
        },
      });
      if (!session.result) return 1;
      result = session.result;
    }

    if (result.stdout && !result.stdout.endsWith("\n")) ctx.out("\n");
    if (result.compileOutput) ctx.out(`${ANSI.yellow}${ensureTrailingNewline(result.compileOutput)}${ANSI.reset}`);
    if (result.stderr) ctx.out(`${ANSI.red}${ensureTrailingNewline(result.stderr)}${ANSI.reset}`);
    if (result.message) ctx.out(`${ANSI.yellow}${ensureTrailingNewline(result.message)}${ANSI.reset}`);
    if (result.truncated) ctx.out(`${ANSI.dim}[output truncated]${ANSI.reset}\n`);
    const timing = result.cpuTimeSeconds !== null ? ` · ${result.cpuTimeSeconds.toFixed(2)}s` : "";
    const killed = result.status === "timeout" || result.status === "stopped";
    const code = result.exitCode !== null && !killed ? ` · exit ${result.exitCode}` : "";
    const tone = result.status === "success" ? ANSI.green : ANSI.red;
    ctx.out(`${tone}■ ${result.status.replace(/_/g, " ")}${ANSI.reset}${ANSI.dim}${code}${timing}${ANSI.reset}\n`);
    if (result.status === "success") return 0;
    return result.exitCode && result.exitCode > 0 ? result.exitCode : 1;
  }
}
