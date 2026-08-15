import dns from 'dns/promises';

/**
 * Validates a URL against SSRF attacks including DNS Rebinding.
 * Resolves hostname to IP addresses and verifies they do not belong to private/loopback/link-local ranges.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS allowed');
  }

  const hostname = parsed.hostname;
  const blockedHostnames = ['localhost', 'metadata.google.internal'];
  if (blockedHostnames.includes(hostname.toLowerCase())) {
    throw new Error('Blocked URL');
  }

  // Helper to test individual IP string against private/loopback ranges
  const isPrivateIp = (ip: string): boolean => {
    // IPv4 Checks
    if (/^127\./.test(ip)) return true; // 127.0.0.0/8
    if (/^10\./.test(ip)) return true;  // 10.0.0.0/8
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true; // 172.16.0.0/12
    if (/^192\.168\./.test(ip)) return true; // 192.168.0.0/16
    if (/^169\.254\./.test(ip)) return true; // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (ip.startsWith('100.100.100.')) return true; // Alibaba Cloud Metadata
    if (ip === '0.0.0.0') return true;

    // IPv6 Checks
    const normalizedIpv6 = ip.toLowerCase();
    if (normalizedIpv6 === '::1' || normalizedIpv6 === '::') return true;
    if (normalizedIpv6.startsWith('fc00:') || normalizedIpv6.startsWith('fd00:')) return true; // fc00::/7 (Unique local)
    if (normalizedIpv6.startsWith('fe80:')) return true; // fe80::/10 (Link-local)

    return false;
  };

  // If hostname is already an IP address, check directly
  if (isPrivateIp(hostname)) {
    throw new Error('Private IP blocked');
  }

  // Resolve hostname via DNS to prevent DNS Rebinding Attacks
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error(`Private IP resolved from hostname: ${record.address}`);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Private IP')) {
      throw err;
    }
    // If DNS resolution fails, throw invalid target error
    // eslint-disable-next-line preserve-caught-error
    throw new Error(`Failed to resolve target hostname: ${hostname}`);
  }
}
