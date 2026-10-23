export class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch('/api' + path, {
    method,
    headers:
      body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-Workshop-Request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok)
    throw new APIError(
      response.status,
      value.error || 'The request could not be saved.',
    );
  return value;
}
