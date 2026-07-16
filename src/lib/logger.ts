import pino from "pino";

// Logger estructurado (estándar de observabilidad). Usa Pino en Node (local/CI/`next start`); si
// su construcción falla en un runtime restringido (Workers), cae a un shim console-JSON con la
// misma interfaz. Se valida en la preview de Fase 4 (ver plan, riesgo pino↔Workers).

export type Logger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => Logger;
};

function consoleLogger(bindings: Record<string, unknown> = {}): Logger {
  const emit = (
    level: "info" | "warn" | "error",
    obj: Record<string, unknown>,
    msg?: string,
  ) => {
    try {
      const linea = JSON.stringify({
        level,
        time: Date.now(),
        ...bindings,
        ...obj,
        msg,
      });
      if (level === "error") console.error(linea);
      else if (level === "warn") console.warn(linea);
      else console.log(linea);
    } catch {
      // Nunca dejamos que el logging tumbe una request.
    }
  };
  return {
    info: (o, m) => emit("info", o, m),
    warn: (o, m) => emit("warn", o, m),
    error: (o, m) => emit("error", o, m),
    child: (b) => consoleLogger({ ...bindings, ...b }),
  };
}

function crearLogger(): Logger {
  try {
    return pino({
      level: process.env.LOG_LEVEL ?? "info",
    }) as unknown as Logger;
  } catch {
    return consoleLogger();
  }
}

export const logger: Logger = crearLogger();
