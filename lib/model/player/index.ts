import { sql } from "kysely";
import { Player, PlayerPartial } from "../../types/player";
import { TABLE_NAME } from "../../utils/constants";
import { getDatabase } from "../postgres";

export async function insertPlayer(player: Player): Promise<Player | undefined> {
    const db = await getDatabase()
    const insertedPlayer = await db
        .insertInto(TABLE_NAME)
        .values(player)
        .onConflict((oc) => oc.column('id').doNothing())
        .returningAll()
        .executeTakeFirst();

    return insertedPlayer
}

export async function retrievePlayer(playerId: string): Promise<Player | undefined> {
    const db = await getDatabase()
    const player = await db
        .selectFrom(TABLE_NAME)
        .selectAll()
        .where('id', '=', playerId)
        .executeTakeFirst();

    return player;
}

export async function listPlayersOrderByRank(
    limit: number,
    cursorId?: number,
    sex?: string): Promise<{
        players: Player[];
        nextCursor: number | null;
    }> {
    const db = await getDatabase()
    let query = db
        .selectFrom(TABLE_NAME)
        .selectAll()
        .orderBy(sql`(data->>'rank')::integer`, 'asc')
        .limit(limit + 1);

    if (sex) query = query.where('sex', '=', sex);

    if (cursorId !== undefined && !isNaN(cursorId)) {
        query = query.where(sql`(data->>'rank')::integer`, '>', cursorId);
    }

    const results = await query.execute();

    let nextCursor: number | null = null;
    if (results.length > limit) {
        results.pop();
        nextCursor = results[results.length - 1].data.rank;
    }
    return { players: results, nextCursor };
}

export async function deletePlayer(playerId: string): Promise<string | undefined> {
    const db = await getDatabase()
    const deletedPlayer = await db
        .deleteFrom(TABLE_NAME)
        .where('id', '=', playerId)
        .returning('id')
        .executeTakeFirst();

    return deletedPlayer?.id;
}

export async function updatePlayer(playerId: string, player: PlayerPartial): Promise<Player | undefined> {
    const db = await getDatabase()
    const updatedPlayer = await db
        .updateTable(TABLE_NAME)
        .set({
            ...Object.fromEntries(
                Object.entries(player).filter(([key]) => key !== "data")
            ),
            ...(player.data && {
                data: sql`
                ${sql.ref("data")}::jsonb ||
                ${JSON.stringify(player.data)}::jsonb
            `,
            }),
        })
        .where("id", "=", playerId)
        .returningAll()
        .executeTakeFirst();
    return updatedPlayer;
}