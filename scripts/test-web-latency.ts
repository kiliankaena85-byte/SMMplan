async function testLatency() {
  const urls = [
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3000/login',
    'http://127.0.0.1:3000/api/health',
    'http://127.0.0.1:3000/dashboard',
  ];

  for (const url of urls) {
    const start = performance.now();
    try {
      const res = await fetch(url, { redirect: 'manual' });
      await res.text();
      const duration = (performance.now() - start).toFixed(1);
      console.log(`${url} -> Status: ${res.status}, Time: ${duration}ms`);
    } catch (err) {
      const duration = (performance.now() - start).toFixed(1);
      console.log(`${url} -> ERROR: ${(err as Error).message}, Time: ${duration}ms`);
    }
  }
}

testLatency().catch(console.error);
