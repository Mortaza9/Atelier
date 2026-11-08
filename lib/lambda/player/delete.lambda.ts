import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, NotFoundResponse, InternalServerErrorResponse, BadRequestResponse } from "../../utils/responses";
import { deletePlayer } from "../../model/player";

export async function removePlayer(playerId: string | undefined): Promise<Response> {
    try {
        if (!playerId) {
            console.warn('Player ID missing in request path parameters');
            return BadRequestResponse("Player ID is required");
        }
        const deletedPlayerId = await deletePlayer(playerId);

        if (!deletedPlayerId) {
            console.warn(`Player with ID ${playerId} not found`);
            return NotFoundResponse(
                `Player with ID ${playerId} not found`
            );
        }
        return SuccessResponse({ id: deletedPlayerId });
    } catch (error) {
        console.error("Error deleting player:", error);
        return InternalServerErrorResponse;
    }
}

export async function handler(
    event: APIGatewayProxyEvent,
    context: any
): Promise<Response> {
    console.log('delete handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });
    const playerId = event.pathParameters?.playerId;
    return await removePlayer(playerId);
}