export const logger = {
  info: (...args: any[]) => console.log('[INote]', ...args),
  error: (...args: any[]) => console.error('[INote ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[INote WARN]', ...args),
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') console.log('[INote DEBUG]', ...args)
  }
}
