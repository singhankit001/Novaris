import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
};

/** No DATABASE_URL means nothing was ever stored, so reads can answer "not found" without a query. */
export function isDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL);
}

function getPrismaClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
    }

    return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === "function" ? value.bind(client) : value;
    },
    set(_target, prop, value, receiver) {
        return Reflect.set(getPrismaClient(), prop, value, receiver);
    },
    has(_target, prop) {
        return prop in getPrismaClient();
    },
    ownKeys() {
        return Reflect.ownKeys(getPrismaClient());
    },
    getOwnPropertyDescriptor(_target, prop) {
        return Object.getOwnPropertyDescriptor(getPrismaClient(), prop);
    },
});
