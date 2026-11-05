export function collect(
  request: Request,
  env?: Record<string, string | undefined>,
  dependencies?: Record<string, unknown>,
): Promise<Response>;
export function exportEvents(
  request: Request,
  env?: Record<string, string | undefined>,
  dependencies?: Record<string, unknown>,
): Promise<Response>;
