export interface ShellWord {
  text: string;
  glob: boolean;
}

export interface ShellCommand {
  words: ShellWord[];
  stdinPath?: string;
  stdoutPath?: { path: string; append: boolean };
}

export interface ShellListItem {
  pipeline: ShellCommand[];
  connector: ";" | "&&" | "||";
}

type Token = { type: "word"; word: ShellWord } | { type: "op"; op: "|" | ">" | ">>" | "<" | "&&" | "||" | ";" };

export class ShellSyntaxError extends Error {}

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === " " || char === "\t") {
      index += 1;
      continue;
    }
    if (char === "#") {
      break;
    }
    const twoChars = line.slice(index, index + 2);
    if (twoChars === "&&" || twoChars === "||" || twoChars === ">>") {
      tokens.push({ type: "op", op: twoChars });
      index += 2;
      continue;
    }
    if (char === "|" || char === ">" || char === "<" || char === ";") {
      tokens.push({ type: "op", op: char });
      index += 1;
      continue;
    }
    if (char === "&") {
      throw new ShellSyntaxError("background jobs (&) are not supported");
    }

    let text = "";
    let glob = false;
    let sawQuote = false;
    while (index < line.length) {
      const current = line[index];
      if (" \t|<>;".includes(current) || line.slice(index, index + 2) === "&&") {
        break;
      }
      if (current === "\\") {
        if (index + 1 < line.length) {
          text += line[index + 1];
        }
        index += 2;
        continue;
      }
      if (current === "'" || current === '"') {
        const close = line.indexOf(current, index + 1);
        if (close === -1) {
          throw new ShellSyntaxError(`unterminated ${current === "'" ? "single" : "double"} quote`);
        }
        let quoted = line.slice(index + 1, close);
        if (current === '"') {
          quoted = quoted.replace(/\\(["\\])/g, "$1");
        }
        text += quoted;
        sawQuote = true;
        index = close + 1;
        continue;
      }
      if (current === "*" || current === "?") {
        glob = true;
      }
      text += current;
      index += 1;
    }
    tokens.push({ type: "word", word: { text, glob: glob && !sawQuote } });
  }
  return tokens;
}

export function parseShellLine(line: string): ShellListItem[] {
  const tokens = tokenize(line);
  const list: ShellListItem[] = [];
  let connector: ShellListItem["connector"] = ";";
  let pipeline: ShellCommand[] = [];
  let command: ShellCommand = { words: [] };

  const finishCommand = (required: boolean) => {
    if (command.words.length === 0) {
      if (required || command.stdinPath || command.stdoutPath) {
        throw new ShellSyntaxError("syntax error: missing command");
      }
      return;
    }
    pipeline.push(command);
    command = { words: [] };
  };

  const finishPipeline = (nextConnector: ShellListItem["connector"], required: boolean) => {
    finishCommand(required || pipeline.length > 0);
    if (pipeline.length > 0) {
      list.push({ pipeline, connector });
    } else if (required) {
      throw new ShellSyntaxError("syntax error: missing command");
    }
    pipeline = [];
    connector = nextConnector;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "word") {
      command.words.push(token.word);
      continue;
    }
    if (token.op === ">" || token.op === ">>" || token.op === "<") {
      const target = tokens[index + 1];
      if (!target || target.type !== "word") {
        throw new ShellSyntaxError(`syntax error: expected a file name after ${token.op}`);
      }
      index += 1;
      if (token.op === "<") {
        command.stdinPath = target.word.text;
      } else {
        command.stdoutPath = { path: target.word.text, append: token.op === ">>" };
      }
      continue;
    }
    if (token.op === "|") {
      finishCommand(true);
      continue;
    }
    finishPipeline(token.op, token.op !== ";");
  }
  finishPipeline(";", connector !== ";");
  return list;
}
