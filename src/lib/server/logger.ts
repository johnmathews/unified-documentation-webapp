type Level = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function emit(level: Level, message: string, fields: Fields = {}): void {
 const line = JSON.stringify({
  timestamp: new Date().toISOString(),
  level: level.toUpperCase(),
  logger: "docwebapp",
  message,
  ...fields,
 });
 if (level === "error") {
  process.stderr.write(line + "\n");
 } else {
  process.stdout.write(line + "\n");
 }
}

export const logger = {
 info: (message: string, fields?: Fields) => emit("info", message, fields),
 warn: (message: string, fields?: Fields) => emit("warn", message, fields),
 error: (message: string, fields?: Fields) => emit("error", message, fields),
};

let counter = 0;
export function newRequestId(): string {
 counter = (counter + 1) >>> 0;
 return counter.toString(36).padStart(4, "0");
}
