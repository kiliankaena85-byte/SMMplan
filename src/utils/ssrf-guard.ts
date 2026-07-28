export function assertSafeUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS allowed');
  }
  const hostname = parsed.hostname;
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]',
    '169.254.169.254', 'metadata.google.internal'];
  if (blocked.includes(hostname)) {
    throw new Error('Blocked URL');
  }
  // Check private ranges
  if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname)) {
    throw new Error('Private IP blocked');
  }
}
