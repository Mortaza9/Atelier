import { APIGatewayProxyEvent } from "aws-lambda";
import { SuccessResponse, Response, NotFoundResponse, InternalServerErrorResponse, BadRequestResponse } from "../../utils/responses";
import { getStats } from "../../model/statistics";

export async function getStatistics(): Promise<Response> {
    try {
        const statistics = await getStats();
        return SuccessResponse(statistics);
    } catch (error) {
        console.error("Error retrieving player:", error);
        return InternalServerErrorResponse;
    }
}

export async function handler(
    event: APIGatewayProxyEvent,
    context: any
): Promise<Response> {
    console.log('Get players statistics handler invoked', { event, context: { awsRequestId: context?.awsRequestId } });
    return await getStatistics();
}