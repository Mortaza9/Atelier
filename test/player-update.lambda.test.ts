import { updatePlayer } from "../lib/model/player";
import { doUpdatePlayer, handler } from "../lib/lambda/player/update.lambda";
import { Player } from "../lib/types/player";

jest.mock("../lib/model/player", () => ({
    updatePlayer: jest.fn(),
}));

const updateRequest = {
    data: { weight: 80, height: 2, last: [1, 0, 1] },
};

const updatedPlayer: Player = {
    id: "player-update-test",
    firstname: "Ada",
    lastname: "Lovelace",
    shortname: "A. Lovelace",
    sex: "F",
    country: { picture: "gb.png", code: "GBR" },
    picture: "ada.png",
    data: {
        rank: 1,
        points: 100,
        weight: 80,
        height: 2,
        age: 36,
        last: [1, 0, 1],
        imc: 20,
        total: 3,
        win: 2,
    },
};

describe("update player Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("requires a player ID and valid JSON matching the update schema", async () => {
        expect((await doUpdatePlayer(undefined, JSON.stringify(updateRequest))).statusCode).toBe(400);
        expect((await doUpdatePlayer("player-update-test", "not-json")).statusCode).toBe(400);
        expect((await doUpdatePlayer("player-update-test", JSON.stringify({ unknown: true }))).statusCode).toBe(400);
        expect(updatePlayer).not.toHaveBeenCalled();
    });

    it("updates a player and derives data statistics", async () => {
        jest.mocked(updatePlayer).mockResolvedValue(updatedPlayer);

        const response = await handler(
            {
                pathParameters: { playerId: updatedPlayer.id },
                body: JSON.stringify(updateRequest),
            } as never,
            {} as never,
        );

        expect(response.statusCode).toBe(200);
        expect(updatePlayer).toHaveBeenCalledWith(updatedPlayer.id, {
            id: updatedPlayer.id,
            data: { ...updateRequest.data, imc: 20, total: 3, win: 2 },
        });
        expect(JSON.parse(response.body).data).not.toHaveProperty("win");
    });

    it("returns not found when the player does not exist", async () => {
        jest.mocked(updatePlayer).mockResolvedValue(undefined);

        const response = await doUpdatePlayer("missing-player-update-test", JSON.stringify(updateRequest));

        expect(response.statusCode).toBe(404);
    });

    it("returns an internal server error when updating fails", async () => {
        jest.mocked(updatePlayer).mockRejectedValue(new Error("database unavailable"));

        await expect(doUpdatePlayer("player-update-test", JSON.stringify(updateRequest)))
            .resolves.toMatchObject({ statusCode: 500 });
    });
});