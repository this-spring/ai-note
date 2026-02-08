export const logger = {
  info: (...args: any[]) => console.log('[AI-Note]', ...args),
  error: (...args: any[]) => console.error('[AI-Note ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[AI-Note WARN]', ...args),
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') console.log('[AI-Note DEBUG]', ...args)
  }
}
