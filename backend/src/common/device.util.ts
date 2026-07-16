/**
 * Util deviceSummary — parse User-Agent menjadi ringkasan "Chrome • Windows"
 */
import UAParser from 'ua-parser-js';

export function getDeviceSummary(userAgent: string): string {
  if (!userAgent) return 'Tidak diketahui';
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();

  const browserName = browser.name || 'Browser';
  const osName = os.name || 'OS';

  return `${browserName} • ${osName}`;
}

export function getIpAddress(req: any): string {
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) {
    return xRealIp;
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}
