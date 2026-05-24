import { IntelligenceLinkAnalyzer } from "../src/services/analyzer/link-analyzer";

async function main() {
    const analyzer = new IntelligenceLinkAnalyzer();
    const urls = [
        "https://t.me/durov",
        "t.me/durov",
        "https://t.me/durov/",
        "t.me/durov/",
        "https://t.me/durov?boost",
        "https://vk.com/durov",
        "vk.com/durov"
    ];
    for (const url of urls) {
        const res = await analyzer.analyze(url);
        console.log(`URL: ${url} => Platform: ${res.platform}, Type: ${res.type}, ID: ${res.id}`);
    }
}

main().catch(console.error);
