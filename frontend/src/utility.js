function generateRandomString(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function pseudoRandom(min, max, seed) {
    // 將種子字串轉化為哈希碼
    function hashSeed(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為32bit整數
        }
        return Math.abs(hash);
    }

    // 種子值，使用種子字串的哈希
    const seedHash = hashSeed(seed);

    // 使用一個簡單的線性同餘生成器(LCG)計算隨機數
    function seededRandom(seed) {
        if (seed === 295362091) seed = 1;
        const a = 165403;
        const c = 51654324;
        const m = 2147483647; // 2^32
        return (a * seed + c) % m;
    }

    // 生成隨機數
    const randomValue = seededRandom(seedHash);
    // 將隨機數映射到[min, max)範圍
    return min + (randomValue % (max - min));
}

export { generateRandomString, pseudoRandom };
