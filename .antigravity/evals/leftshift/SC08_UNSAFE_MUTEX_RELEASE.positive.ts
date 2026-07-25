// SC08 Positive Fixture: Unsafe redis del without ownership token
export async function releaseLock(redis: any, key: string) {
  await redis.del(key);
}
