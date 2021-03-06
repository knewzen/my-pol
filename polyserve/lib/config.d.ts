import { ServerOptions } from './start_server';
/**
 * Determines the package name by reading from the following sources:
 *
 * 1. `options.packageName`
 * 2. bower.json, if options.npm is not true
 * 3. package.json
 * 4. The name of the root directory
 */
export declare function getPackageName(options: ServerOptions): any;
export declare function getComponentDir(options: ServerOptions): string;
