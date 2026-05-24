import { LINK_RULES } from "../src/services/analyzer/link-rules";

const urls = [
  "https://t.me/durov",
  "t.me/durov",
  "https://t.me/durov/",
  "t.me/durov/",
  "https://t.me/joinchat/durov",
  "https://t.me/+durov",
  "https://t.me/durov/123",
  "t.me/durov/123"
];

for (const url of urls) {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  try {
    const urlObj = new URL(cleanUrl);
    const targetUrl = urlObj.toString();
    console.log(`URL: ${url} -> Normalized: ${targetUrl}`);
    let matched = false;
    for (const rule of LINK_RULES) {
      const match = targetUrl.match(rule.pattern);
      if (match) {
        console.log(`  MATCHED Rule: platform=${rule.platform}, type=${rule.type}, id=${match[1] || match[2] || match[3]}`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      console.log(`  NO MATCH`);
    }
  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
  }
}
