import { IntelligenceLinkAnalyzer } from "../src/services/analyzer/link-analyzer";

async function main() {
    const analyzer = new IntelligenceLinkAnalyzer();
    const result = await analyzer.analyze("https://t.me/smmMarket69");
    console.log("Analysis Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
