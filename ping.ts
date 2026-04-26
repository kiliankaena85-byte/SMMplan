import { UniversalProvider } from './src/services/providers/universal.provider';

async function run() {
    console.log('Testing smmprime.com balance...');
    const p = new UniversalProvider('https://smmprime.com/api/v2', '6833e1ceef531d34e7442d492b8e1021');
    const b = await p.getBalance();
    console.log('SUCCESS:', b);
    
    console.log('Testing stream-promotion.ru services...');
    const p2 = new UniversalProvider('https://stream-promotion.ru/api/v2', 'fGOsh7PtBk3Ckyq3UmqH6HVNYTC2gGTH');
    const services = await p2.getServices();
    console.log('SUCCESS: Extracted', services.length, 'services from stream-promotion.ru');
}

run().catch(console.error);
