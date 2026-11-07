import { sql } from "kysely";
import { TABLE_NAME } from "../../utils/constants";
import { PlayerStatistics } from "../../types/statistics";
import { getDatabase } from "../postgres";


export async function getStats(): Promise<PlayerStatistics> {
    const db = await getDatabase()
    const result = await db
        .with('top_country', (db) =>
            db
                .selectFrom(TABLE_NAME)
                .select([
                    'country',
                    sql<number>`SUM((data->>'win')::numeric) / NULLIF(SUM((data->>'total')::numeric), 0)`.as('ratio')
                ])
                .groupBy('country')
                .orderBy('ratio', 'desc')
                .limit(1)
        )
        .with('global_stats', (db) =>
            db
                .selectFrom(TABLE_NAME)
                .select([
                    sql<number>`AVG((data->>'imc')::numeric)`.as('avgImc'),
                    sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY (data->>'height')::numeric)`.as('medianHeight')
                ])
        )
        .selectFrom('top_country')
        .crossJoin('global_stats')
        .selectAll('top_country')
        .select([
            'global_stats.avgImc',
            'global_stats.medianHeight'
        ])
        .executeTakeFirst();
    return {
        country: result?.country.code as string,
        avgImc: result?.avgImc as number,
        medianHeight: result?.medianHeight as number
    };
}