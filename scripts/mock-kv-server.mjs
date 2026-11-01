import http from "node:http";

const store = new Map();
const expirations = new Map();

function cleanKey(key) {
    const exp = expirations.get(key);
    if (exp && exp < Date.now()) {
        store.delete(key);
        expirations.delete(key);
        return false;
    }
    return true;
}

function encodeResult(val, isBase64) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" || typeof val === "boolean") return val;
    if (typeof val === "string" && !isBase64) return val;
    const str = typeof val === "string" ? val : JSON.stringify(val);
    return isBase64 ? Buffer.from(str).toString("base64") : val;
}

export function executeCommand([cmd, ...args], isBase64 = false) {
    const c = String(cmd).toLowerCase();

    if (c === "ping") return "PONG";
    if (c === "info") return "role:master\r\nuptime_in_seconds:3600";

    if (c === "get") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return null;
        return encodeResult(store.get(key), isBase64);
    }

    if (c === "set") {
        const [key, val, ...opts] = args;
        let nx = false;
        let ex = null;
        for (let i = 0; i < opts.length; i++) {
            const opt = String(opts[i]).toLowerCase();
            if (opt === "nx") nx = true;
            if (opt === "ex" && opts[i + 1]) ex = Number(opts[++i]);
        }
        if (nx && cleanKey(key) && store.has(key)) return null;
        store.set(key, val);
        if (ex) expirations.set(key, Date.now() + ex * 1000);
        return "OK";
    }

    if (c === "setex") {
        const [key, sec, val] = args;
        store.set(key, val);
        expirations.set(key, Date.now() + Number(sec) * 1000);
        return "OK";
    }

    if (c === "del") {
        let count = 0;
        for (const k of args) {
            if (store.has(k)) {
                store.delete(k);
                expirations.delete(k);
                count++;
            }
        }
        return count;
    }

    if (c === "expire") {
        const [key, sec] = args;
        if (cleanKey(key) && store.has(key)) {
            expirations.set(key, Date.now() + Number(sec) * 1000);
            return 1;
        }
        return 0;
    }

    if (c === "incr") {
        const key = args[0];
        cleanKey(key);
        const curr = Number(store.get(key)) || 0;
        const next = curr + 1;
        store.set(key, next);
        return next;
    }

    if (c === "incrby") {
        const [key, delta] = args;
        cleanKey(key);
        const curr = Number(store.get(key)) || 0;
        const next = curr + Number(delta);
        store.set(key, next);
        return next;
    }

    if (c === "decr") {
        const key = args[0];
        cleanKey(key);
        const curr = Number(store.get(key)) || 0;
        const next = curr - 1;
        store.set(key, next);
        return next;
    }

    if (c === "decrby") {
        const [key, delta] = args;
        cleanKey(key);
        const curr = Number(store.get(key)) || 0;
        const next = curr - Number(delta);
        store.set(key, next);
        return next;
    }

    if (c === "mget") {
        return args.map((key) => {
            if (!cleanKey(key) || !store.has(key)) return null;
            return encodeResult(store.get(key), isBase64);
        });
    }

    if (c === "keys") {
        const pattern = args[0] ? new RegExp(args[0].replace(/\*/g, ".*")) : /.*/;
        const result = [];
        for (const key of store.keys()) {
            if (cleanKey(key) && pattern.test(key)) result.push(key);
        }
        return result;
    }

    if (c === "sadd") {
        const [key, ...members] = args;
        cleanKey(key);
        let set = store.get(key);
        if (!set || !(set instanceof Set)) {
            set = new Set();
            store.set(key, set);
        }
        let added = 0;
        for (const m of members) {
            const memberStr = typeof m === "object" ? JSON.stringify(m) : String(m);
            if (!set.has(memberStr)) {
                set.add(memberStr);
                added++;
            }
        }
        return added;
    }

    if (c === "smembers") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return [];
        const set = store.get(key);
        if (!(set instanceof Set)) return [];
        return Array.from(set);
    }

    if (c === "scard") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return 0;
        const set = store.get(key);
        return set instanceof Set ? set.size : 0;
    }

    if (c === "srem") {
        const [key, ...members] = args;
        if (!cleanKey(key) || !store.has(key)) return 0;
        const set = store.get(key);
        if (!(set instanceof Set)) return 0;
        let removed = 0;
        for (const m of members) {
            const memberStr = typeof m === "object" ? JSON.stringify(m) : String(m);
            if (set.delete(memberStr)) removed++;
        }
        return removed;
    }

    if (c === "hget") {
        const [key, field] = args;
        if (!cleanKey(key) || !store.has(key)) return null;
        const val = store.get(key);
        if (!val || typeof val !== "object" || Array.isArray(val) || val instanceof Set) return null;
        const item = val[field];
        if (item === undefined || item === null) return null;
        return typeof item === "string" ? item : JSON.stringify(item);
    }

    if (c === "hgetall") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return [];
        const val = store.get(key);
        if (!val || typeof val !== "object" || Array.isArray(val) || val instanceof Set) return [];
        const result = [];
        for (const [k, v] of Object.entries(val)) {
            result.push(k, typeof v === "string" ? v : JSON.stringify(v));
        }
        return result;
    }

    if (c === "hset") {
        const key = args[0];
        cleanKey(key);
        let obj = store.get(key);
        if (!obj || typeof obj !== "object" || Array.isArray(obj) || obj instanceof Set) {
            obj = {};
            store.set(key, obj);
        }
        let added = 0;
        if (typeof args[1] === "object" && args[1] !== null) {
            for (const [k, v] of Object.entries(args[1])) {
                if (!(k in obj)) added++;
                obj[k] = v;
            }
        } else {
            for (let i = 1; i < args.length; i += 2) {
                const k = args[i];
                const v = args[i + 1];
                if (!(k in obj)) added++;
                obj[k] = v;
            }
        }
        return added;
    }

    if (c === "hincrby") {
        const [key, field, delta] = args;
        cleanKey(key);
        let obj = store.get(key);
        if (!obj || typeof obj !== "object" || Array.isArray(obj) || obj instanceof Set) {
            obj = {};
            store.set(key, obj);
        }
        const curr = Number(obj[field]) || 0;
        const next = curr + Number(delta);
        obj[field] = next;
        return next;
    }

    if (c === "lpush") {
        const [key, ...values] = args;
        cleanKey(key);
        let list = store.get(key);
        if (!Array.isArray(list)) {
            list = [];
            store.set(key, list);
        }
        list.unshift(...values);
        return list.length;
    }

    if (c === "ltrim") {
        const [key, start, stop] = args;
        cleanKey(key);
        let list = store.get(key);
        if (Array.isArray(list)) {
            store.set(key, list.slice(Number(start), Number(stop) + 1));
        }
        return "OK";
    }

    if (c === "lrange") {
        const [key, start, stop] = args;
        if (!cleanKey(key) || !store.has(key)) return [];
        const list = store.get(key);
        if (!Array.isArray(list)) return [];
        const end = Number(stop) === -1 ? undefined : Number(stop) + 1;
        return list.slice(Number(start), end);
    }

    if (c === "zadd") {
        const [key, score, member] = args;
        cleanKey(key);
        let zset = store.get(key);
        if (!Array.isArray(zset)) {
            zset = [];
            store.set(key, zset);
        }
        const existingIdx = zset.findIndex((item) => item.member === member);
        if (existingIdx >= 0) {
            zset[existingIdx].score = Number(score);
        } else {
            zset.push({ member, score: Number(score) });
        }
        zset.sort((a, b) => a.score - b.score);
        return 1;
    }

    if (c === "zcard") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return 0;
        const zset = store.get(key);
        return Array.isArray(zset) ? zset.length : 0;
    }

    if (c === "zcount") {
        const [key, min, max] = args;
        if (!cleanKey(key) || !store.has(key)) return 0;
        const zset = store.get(key);
        if (!Array.isArray(zset)) return 0;
        const minVal = min === "-inf" ? -Infinity : Number(min);
        const maxVal = max === "+inf" ? Infinity : Number(max);
        return zset.filter((i) => i.score >= minVal && i.score <= maxVal).length;
    }

    if (c === "zrangebyscore" || c === "zrevrange") {
        const key = args[0];
        if (!cleanKey(key) || !store.has(key)) return [];
        const zset = store.get(key);
        if (!Array.isArray(zset)) return [];
        return zset.map((item) => item.member);
    }

    if (c === "zrem") {
        const [key, ...members] = args;
        if (!cleanKey(key) || !store.has(key)) return 0;
        const zset = store.get(key);
        if (!Array.isArray(zset)) return 0;
        let removed = 0;
        for (const m of members) {
            const idx = zset.findIndex((item) => item.member === m);
            if (idx >= 0) {
                zset.splice(idx, 1);
                removed++;
            }
        }
        return removed;
    }

    return "OK";
}

export function createMockKvServer(port = 8099) {
    const server = http.createServer((req, res) => {
        const isBase64 = req.headers["upstash-encoding"] === "base64";
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/json" });
            try {
                if (req.url === "/pipeline") {
                    const commands = JSON.parse(body);
                    const results = commands.map((cmd) => ({
                        result: executeCommand(cmd, isBase64),
                    }));
                    res.end(JSON.stringify(results));
                } else if (body) {
                    const cmd = JSON.parse(body);
                    res.end(JSON.stringify({ result: executeCommand(cmd, isBase64) }));
                } else {
                    res.end(JSON.stringify({ result: "PONG" }));
                }
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    });

    return new Promise((resolve) => {
        server.listen(port, () => {
            resolve({
                port,
                url: `http://localhost:${port}`,
                token: "mock-kv-token",
                close: () => new Promise((cb) => server.close(cb)),
            });
        });
    });
}

if (process.argv[1]?.endsWith("mock-kv-server.mjs")) {
    const port = Number(process.env.MOCK_KV_PORT || 8099);
    createMockKvServer(port).then((srv) => {
        console.log(`Mock Upstash KV server listening on ${srv.url}`);
    });
}
