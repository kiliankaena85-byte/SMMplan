import { IntelligencePlatform, LINK_RULES, LinkRule } from "../src/services/analyzer/link-rules";
import { IntelligenceLinkAnalyzer } from "../src/services/analyzer/link-analyzer";

// Define a new ordered set of rules
const TEST_RULES: LinkRule[] = [
    // 1. Post rule
    {
        platform: IntelligencePlatform.TELEGRAM,
        type: 'post',
        pattern: /t\.me\/[\w_-]+\/(?:s\/)?(\d+)(?:\/|\?|$)/,
        suggestedCategories: ["VIEWS"]
    },
    // 2. Bot rule
    {
        platform: IntelligencePlatform.TELEGRAM,
        type: 'bot',
        pattern: /t\.me\/([\w_-]+bot|[\w_-]+_bot)(?:\/|\?|$)/,
        suggestedCategories: ["BOTS"]
    },
    // 3. Channel rule
    {
        platform: IntelligencePlatform.TELEGRAM,
        type: 'channel',
        pattern: /t\.me\/(?:joinchat\/|\+)?([\w_-]+)(?:\/|\?|$)/,
        suggestedCategories: ["SUBSCRIBERS"]
    }
];

function testRegex(url: string) {
    for (const rule of TEST_RULES) {
        const match = url.match(rule.pattern);
        if (match) {
            return { type: rule.type, id: match[1] };
        }
    }
    return null;
}

const urls = [
    "https://t.me/durov",
    "t.me/durov",
    "https://t.me/durov/",
    "t.me/durov/",
    "https://t.me/durov?boost",
    "https://t.me/durov_bot",
    "https://t.me/durov/123",
    "https://t.me/durov/s/123",
    "https://t.me/durov/123?q=1"
];

for (const url of urls) {
    const res = testRegex(url);
    console.log(`URL: ${url} => Match: ${res ? `${res.type} (${res.id})` : 'NONE'}`);
}
