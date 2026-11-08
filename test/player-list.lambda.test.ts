import { listPlayersOrderByRank } from "../lib/model/player";
import { handler, listPlayers } from "../lib/lambda/player/list.lambda";
import { Player } from "../lib/types/player";

jest.mock("../lib/model/player", () => ({
    listPlayersOrderByRank: jest.fn(),
}));

const player: Player = {
    id: "player-list-test",
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
        last: [1],
        imc: 22.8,
        total: 1,
        win: 1,
    },
};

describe("list players Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("uses defaults and returns players with API-safe data", async () => {
        jest.mocked(listPlayersOrderByRank).mockResolvedValue({ players: [player], nextCursor: null });

        const response = await handler({ queryStringParameters: null } as never, {} as never);

        expect(listPlayersOrderByRank).toHaveBeenCalledWith(50, undefined, undefined);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toMatchObject({
            message: "Player list retrieved successfully",
            data: {
                count: 1,
                players: [{ id: player.id, data: { rank: 1, last: [1] } }],
                nextCursor: null,
            },
        });
        expect(JSON.parse(response.body).data.players[0].data).not.toHaveProperty("imc");
    });

    it("passes limit, cursor, and sex filters to the model", async () => {
        jest.mocked(listPlayersOrderByRank).mockResolvedValue({ players: [], nextCursor: 12 });

        await listPlayers({ limit: "10", cursor: "5", sex: "F" });

        expect(listPlayersOrderByRank).toHaveBeenCalledWith(10, 5, "F");
    });

    it("returns an internal server error when listing fails", async () => {
        jest.mocked(listPlayersOrderByRank).mockRejectedValue(new Error("database unavailable"));

        await expect(listPlayers({})).resolves.toMatchObject({ statusCode: 500 });
    });
});