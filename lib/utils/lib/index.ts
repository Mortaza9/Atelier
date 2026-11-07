import { createHash } from "crypto";

export function generateUniqueId(first: string, last: string): string {
    return createHash("sha256").update(`${first}#${last}`).digest("hex").slice(0, 16);
}