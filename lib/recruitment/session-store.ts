type SessionEntry = {
    apiKey: string;
    apiSecret: string;
    createdAt: number;
    ttl?: number;
};

const store = new Map<string, SessionEntry>();

export function setSession(id: string, apiKey: string, apiSecret: string, ttl = 1000 * 60 * 60) {
    store.set(id, { apiKey, apiSecret, createdAt: Date.now(), ttl });
    try {
        const mask = (s: string) => s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : s;
        console.log(`[session-store] set session ${id} apiKey=${mask(apiKey)} apiSecret=${mask(apiSecret)}; total sessions=${store.size}`);
    } catch (e) { }
}

export function getSession(id: string) {
    const entry = store.get(id);
    if (!entry) return null;
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
        store.delete(id);
        return null;
    }
    try {
        console.log(`[session-store] get session ${id} -> found`);
    } catch (e) { }
    return { apiKey: entry.apiKey, apiSecret: entry.apiSecret };
}

export function deleteSession(id: string) {
    store.delete(id);
}

export function clearAllSessions() {
    store.clear();
}
