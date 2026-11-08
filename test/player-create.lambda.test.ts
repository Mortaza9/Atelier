import { insertPlayer } from "../lib/model/player";
import { addPlayer, handler } from "../lib/lambda/player/create.lambda";
import { generateUniqueId } from "../lib/utils/lib";

jest.mock("../lib/model/player", () => ({
    insertPlayer: jest.fn(),
    retrievePlayer: jest.fn(),
}));

const validRequest = {
    firstname: "Ada",
    lastname: "Lovelace",
    shortname: "A. Lovelace",
    sex: "F",
    country: { picture: "gb.png", code: "GBR" },
    picture: "ada.png",
    data: {
        rank: 1,
        points: 100,
        weight: 70000,
        height: 175,
        age: 36,
        last: [1, 0, 1],
    },
};
const invalidRequest = {
    firstname: "Stan",
    lastname: "Wawrinka",
    shortname: "S.WAW",
    sex: "M",
    country: {
        picture: "https://tenisu.latelier.co/resources/Suisse.png",
        code: "SUI"
    },
    picture: "https://tenisu.latelier.co/resources/Wawrinka.png",
    data: {
        rank: 21,
        points: 1784,
        weight: 81000,
        height: 0,
        age: 33,
        last: [1, 1, 1, 0, 1]
    }
}

describe("create player Lambda", () => {
    beforeEach(() => jest.clearAllMocks());

    it("creates a player, derives statistics, and omits internal fields from the response", async () => {
        const insertedPlayer = {
            id: generateUniqueId("Ada", "Lovelace"),
            ...validRequest,
            data: {
                ...validRequest.data,
                imc: 70 / (1.75 * 1.75),
                total: 3,
                win: 2,
            },
        };
        jest.mocked(insertPlayerFunction).mockResolvedValue(insertedPlayer);

        const response = await handler(
            { body: JSON.stringify(validRequest) } as never,
            {} as never,
        );

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            ...insertedPlayer,
            data: validRequest.data,
        });
        expect(insertPlayerFunction).toHaveBeenCalledWith(insertedPlayer);
    });

    it("rejects malformed or schema-invalid bodies", async () => {
        await expect(addPlayer("not-json")).resolves.toMatchObject({ statusCode: 400 });
        await expect(addPlayer(JSON.stringify({ firstname: "Ada" }))).resolves.toMatchObject({
            statusCode: 400,
        });
        await expect(addPlayer(JSON.stringify(invalidRequest))).resolves.toMatchObject({
            statusCode: 400,
        });
        expect(insertPlayerFunction).not.toHaveBeenCalled();
    });

    it("returns a bad request when the player already exists", async () => {
        jest.mocked(insertPlayerFunction).mockResolvedValue(undefined);

        const response = await addPlayer(JSON.stringify(validRequest));

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toContain("already exists");
    });

    it("returns an internal server error when persistence fails", async () => {
        jest.mocked(insertPlayerFunction).mockRejectedValue(new Error("database unavailable"));

        await expect(addPlayer(JSON.stringify(validRequest))).resolves.toMatchObject({ statusCode: 500 });
    });
});

const insertPlayerFunction = insertPlayer;