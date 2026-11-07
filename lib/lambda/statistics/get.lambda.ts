import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, NotFoundResponse, InternalServerErrorResponse, BadRequestResponse } from "../../utils/responses";
import { getStats } from "../../model/statistics";

export async function handler(
    event: APIGatewayProxyEvent,
    context: any
): Promise<Response> {
    console.log('Get players statistics handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });

    try {

        const statistics = await getStats();

        console.log('stats retrieved successfully:', statistics);

        return SuccessResponse(statistics);

    } catch (error) {
        console.error("Error retrieving player:", error);

        return InternalServerErrorResponse;
    }
}