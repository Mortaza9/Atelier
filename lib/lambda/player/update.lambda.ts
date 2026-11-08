import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, NotFoundResponse, InternalServerErrorResponse, BadRequestResponse } from "../../utils/responses";
import { updatePlayer } from "../../model/player";
import { asApiResponse, Player, PlayerUpdateSchema, PlayerPartial } from "../../types/player";
import { computeIMC } from "../../utils/stat";

export async function doUpdatePlayer(
    playerId: string | undefined,
    body: string | null): Promise<Response> {
    try {
        if (!playerId) {
            console.warn('Player ID missing in request path parameters');
            return BadRequestResponse("Player ID is required");
        }
        let result;
        try {
            result = PlayerUpdateSchema.safeParse(JSON.parse(body || ''))
        } catch (error) {
            console.error("Error parsing request body:", error);
            return BadRequestResponse("Invalid request body");
        }
        if (!result.success) {
            console.warn('Invalid request body received:', result.error.format());
            return BadRequestResponse("Invalid request body");
        }
        const { data } = result.data;
        const player: PlayerPartial = {
            ...result.data,
            id: playerId,
            data: {
                ...data,
                imc: data?.weight && data?.height ? computeIMC(data.weight, data.height) : undefined,
                total: data?.last?.length,
                win: data?.last?.filter(game => game === 1)?.length,
            }
        };
        const updatedPlayer = await updatePlayer(playerId, player);
        if (!updatedPlayer) {
            console.warn(`Player with ID ${playerId} not found`);
            return NotFoundResponse(
                `Player with ID ${playerId} not found`
            );
        }
        return SuccessResponse(asApiResponse(updatedPlayer));
    } catch (error) {
        console.error("Error retrieving player:", error);
        return InternalServerErrorResponse;
    }
}

export async function handler(
    event: APIGatewayProxyEvent,
    context: any
): Promise<Response> {
    console.log('update player handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });
    const playerId = event.pathParameters?.playerId;
    const { body } = event;
    return await doUpdatePlayer(playerId, body)
}