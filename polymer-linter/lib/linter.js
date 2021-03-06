"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./collections");
const polymer_analyzer_1 = require("polymer-analyzer");
var registry_1 = require("./registry");
exports.registry = registry_1.registry;
var rule_1 = require("./rule");
exports.Rule = rule_1.Rule;
exports.RuleCollection = rule_1.RuleCollection;
/**
 * The Linter is a simple class which groups together a set of Rules and applies
 * them to a set of file urls which can be resolved and loaded by the provided
 * Analyzer.  A default Analyzer is prepared if one is not provided.
 */
class Linter {
    constructor(rules, analyzer) {
        this._analyzer = analyzer;
        this._rules = Array.from(rules);
    }
    /**
     * Given an array of filenames, lint the files and return an array of all
     * warnings produced evaluating the linter rules.
     */
    lint(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const { documents, warnings, analysis } = yield this._analyzeAll(files);
            for (const document of documents) {
                warnings.push(...document.getWarnings());
            }
            return makeLintResult(warnings.concat(...yield this._lintDocuments(documents)), analysis);
        });
    }
    lintPackage() {
        return __awaiter(this, void 0, void 0, function* () {
            const analysis = yield this._analyzer.analyzePackage();
            const warnings = analysis.getWarnings();
            warnings.push(...yield this._lintDocuments(analysis.getFeatures({ kind: 'document' })));
            return makeLintResult(warnings, analysis);
        });
    }
    _lintDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            for (const document of documents) {
                if (document.isInline) {
                    // We lint the toplevel documents. If a rule wants to check inline
                    // documents, it can. getFeatures makes that pretty easy.
                    continue;
                }
                for (const rule of this._rules) {
                    try {
                        warnings.push(...yield rule.cachedCheck(document));
                    }
                    catch (e) {
                        warnings.push(this._getWarningFromError(document.parsedDocument, e, document.url, 'internal-lint-error', `Internal error during linting: ${e ? e.message : e}`));
                    }
                }
            }
            return warnings;
        });
    }
    _analyzeAll(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const analysis = yield this._analyzer.analyze(files);
            const documents = [];
            const warnings = [];
            for (const file of files) {
                const result = analysis.getDocument(this._analyzer.resolveUrl(file));
                if (!result) {
                    continue;
                }
                else if (result instanceof polymer_analyzer_1.Document) {
                    documents.push(result);
                }
                else {
                    warnings.push(result);
                }
            }
            return { documents, warnings, analysis };
        });
    }
    _getWarningFromError(parsedDocument, e, file, code, message) {
        if (e instanceof polymer_analyzer_1.WarningCarryingException) {
            return e.warning;
        }
        return new polymer_analyzer_1.Warning({
            parsedDocument,
            code,
            message,
            severity: polymer_analyzer_1.Severity.WARNING,
            sourceRange: { file, start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }
        });
    }
}
exports.Linter = Linter;
function makeLintResult(warnings, analysis) {
    const result = warnings;
    Object.defineProperty(result, 'analysis', { enumerable: false, writable: false, value: analysis });
    return result;
}
//# sourceMappingURL=linter.js.map