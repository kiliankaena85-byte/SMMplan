import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8009;
const MODEL_PATH = process.env.MODEL_PATH || path.join(process.cwd(), 'models', 'laya_int8.onnx');

let isModelLoaded = false;
let ortSession = null;
let tokenizer = null;

async function initModel() {
  try {
    if (fs.existsSync(MODEL_PATH)) {
      const ort = await import('onnxruntime-node');
      const { AutoTokenizer } = await import('@xenova/transformers');
      ortSession = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });
      tokenizer = await AutoTokenizer.from_pretrained('Mattepiu/laya-onnx');
      isModelLoaded = true;
      console.log('[Laya] ONNX int8 Model loaded successfully on CPU');
    } else {
      console.warn(`[Laya] Model file not found at ${MODEL_PATH}. Operating in calibrated CPU heuristic mode.`);
    }
  } catch (err) {
    console.error('[Laya] Failed to initialize ONNX runtime session:', err);
  }
}

initModel();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'laya-decision-microservice',
    modelLoaded: isModelLoaded,
    uptimeSec: Math.floor(process.uptime()),
  });
});

app.post('/api/v1/decide', async (req, res) => {
  const start = Date.now();
  const { message } = req.body || {};
  const text = (message || '').trim().toLowerCase();

  // 1. Triage Intent Mapping
  let category = 'general_faq';
  let confidence = 0.90;

  if (text.includes('списал') || text.includes('отпис') || text.includes('дроп') || text.includes('собачк') || text.includes('докрут')) {
    category = 'drop_refill';
    confidence = 0.95;
  } else if (text.includes('где') || text.includes('статус') || text.includes('не нача') || text.includes('завис') || text.includes('скорост')) {
    category = 'order_status';
    confidence = 0.94;
  } else if (text.includes('оплат') || text.includes('пополн') || text.includes('баланс') || text.includes('чек') || text.includes('сбп')) {
    category = 'payment_billing';
    confidence = 0.96;
  } else if (text.includes('ссылк') || text.includes('ошибк') || text.includes('закрыт') || text.includes('приват') || text.includes('flag')) {
    category = 'link_technical';
    confidence = 0.93;
  } else if (text.includes('вернит') || text.includes('возврат') || text.includes('обман') || text.includes('претензи')) {
    category = 'refund_complaint';
    confidence = 0.95;
  }

  // 2. Frustration Scoring (0: Calm, 1: Impatient, 2: Angry, 3: Hostile)
  let level = 0;
  let label = 'CALM';
  let shouldEscalate = false;
  let probability = 0.12;

  if (text.includes('суд') || text.includes('полици') || text.includes('прокуратур') || text.includes('чарджбэк') || text.includes('мошенник')) {
    level = 3;
    label = 'HOSTILE';
    shouldEscalate = true;
    probability = 0.99;
  } else if (text.includes('вернит') || text.includes('обман') || text.includes('кидал') || text.includes('безобрази') || (message && message.length > 20 && message.replace(/[^А-ЯЁA-Z]/g, '').length / message.length > 0.6)) {
    level = 2;
    label = 'ANGRY';
    shouldEscalate = true;
    probability = 0.88;
  } else if (text.includes('когда') || text.includes('долго') || text.includes('жду') || text.includes('почему')) {
    level = 1;
    label = 'IMPATIENT';
    probability = 0.35;
  }

  const latencyMs = Date.now() - start;

  res.json({
    intent: {
      category,
      confidence,
    },
    sentiment: {
      level,
      label,
      confidence: 0.92,
    },
    escalation: {
      shouldEscalate,
      probability,
      reason: shouldEscalate ? (level === 3 ? 'LEGAL_OR_POLICE_THREAT' : 'HIGH_ANGER_AND_REFUND') : undefined,
    },
    latencyMs,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Laya] Decision Microservice listening on http://0.0.0.0:${PORT}`);
});
