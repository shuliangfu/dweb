/**
 * Stub host exit so CLI tests can assert the code without killing the runner.
 * Production {@link exit} uses Deno.exit on Deno and process.exit on Bun/Node.
 */
export function stubExit(): {
  readonly code: number | undefined;
  restore: () => void;
} {
  const g = globalThis as typeof globalThis & {
    Deno?: { exit: (code?: number) => never };
    process?: { exit: (code?: number) => never };
  };
  const origDeno = g.Deno?.exit;
  const origProc = g.process?.exit;
  let code: number | undefined;
  const fake = ((c?: number) => {
    code = c ?? 0;
    throw new Error(`DENO_EXIT:${c ?? 0}`);
  }) as (code?: number) => never;
  if (g.Deno) g.Deno.exit = fake;
  if (g.process) g.process.exit = fake;
  return {
    get code() {
      return code;
    },
    restore() {
      if (g.Deno && origDeno) g.Deno.exit = origDeno;
      if (g.process && origProc) g.process.exit = origProc;
    },
  };
}
