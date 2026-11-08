import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, NotFoundResponse, InternalServerErrorResponse, BadRequestResponse } from "../../utils/responses";
import { retrievePlayer } from "../../model/player";
import { asApiResponse, Player } from "../../types/player";



export async function getPlayer(playerId: string | undefined): Promise<Response> {
    try {
        if (!playerId) {
            console.warn('Player ID missing in request path parameters');
            return BadRequestResponse("Player ID is required");
        }
        const player = await retrievePlayer(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} not found`);
            return NotFoundResponse(
                `Player with ID ${playerId} not found`
            );
        }
        return SuccessResponse(asApiResponse(player));
    } catch (error) {
        console.error("Error retrieving player:", error);
        return InternalServerErrorResponse;
    }
}

export async function handler(
    event: APIGatewayProxyEvent,
    context: any
): Promise<Response> {
    console.log('Get player handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });
    const playerId = event.pathParameters?.playerId;
    return await getPlayer(playerId);
}