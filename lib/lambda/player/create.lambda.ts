import { APIGatewayProxyEvent } from "aws-lambda";
import { asApiResponse, Player, PlayerCreateSchema } from "../../types/player";
import {
    SuccessResponse,
    Response,
    BadRequestResponse,
    InternalServerErrorResponse,
} from "../../utils/responses";
import { insertPlayer, retrievePlayer } from "../../model/player";
import { computeIMC, computeRatio } from "../../utils/stat";
import { generateUniqueId } from "../../utils/lib";


export async function addPlayer(body: string | null): Promise<Response> {
    try {
        let player: Player;
        try {
            const result = PlayerCreateSchema.safeParse(JSON.parse(body || ''))
            if (!result.success) {
                console.warn('Invalid request body received:', result.error.format());
                return BadRequestResponse("Invalid request body");
            }
            const { data } = result.data;

            player = {
                id: generateUniqueId(result.data.firstname, result.data.lastname),
                ...result.data,
                data: {
                    ...data,
                    imc: computeIMC(data.weight / 1000, data.height / 100),
                    total: data.last.length,
                    win: data.last.filter(game => game === 1).length,
                }
            };

        } catch (error) {
            console.error("Error parsing request body:", error);
            return BadRequestResponse("Invalid request body");
        }
        const result = await insertPlayer(player);

        if (!result) {
            console.warn('Player with the same ID already exists:', player.id);
            return BadRequestResponse(`Player with ID ${player.id} already exists`);
        }
        return SuccessResponse(asApiResponse(result as Player));
    }
    catch (error) {
        console.error("Error creating player:", error);
        return InternalServerErrorResponse;
    }

}
export async function handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {
    console.log('Create player handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });
    const { body } = event;
    return addPlayer(body);
}
