import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// 1. Load .env file into process.env if not already loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 2. If running on host outside Docker, adapt Docker internal network names to localhost
if (!fs.existsSync('/.dockerenv')) {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@db:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL
      .replace('@db:5432', '@127.0.0.1:5435')
      .replace('@db:', '@127.0.0.1:5435');
  } else if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5435/smmplan_lite?schema=public&connection_limit=5&pool_timeout=30';
  }

  if (process.env.REDIS_URL && process.env.REDIS_URL.includes('@redis:')) {
    process.env.REDIS_URL = process.env.REDIS_URL.replace('@redis:', '@127.0.0.1:');
  } else if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://:SmmP1anR3dis2026Secure!@127.0.0.1:6379';
  }
}
