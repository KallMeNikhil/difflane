const ALLOWED_EXECUTABLES = new Set([
  "pwd",
  "ls",
  "cd",
  "cat",
  "head",
  "tail",
  "echo",
  "printf",
  "clear",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "rm",
  "find",
  "grep",
  "gcc",
  "g++",
  "javac",
  "java",
  "python",
  "python3",
  "node",
  "npm",
]);

const DENIED_ARGUMENT_PATTERNS = [
  /\.\.(\/|$)/,
  /^\//,
  /^~/,
  /\$\(/,
  /`/,
  /\|/,
  />/,
  /</,
  /&/,
  /;/,
  /^-/,
  /--eval/,
  /--exec/,
  /\/proc\//,
  /\/dev\//,
  /\/sys\//,
  /\.env/,
];

const SAFE_FLAG_ALLOWLIST: Record<string, RegExp[]> = {
  ls: [/^-[algth]+$/],
  grep: [/^-[rniE]+$/],
  find: [/^-name$/, /^-type$/],
  npm: [/^install$/, /^run$/, /^start$/, /^ci$/],
  node: [],
  python: [],
  python3: [],
  java: [],
  javac: [],
  gcc: [],
  "g++": [],
};

export interface CommandValidationResult {
  allowed: boolean;
  reason?: string;
}

export function validateTerminalCommand(rawInput: string): CommandValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { allowed: true };
  }
  const tokens = trimmed.split(/\s+/);
  const executable = tokens[0];

  if (!ALLOWED_EXECUTABLES.has(executable)) {
    return { allowed: false, reason: `Command "${executable}" is not permitted in this environment.` };
  }

  const args = tokens.slice(1);
  const allowedFlags = SAFE_FLAG_ALLOWLIST[executable];

  for (const arg of args) {
    for (const pattern of DENIED_ARGUMENT_PATTERNS) {
      if (pattern.test(arg)) {
        if (arg.startsWith("-") && allowedFlags?.some((flagPattern) => flagPattern.test(arg))) {
          continue;
        }
        return { allowed: false, reason: "That argument is not permitted for security reasons." };
      }
    }
  }

  return { allowed: true };
}

export function isExecutableAllowed(executable: string): boolean {
  return ALLOWED_EXECUTABLES.has(executable);
}
