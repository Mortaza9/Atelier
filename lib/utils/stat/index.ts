export const computeIMC = (weight: number, height: number): number => {
    if (height <= 0) {
        throw new Error("Height must be greater than zero.");
    }
    return (weight / (height * height));
};

export const computeRatio = (last: number[]): number => {
    return last.filter(x => x === 1).length / last.length;
}