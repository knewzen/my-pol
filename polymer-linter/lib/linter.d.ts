/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import './collections';
import { Analysis, Analyzer, Warning } from 'polymer-analyzer';
import { Rule } from './rule';
export { registry } from './registry';
export { Rule, RuleCollection } from './rule';
/**
 * The Linter is a simple class which groups together a set of Rules and applies
 * them to a set of file urls which can be resolved and loaded by the provided
 * Analyzer.  A default Analyzer is prepared if one is not provided.
 */
export declare class Linter {
    private _analyzer;
    private _rules;
    constructor(rules: Iterable<Rule>, analyzer: Analyzer);
    /**
     * Given an array of filenames, lint the files and return an array of all
     * warnings produced evaluating the linter rules.
     */
    lint(files: string[]): Promise<LintResult>;
    lintPackage(): Promise<LintResult>;
    private _lintDocuments(documents);
    private _analyzeAll(files);
    private _getWarningFromError(parsedDocument, e, file, code, message);
}
/**
 * We want to return both the warnings and the immutable analysis we used as
 * its basis. This is slightly hacky, but it has better back-compat.
 *
 * Fix with the next major version.
 */
export interface LintResult extends ReadonlyArray<Warning> {
    readonly analysis: Analysis;
}
