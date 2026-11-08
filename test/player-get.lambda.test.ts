import { retrievePlayer } from "../lib/model/player";
import { getPlayer, handler } from "../lib/lambda/player/get.lambda";
import { Player } from "../lib/types/player";

jest.mock("../lib/model/player", () => ({
    retrievePlayer: jest.fn(),
}));

const player: Player = {
    id: "player-get-test",
    firstname: "Ada",
    lastname: "Lovelace",
    shortname: "A. Lovelace",
    sex: "F",
    country: { picture: "gb.png", code: "GBR" },
    picture: "ada.png",
    data: {
        rank: 1,
        points: 100,
        weight: 70,
        height: 175,
        age: 36,
        last: [1, 0],
        imc: 22.8,
        total: 2,
        win: 1,
    },
};

describe("get player Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("requires a player ID", async () => {
        const response = await handler({ pathParameters: null } as never, {} as never);

        expect(response.statusCode).toBe(400);
        expect(retrievePlayer).not.toHaveBeenCalled();
    });

    it("returns not found when the player does not exist", async () => {
        jest.mocked(retrievePlayer).mockResolvedValue(undefined);

        const response = await getPlayer("missing-player-get-test");

        expect(response.statusCode).toBe(404);
    });

    it("returns an internal server error when retrieval fails", async () => {
        jest.mocked(retrievePlayer).mockRejectedValue(new Error("database unavailable"));

        await expect(getPlayer("player-error-test")).resolves.toMatchObject({ statusCode: 500 });
    });
});