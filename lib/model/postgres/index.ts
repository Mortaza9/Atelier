

import { Pool } from 'pg';
import { Database } from '../../types/database';
import { Kysely, PostgresDialect } from 'kysely';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
const { REGION, SECRET_NAME } = process.env

const client = new SecretsManagerClient({
    region: REGION as string
});


export async function getSecret(secretName: string): Promise<string> {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName,
        })
    );

    if (!response.SecretString) {
        throw new Error(`Secret ${secretName} does not contain a string value`);
    }

    return response.SecretString;
}

export async function getDatabase(): Promise<Kysely<Database>> {
    const dbSecret = await getSecret(SECRET_NAME as string);
    const { host, port, engine, password } = JSON.parse(dbSecret);
    const pool = new Pool({
        host,
        port: Number(port),
        database: engine,
        user: engine,
        password: password,
        ssl: { rejectUnauthorized: false },
        max: 2,
    });
    const db = new Kysely<Database>({
        dialect: new PostgresDialect({ pool }),
    });
    return db;
}