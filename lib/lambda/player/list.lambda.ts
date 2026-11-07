import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, InternalServerErrorResponse } from "../../utils/responses";
import { listPlayersOrderByRank } from "../../model/player";
import { asApiResponse } from "../../types/player";

export async function listPlayers(
    params: Record<string, string>
): Promise<Response> {
    try {
        const limit = Number(params?.limit || "50");
        const cursor = params?.cursor ? Number(params?.cursor) : undefined;
        const sex = params?.sex;
        const { players, nextCursor } = await listPlayersOrderByRank(
            limit,
            cursor,
            sex
        );
        return SuccessResponse({
            message: "Player list retrieved successfully",
            data: {
                count: players.length,
                players: players.map(player => asApiResponse(player)),
                nextCursor
            }
        });
    } catch (error) {
        console.error("Error retrieving player list:", error);
        return InternalServerErrorResponse;
    }
}

export async function handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {
    const queryParams = event.queryStringParameters || {};
    return await listPlayers(queryParams as Record<string, string>)
}

