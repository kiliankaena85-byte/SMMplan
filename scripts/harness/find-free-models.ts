import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testAllFree() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
  });
  const json = await res.json();
  const freeModels = (json.data || [])
    .filter((m: any) => m.id.endsWith(':free') || m.pricing?.prompt === '0')
    .map((m: any) => m.id);

  console.log(`Found ${freeModels.length} free models on OpenRouter:`, freeModels);

  for (const m of freeModels) {
    try {
      const chatRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://smmplan.pro',
          'X-Title': 'OmniSMM Test',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Say "OmniSMM Test Plan Approved"' }]
        })
      });
      if (chatRes.ok) {
        const cJson = await chatRes.json();
        console.log(`🎉 WORKING MODEL FOUND: ${m} ->`, cJson.choices?.[0]?.message?.content);
      } else {
        console.log(`❌ ${m}: HTTP ${chatRes.status}`);
      }
    } catch (e: any) {
      console.log(`❌ ${m}:`, e.message);
    }
  }
}

testAllFree();
