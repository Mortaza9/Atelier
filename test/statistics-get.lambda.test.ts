import { getStats } from "../lib/model/statistics";
import { getStatistics, handler } from "../lib/lambda/statistics/get.lambda";

jest.mock("../lib/model/statistics", () => ({
    getStats: jest.fn(),
}));

describe("get statistics Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns the statistics from the model", async () => {
        const statistics = { country: "GBR", avgImc: 22.5, medianHeight: 175 };
        jest.mocked(getStats).mockResolvedValue(statistics);

        const response = await handler({} as never, {} as never);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(statistics);
        expect(getStats).toHaveBeenCalledTimes(1);
    });

    it("returns an internal server error when retrieving statistics fails", async () => {
        jest.mocked(getStats).mockRejectedValue(new Error("database unavailable"));
        await expect(getStatistics()).resolves.toMatchObject({ statusCode: 500 });
    });
});