

import { Pool } from 'pg';
import { Database } from '../../types/database';
import { Kysely, PostgresDialect } from 'kysely';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
const { REGION, SECRET_NAME } = process.env

const client = new SecretsManagerClient({
    region: REGION as string
});

const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const secretRequests = new Map<string, Promise<string>>();
let databasePromise: Promise<Kysely<Database>> | undefined;


export async function getSecret(secretName: string): Promise<string> {
    const cachedSecret = secretCache.get(secretName);
    if (cachedSecret && cachedSecret.expiresAt > Date.now()) {
        return cachedSecret.value;
    }

    const pendingRequest = secretRequests.get(secretName);
    if (pendingRequest) {
        return pendingRequest;
    }

    const request = client.send(
        new GetSecretValueCommand({ SecretId: secretName })
    ).then((response) => {
        if (!response.SecretString) {
            throw new Error(`Secret ${secretName} does not contain a string value`);
        }

        secretCache.set(secretName, {
            value: response.SecretString,
            expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
        });
        return response.SecretString;
    }).finally(() => {
        secretRequests.delete(secretName);
    });

    secretRequests.set(secretName, request);
    return request;
}

export async function getDatabase(): Promise<Kysely<Database>> {
    if (!databasePromise) {
        databasePromise = (async () => {
            const dbSecret = await getSecret(SECRET_NAME as string);
            const { host, port, engine } = JSON.parse(dbSecret);
            const pool = new Pool({
                host,
                port: Number(port),
                database: engine,
                user: engine,
                password: async () => {
                    const currentSecret = JSON.parse(await getSecret(SECRET_NAME as string));
                    return currentSecret.password;
                },
                ssl: { rejectUnauthorized: false },
                max: 2,
            });

            return new Kysely<Database>({
                dialect: new PostgresDialect({ pool }),
            });
        })().catch((error: unknown) => {
            databasePromise = undefined;
            throw error;
        });
    }

    return databasePromise;
}