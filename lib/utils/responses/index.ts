
export interface Response {
    statusCode: number;
    body: string;
}

const responses = {
    success: (data: any) => {
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    },
    error: (message: string, statusCode: number = 500) => {
        return {
            statusCode,
            body: JSON.stringify({ message }),
        };
    },
};

export const InternalServerErrorResponse = responses.error("Internal Server Error", 500);
export const BadRequestResponse = (message: string) => responses.error(`message: ${message}`, 400);
export const NotFoundResponse = (message: string) => responses.error(`message: ${message}`, 404);
export const SuccessResponse = (data: any) => responses.success(data);
export const ForbiddenResponse = (message: string) => responses.error(`message: ${message}`, 403);
export const UnauthorizedResponse = (message: string) => responses.error(`message: ${message}`, 401);