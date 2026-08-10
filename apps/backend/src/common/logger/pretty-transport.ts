import pinoPretty, { type PrettyOptions } from 'pino-pretty';

// Pino log levels: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal
const LOG_LEVEL_LABELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};

const HTTP_METHOD_COLORS: Record<string, (c: any, text: string) => string> = {
  GET: (c, t) => c.green(t),
  POST: (c, t) => c.yellow(t),
  PUT: (c, t) => c.blue(t),
  PATCH: (c, t) => c.cyan(t),
  DELETE: (c, t) => c.red(t),
  OPTIONS: (c, t) => c.gray(t),
  HEAD: (c, t) => c.gray(t),
};

function colorizeMethod(colors: any, method: string): string {
  const colorFn = HTTP_METHOD_COLORS[method.toUpperCase()];
  const padded = method.toUpperCase().padEnd(4);
  return colorFn ? colorFn(colors, padded) : colors.white(padded);
}

function colorizeStatus(colors: any, status: number | string): string {
  const code = typeof status === 'string' ? parseInt(status, 10) : status;
  const statusStr = String(code);

  if (code >= 500) return colors.red(colors.bold(statusStr));
  if (code >= 400) return colors.yellow(statusStr);
  if (code >= 300) return colors.cyan(statusStr);
  if (code >= 200) return colors.green(statusStr);
  return colors.white(statusStr);
}

function colorizeResponseTime(colors: any, ms: number): string {
  const rounded = Math.round(ms);
  const text = `${rounded}ms`.padStart(6);

  if (rounded < 100) return colors.green(text);
  if (rounded < 500) return colors.yellow(text);
  return colors.red(colors.bold(text));
}

function formatLogLevel(colors: any, level: number): string {
  const label = LOG_LEVEL_LABELS[level] ?? 'UNKN';

  const colorFn =
    level >= 50
      ? colors.red
      : level >= 40
        ? colors.yellow
        : level >= 30
          ? colors.green
          : colors.gray;

  return colorFn(label.padEnd(5));
}

function formatContext(colors: any, context: string): string {
  return colors.cyan(`[${context}]`);
}

function formatUrl(colors: any, url: string, maxLen = 60): string {
  const truncated =
    url.length > maxLen ? url.slice(0, maxLen - 3) + '...' : url;
  return colors.white(truncated);
}

export default function (opts: PrettyOptions) {
  return pinoPretty({
    ...opts,
    colorize: true,
    translateTime: 'yyyy-mm-dd HH:MM:ss',
    messageFormat: (
      log: any,
      messageKey: string,
      _levelLabel: string,
      { colors }: any,
    ) => {
      const level = log.level ?? 30;

      // Application logs (non-HTTP)
      if (log.context && log.context !== 'HTTP') {
        const msg = log[messageKey] ?? '';
        const levelStr = formatLogLevel(colors, level);
        const contextStr = formatContext(colors, log.context);

        const IGNORED_KEYS = new Set([
          'level',
          'time',
          'pid',
          'hostname',
          'context',
          messageKey,
          'req',
          'res',
          'responseTime',
          'err',
        ]);
        const extras: Record<string, unknown> = {};
        for (const key of Object.keys(log)) {
          if (!IGNORED_KEYS.has(key)) extras[key] = log[key];
        }
        const extraStr = Object.keys(extras).length
          ? '\n' + JSON.stringify(extras, null, 2)
          : '';

        return `${levelStr} ${colors.dim('│')} ${contextStr} ${colors.dim(
          '│',
        )} ${msg}${extraStr}`;
      }

      // HTTP logs
      const method = log.req?.method ?? 'GET';
      const url = log.req?.url ?? '/';
      const statusCode = log.res?.statusCode ?? 0;
      const responseTime = log.responseTime ?? 0;

      const methodStr = colorizeMethod(colors, method);
      const statusStr = colorizeStatus(colors, statusCode);
      const timeStr = colorizeResponseTime(colors, responseTime);
      const urlStr = formatUrl(colors, url);

      // Format: GET  200 │ /api/endpoint │  123ms
      return `${methodStr} ${statusStr} ${colors.dim('│')} ${urlStr} ${colors.dim(
        '│',
      )} ${timeStr}`;
    },
    customPrettifiers: {
      // Custom prettifier for the level to match our format
      level: () => '',
    },
    hideObject: true,
    ignore: 'pid,hostname,level,msg',
  });
}
