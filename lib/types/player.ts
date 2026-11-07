import z from "zod";

export interface Player {
    id: string;
    firstname: string;
    lastname: string;
    shortname: string;
    sex: string;
    country: {
        picture: string;
        code: string;
    };
    picture: string;
    data: {
        rank: number;
        points: number;
        weight: number;
        height: number;
        age: number;
        last: number[];
        win: number;
        total: number;
        imc: number;
    }
}

export type PlayerPartial = Partial<Omit<Player, "data">> & {
    data: Partial<Player["data"]>;
};

export const PlayerCreateSchema = z.object({
    firstname: z.string(),
    lastname: z.string(),
    shortname: z.string(),
    sex: z.string().length(1),
    country: z.object({
        picture: z.string(),
        code: z.string().length(3),
    }),
    picture: z.string(),
    data: z.object({
        rank: z.number().int().nonnegative(),
        points: z.number().int().nonnegative(),
        weight: z.number().positive(),
        height: z.number().positive(),
        age: z.number().int().nonnegative(),
        last: z.array(z.union([z.literal(0), z.literal(1)])),
    })
});

export const PlayerUpdateSchema = PlayerCreateSchema
    .omit({ firstname: true, lastname: true })
    .partial()
    .extend({ data: PlayerCreateSchema.shape.data.partial().optional() })
    .strict();

export function asApiResponse(
    player: Player
): Omit<Player, "data"> & { data: Omit<Player["data"], "imc" | "win" | "total"> } {
    const { data, ...rest } = player;
    const { imc, win, total, ...restData } = data;
    return {
        ...rest,
        data: {
            ...restData,
        }
    };
}