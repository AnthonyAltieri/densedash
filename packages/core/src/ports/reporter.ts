export interface ReporterPort {
  error(cause: unknown, context: { source: "command" | "task"; id: string }): void;
  warn(message: string): void;
  trace?<A>(name: string, run: () => A): A;
}
