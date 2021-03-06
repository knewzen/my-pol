/**
 * A utility for more easily writing long strings inline in code.
 *
 * Strips leading and trailing whitespace, and converts newlines followed
 * by whitespace into a single space. Use like:
 *
 *     stripWhitespace(`
 *         hello
 *         world
 *     `);
 *
 * This evaluates to "hello world".
 */
export declare function stripWhitespace(str: string): string;
/**
 * A utility for writing long multiline strings inline in code.
 *
 * Determines the initial indentation based on the first indented line,
 * and removes it from all other lines, then trims off leading and trailing
 * whitespace. Use like:
 *
 *     stripIndentation(`
 *         hello
 *           world
 *     `);
 *
 * This evaluates to "hello\n  world"
 */
export declare function stripIndentation(str: string): string;
export declare function minBy<T>(it: Iterable<T>, score: (t: T) => number): {
    min: T;
    minScore: number;
} | undefined;
export declare function closestSpelling(word: string, options: Iterable<string>): {
    min: string;
    minScore: number;
} | undefined;
