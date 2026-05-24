const pattern = /(?:t\.me|telegram\.me|telegram\.dog)\/(?:joinchat\/|\+)?([\w-]+)\/?(?:\?.*)?$|web\.telegram\.org\/(?:k|a)\/#@([\w-]+)/i;
const url = "https://t.me/smmMarket69";
const match = url.match(pattern);
console.log("Match:", match);
