export function ok<T>(data: T, message?: string) {
  return message ? { data, message } : { data };
}

export function okMessage(message: string) {
  return { message };
}
