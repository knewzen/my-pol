import { ProjectBuildOptions } from './builds';
export { ProjectBuildOptions, applyBuildPreset } from './builds';
/**
 * The default globs for matching all user application source files.
 */
export declare const defaultSourceGlobs: string[];
export interface LintOptions {
    /**
     * The lint rules to run. Can be the code of a collection of rules like
     * "polymer-2" or an individual rule like "dom-module-invalid-attrs".
     */
    rules: string[];
    /**
     * Warnings to ignore. After the rules are run, any warning that matches
     * one of these codes is ignored, project-wide.
     */
    warningsToIgnore?: string[];
    /**
     * Deprecated way of spelling the `warningsToIgnore` lint option.
     *
     * Used only if `warningsToIgnore` is not specified.
     */
    ignoreWarnings?: string[];
    /**
     * An array of file globs to never report warnings for.
     *
     * The globs follow [minimatch] syntax, and any file that matches any
     * of the listed globs will never show any linter warnings. This will
     * typically not have a performance benefit, as the file will usually
     * still need to be analyzed.
     *
     * [minimatch]: https://github.com/isaacs/minimatch
     */
    filesToIgnore?: string[];
}
export interface ProjectOptions {
    /**
     * Path to the root of the project on the filesystem. This can be an absolute
     * path, or a path relative to the current working directory. Defaults to the
     * current working directory of the process.
     */
    root?: string;
    /**
     * The path relative to `root` of the entrypoint file that will be served for
     * app-shell style projects. Usually this is index.html.
     */
    entrypoint?: string;
    /**
     * The path relative to `root` of the app shell element.
     */
    shell?: string;
    /**
     * The path relative to `root` of the lazily loaded fragments. Usually the
     * pages of an app or other bundles of on-demand resources.
     */
    fragments?: string[];
    /**
     * List of glob patterns, relative to root, of this project's sources to read
     * from the file system.
     */
    sources?: string[];
    /**
     * List of file paths, relative to the project directory, that should be
     * included as extraDependencies in the build target.
     */
    extraDependencies?: string[];
    /**
     * List of build option configurations.
     */
    builds?: ProjectBuildOptions[];
    /**
     * Options for the Polymer Linter.
     */
    lint?: LintOptions;
}
export declare class ProjectConfig {
    readonly root: string;
    readonly entrypoint: string;
    readonly shell?: string;
    readonly fragments: string[];
    readonly sources: string[];
    readonly extraDependencies: string[];
    readonly builds: ProjectBuildOptions[];
    readonly allFragments: string[];
    readonly lint: LintOptions | undefined;
    /**
     * Given an absolute file path to a polymer.json-like ProjectOptions object,
     * read that file. If no file exists, null is returned. If the file exists
     * but there is a problem reading or parsing it, throw an exception.
     *
     * TODO: in the next major version we should make this method and the one
     *     below async.
     */
    static loadOptionsFromFile(filepath: string): ProjectOptions | null;
    /**
     * Given an absolute file path to a polymer.json-like ProjectOptions object,
     * return a new ProjectConfig instance created with those options.
     */
    static loadConfigFromFile(filepath: string): ProjectConfig | null;
    /**
     * Returns the given configJsonObject if it is a valid ProjectOptions object,
     * otherwise throws an informative error message.
     */
    static validateOptions(configJsonObject: {}): ProjectOptions;
    /**
     * Returns a new ProjectConfig from the given JSON object if it's valid.
     *
     * TODO(rictic): For the next major version we should mark the constructor
     * private, or perhaps make it validating. Also, we should standardize the
     * naming scheme across the static methods on this class.
     *
     * Throws if the given JSON object is an invalid ProjectOptions.
     */
    static validateAndCreate(configJsonObject: {}): ProjectConfig;
    /**
     * constructor - given a ProjectOptions object, create the correct project
     * configuration for those options. This involves setting the correct
     * defaults, validating options, warning on deprecated options, and
     * calculating some additional properties.
     */
    constructor(options: ProjectOptions);
    isFragment(filepath: string): boolean;
    isShell(filepath: string): boolean;
    isSource(filepath: string): boolean;
    /**
     * Validates that a configuration is accurate, and that all paths are
     * contained within the project root.
     */
    validate(): boolean;
    /**
     * Generate a JSON string serialization of this configuration. File paths
     * will be relative to root.
     */
    toJSON(): string;
}
