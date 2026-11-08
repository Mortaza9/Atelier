import { deletePlayer } from "../lib/model/player";
import { handler, removePlayer } from "../lib/lambda/player/delete.lambda";

jest.mock("../lib/model/player", () => ({
    deletePlayer: jest.fn(),
}));

describe("delete player Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("requires a player ID", async () => {
        const response = await handler({ pathParameters: null } as never, {} as never);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe("message: Player ID is required");
        expect(deletePlayer).not.toHaveBeenCalled();
    });

    it("returns not found when no player was deleted", async () => {
        jest.mocked(deletePlayer).mockResolvedValue(undefined);

        const response = await removePlayer("missing");

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).message).toContain("missing");
    });

    it("returns the deleted player ID", async () => {
        jest.mocked(deletePlayer).mockResolvedValue("player-1");

        const response = await handler({ pathParameters: { playerId: "player-1" } } as never, {} as never);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ id: "player-1" });
        expect(deletePlayer).toHaveBeenCalledWith("player-1");
    });

    it("returns an internal server error when deletion fails", async () => {
        jest.mocked(deletePlayer).mockRejectedValue(new Error("database unavailable"));

        await expect(removePlayer("player-1")).resolves.toMatchObject({ statusCode: 500 });
    });
});