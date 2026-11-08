import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { TABLE_NAME } from '../utils/constants';
import { getDatabase } from '../model/postgres';


async function initializeDatabase() {

    console.log('Starting database initialization for players table...');
    const db = await getDatabase();
    await db.schema
        .createTable(TABLE_NAME)
        .ifNotExists() // Crucial: prevents errors if table already exists
        .addColumn('id', 'varchar(16)', (col) => col.primaryKey())
        .addColumn('firstname', 'varchar(100)', (col) => col.notNull())
        .addColumn('lastname', 'varchar(100)', (col) => col.notNull())
        .addColumn('shortname', 'varchar(50)', (col) => col.notNull())
        .addColumn('sex', 'varchar(10)', (col) => col.notNull())
        .addColumn('country', 'jsonb', (col) => col.notNull())
        .addColumn('picture', 'text', (col) => col.notNull())
        .addColumn('data', 'jsonb', (col) => col.notNull())
        .execute();

    console.log('players table ensured. Creating indexes if they don\'t exist yet...');

    await db.schema
        .createIndex('idx_players_rank')
        .ifNotExists()
        .on(TABLE_NAME)
        .column(sql`(data->>'rank')`)
        .execute();

    console.log('Database initialization completed successfully.');
}

let isInitialized = false;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Migration handler invoked with event:', JSON.stringify(event));

    try {
        if (!isInitialized) {
            console.log('Database not initialized in this warm container. Starting migration...');
            await initializeDatabase();
            isInitialized = true;
        } else {
            console.log('Database already initialized in this warm container. Skipping migration.');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Success', data: 'Database initialized and ready.' }),
        };
    } catch (error) {
        console.error('Lambda Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};