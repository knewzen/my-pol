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
const path = require("path");
const analyzer_1 = require("../core/analyzer");
const css_custom_property_scanner_1 = require("../css/css-custom-property-scanner");
const css_parser_1 = require("../css/css-parser");
const html_element_reference_scanner_1 = require("../html/html-element-reference-scanner");
const html_import_scanner_1 = require("../html/html-import-scanner");
const html_parser_1 = require("../html/html-parser");
const html_script_scanner_1 = require("../html/html-script-scanner");
const html_style_scanner_1 = require("../html/html-style-scanner");
const class_scanner_1 = require("../javascript/class-scanner");
const function_scanner_1 = require("../javascript/function-scanner");
const javascript_import_scanner_1 = require("../javascript/javascript-import-scanner");
const javascript_parser_1 = require("../javascript/javascript-parser");
const namespace_scanner_1 = require("../javascript/namespace-scanner");
const json_parser_1 = require("../json/json-parser");
const model_1 = require("../model/model");
const behavior_scanner_1 = require("../polymer/behavior-scanner");
const css_import_scanner_1 = require("../polymer/css-import-scanner");
const dom_module_scanner_1 = require("../polymer/dom-module-scanner");
const polymer_core_feature_scanner_1 = require("../polymer/polymer-core-feature-scanner");
const polymer_element_scanner_1 = require("../polymer/polymer-element-scanner");
const pseudo_element_scanner_1 = require("../polymer/pseudo-element-scanner");
const scan_1 = require("../scanning/scan");
const package_url_resolver_1 = require("../url-loader/package-url-resolver");
const analysis_cache_1 = require("./analysis-cache");
/**
 * An analysis of a set of files at a specific point-in-time with respect to
 * updates to those files. New files can be added to an existing context, but
 * updates to files will cause a fork of the context with new analysis results.
 *
 * All file contents and analysis results are consistent within a single
 * anaysis context. A context is forked via either the fileChanged or
 * clearCaches methods.
 *
 * For almost all purposes this is an entirely internal implementation detail.
 * An Analyzer instance has a reference to its current context, so it will
 * appear to be statefull with respect to file updates.
 */
class AnalysisContext {
    constructor(options, cache, generation) {
        this.parsers = new Map([
            ['html', new html_parser_1.HtmlParser()],
            ['js', new javascript_parser_1.JavaScriptParser()],
            ['css', new css_parser_1.CssParser()],
            ['json', new json_parser_1.JsonParser()],
        ]);
        this._languageAnalyzers = new Map([]);
        this.loader = options.urlLoader;
        this.resolver = options.urlResolver || new package_url_resolver_1.PackageUrlResolver();
        this.parsers = options.parsers || this.parsers;
        this._lazyEdges = options.lazyEdges;
        this._scanners = options.scanners ||
            AnalysisContext._getDefaultScanners(this._lazyEdges);
        this._cache = cache || new analysis_cache_1.AnalysisCache();
        this._generation = generation || 0;
    }
    static _getDefaultScanners(lazyEdges) {
        return new Map([
            [
                'html',
                [
                    new html_import_scanner_1.HtmlImportScanner(lazyEdges),
                    new html_script_scanner_1.HtmlScriptScanner(),
                    new html_style_scanner_1.HtmlStyleScanner(),
                    new dom_module_scanner_1.DomModuleScanner(),
                    new css_import_scanner_1.CssImportScanner(),
                    new html_element_reference_scanner_1.HtmlCustomElementReferenceScanner(),
                    new pseudo_element_scanner_1.PseudoElementScanner(),
                ]
            ],
            [
                'js',
                [
                    new polymer_element_scanner_1.PolymerElementScanner(),
                    new polymer_core_feature_scanner_1.PolymerCoreFeatureScanner(),
                    new behavior_scanner_1.BehaviorScanner(),
                    new namespace_scanner_1.NamespaceScanner(),
                    new function_scanner_1.FunctionScanner(),
                    new class_scanner_1.ClassScanner(),
                    new javascript_import_scanner_1.JavaScriptImportScanner()
                ]
            ],
            ['css', [new css_custom_property_scanner_1.CssCustomPropertyScanner()]]
        ]);
    }
    /**
     * Returns a copy of this cache context with proper cache invalidation.
     */
    filesChanged(urls) {
        const newCache = this._cache.invalidate(urls.map((url) => this.resolveUrl(url)));
        return this._fork(newCache);
    }
    /**
     * Implements Analyzer#analyze, see its docs.
     */
    analyze(urls) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolvedUrls = urls.map((url) => this.resolveUrl(url));
            // 1. Await current analysis if there is one, so we can check to see if has
            // all of the requested URLs.
            yield this._analysisComplete;
            // 2. Check to see if we have all of the requested documents
            const hasAllDocuments = resolvedUrls.every((url) => this._cache.analyzedDocuments.get(url) != null);
            if (hasAllDocuments) {
                // all requested URLs are present, return the existing context
                return this;
            }
            // 3. Some URLs are new, so fork, but don't invalidate anything
            const newCache = this._cache.invalidate([]);
            const newContext = this._fork(newCache);
            return newContext._analyze(resolvedUrls);
        });
    }
    /**
     * Internal analysis method called when we know we need to fork.
     */
    _analyze(resolvedUrls) {
        return __awaiter(this, void 0, void 0, function* () {
            const analysisComplete = (() => __awaiter(this, void 0, void 0, function* () {
                // 1. Load and scan all root documents
                const scannedDocumentsOrWarnings = yield Promise.all(resolvedUrls.map((url) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const scannedResult = yield this.scan(url);
                        this._cache.failedDocuments.delete(url);
                        return scannedResult;
                    }
                    catch (e) {
                        if (e instanceof model_1.WarningCarryingException) {
                            this._cache.failedDocuments.set(url, e.warning);
                        }
                        // No need for fallback warning, one will be produced in
                        // getDocument
                    }
                })));
                const scannedDocuments = scannedDocumentsOrWarnings.filter((d) => d != null);
                // 2. Run per-document resolution
                const documents = scannedDocuments.map((d) => this.getDocument(d.url));
                // TODO(justinfagnani): instead of the above steps, do:
                // 1. Load and run prescanners
                // 2. Run global analyzers (_languageAnalyzers now, but it doesn't need to
                // be
                //    separated by file type)
                // 3. Run per-document scanners and resolvers
                return documents;
            }))();
            this._analysisComplete = analysisComplete.then((_) => { });
            yield this._analysisComplete;
            return this;
        });
    }
    /**
     * Gets an analyzed Document from the document cache. This is only useful for
     * Analyzer plugins. You almost certainly want to use `analyze()` instead.
     *
     * If a document has been analyzed, it returns the analyzed Document. If not
     * the scanned document cache is used and a new analyzed Document is returned.
     * If a file is in neither cache, it returns `undefined`.
     */
    getDocument(resolvedUrl) {
        const cachedWarning = this._cache.failedDocuments.get(resolvedUrl);
        if (cachedWarning) {
            return cachedWarning;
        }
        const cachedResult = this._cache.analyzedDocuments.get(resolvedUrl);
        if (cachedResult) {
            return cachedResult;
        }
        const scannedDocument = this._cache.scannedDocuments.get(resolvedUrl);
        if (!scannedDocument) {
            return {
                sourceRange: {
                    file: resolvedUrl,
                    start: { line: 0, column: 0 },
                    end: { line: 0, column: 0 }
                },
                code: 'unable-to-analyze',
                message: `Document not found: ${resolvedUrl}`,
                severity: model_1.Severity.ERROR
            };
        }
        const extension = path.extname(resolvedUrl).substring(1);
        const languageAnalyzer = this._languageAnalyzers.get(extension);
        let analysisResult;
        if (languageAnalyzer) {
            analysisResult = languageAnalyzer.analyze(scannedDocument.url);
        }
        const document = new model_1.Document(scannedDocument, this, analysisResult);
        this._cache.analyzedDocuments.set(resolvedUrl, document);
        this._cache.analyzedDocumentPromises.getOrCompute(resolvedUrl, () => __awaiter(this, void 0, void 0, function* () { return document; }));
        document.resolve();
        return document;
    }
    /**
     * This is only useful for Analyzer plugins.
     *
     * If a url has been scanned, returns the ScannedDocument.
     */
    _getScannedDocument(resolvedUrl) {
        return this._cache.scannedDocuments.get(resolvedUrl);
    }
    /**
     * Clear all cached information from this analyzer instance.
     *
     * Note: if at all possible, instead tell the analyzer about the specific
     * files that changed rather than clearing caches like this. Caching provides
     * large performance gains.
     */
    clearCaches() {
        return this._fork(new analysis_cache_1.AnalysisCache());
    }
    /**
     * Returns a copy of the context but with optional replacements of cache or
     * constructor options.
     *
     * Note: this feature is experimental.
     */
    _fork(cache, options) {
        const contextOptions = {
            lazyEdges: this._lazyEdges,
            parsers: this.parsers,
            scanners: this._scanners,
            urlLoader: this.loader,
            urlResolver: this.resolver,
        };
        if (options && options.urlLoader) {
            contextOptions.urlLoader = options.urlLoader;
        }
        if (!cache) {
            cache = this._cache.invalidate([]);
        }
        const copy = new AnalysisContext(contextOptions, cache, this._generation + 1);
        return copy;
    }
    /**
     * Scans a file locally, that is for features that do not depend
     * on this files imports. Local features can be cached even when
     * imports are invalidated. This method does not trigger transitive
     * scanning, _scan() does that.
     *
     * TODO(justinfagnani): consider renaming this to something like
     * _preScan, since about the only useful things it can find are
     * imports, exports and other syntactic structures.
     */
    _scanLocal(resolvedUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._cache.scannedDocumentPromises.getOrCompute(resolvedUrl, () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const parsedDoc = yield this._parse(resolvedUrl);
                    const scannedDocument = yield this._scanDocument(parsedDoc);
                    const imports = scannedDocument.getNestedFeatures().filter((e) => e instanceof model_1.ScannedImport);
                    // Update dependency graph
                    const importUrls = imports.map((i) => this.resolveUrl(i.url));
                    this._cache.dependencyGraph.addDocument(resolvedUrl, importUrls);
                    return scannedDocument;
                }
                catch (e) {
                    this._cache.dependencyGraph.rejectDocument(resolvedUrl, e);
                    throw e;
                }
            }));
        });
    }
    /**
     * Scan a toplevel document and all of its transitive dependencies.
     */
    scan(resolvedUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._cache.dependenciesScannedPromises.getOrCompute(resolvedUrl, () => __awaiter(this, void 0, void 0, function* () {
                const scannedDocument = yield this._scanLocal(resolvedUrl);
                const imports = scannedDocument.getNestedFeatures().filter((e) => e instanceof model_1.ScannedImport);
                // Scan imports
                for (const scannedImport of imports) {
                    const importUrl = this.resolveUrl(scannedImport.url);
                    // Request a scan of `importUrl` but do not wait for the results to
                    // avoid deadlock in the case of cycles. Later we use the
                    // DependencyGraph to wait for all transitive dependencies to load.
                    this.scan(importUrl).catch((error) => {
                        scannedImport.error = error || '';
                    });
                }
                yield this._cache.dependencyGraph.whenReady(resolvedUrl);
                return scannedDocument;
            }));
        });
    }
    /**
     * Scans a ParsedDocument.
     */
    _scanDocument(document, maybeAttachedComment, maybeContainingDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const { features: scannedFeatures, warnings } = yield this._getScannedFeatures(document);
            // If there's an HTML comment that applies to this document then we assume
            // that it applies to the first feature.
            const firstScannedFeature = scannedFeatures[0];
            if (firstScannedFeature && firstScannedFeature instanceof model_1.ScannedElement) {
                firstScannedFeature.applyHtmlComment(maybeAttachedComment, maybeContainingDocument);
            }
            const scannedDocument = new model_1.ScannedDocument(document, scannedFeatures, warnings);
            if (!scannedDocument.isInline) {
                if (this._cache.scannedDocuments.has(scannedDocument.url)) {
                    throw new Error('Scanned document already in cache. This should never happen.');
                }
                this._cache.scannedDocuments.set(scannedDocument.url, scannedDocument);
            }
            yield this._scanInlineDocuments(scannedDocument);
            return scannedDocument;
        });
    }
    _getScannedFeatures(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const scanners = this._scanners.get(document.type);
            if (scanners) {
                return scan_1.scan(document, scanners);
            }
            return { features: [], warnings: [] };
        });
    }
    _scanInlineDocuments(containingDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const feature of containingDocument.features) {
                if (!(feature instanceof model_1.ScannedInlineDocument)) {
                    continue;
                }
                const locationOffset = {
                    line: feature.locationOffset.line,
                    col: feature.locationOffset.col,
                    filename: containingDocument.url
                };
                try {
                    const parsedDoc = this._parseContents(feature.type, feature.contents, containingDocument.url, { locationOffset, astNode: feature.astNode });
                    const scannedDoc = yield this._scanDocument(parsedDoc, feature.attachedComment, containingDocument.document);
                    feature.scannedDocument = scannedDoc;
                }
                catch (err) {
                    if (err instanceof model_1.WarningCarryingException) {
                        containingDocument.warnings.push(err.warning);
                        continue;
                    }
                    throw err;
                }
            }
        });
    }
    /**
     * Returns `true` if the provided resolved URL can be loaded.  Obeys the
     * semantics defined by `UrlLoader` and should only be used to check
     * resolved URLs.
     */
    canLoad(resolvedUrl) {
        return this.loader.canLoad(resolvedUrl);
    }
    /**
     * Loads the content at the provided resolved URL.  Obeys the semantics
     * defined by `UrlLoader` and should only be used to attempt to load resolved
     * URLs.
     *
     * Currently does no caching. If the provided contents are given then they
     * are used instead of hitting the UrlLoader (e.g. when you have in-memory
     * contents that should override disk).
     */
    load(resolvedUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canLoad(resolvedUrl)) {
                throw new Error(`Can't load URL: ${resolvedUrl}`);
            }
            return yield this.loader.load(resolvedUrl);
        });
    }
    /**
     * Caching + loading wrapper around _parseContents.
     */
    _parse(resolvedUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._cache.parsedDocumentPromises.getOrCompute(resolvedUrl, () => __awaiter(this, void 0, void 0, function* () {
                const content = yield this.load(resolvedUrl);
                const extension = path.extname(resolvedUrl).substring(1);
                return this._parseContents(extension, content, resolvedUrl);
            }));
        });
    }
    /**
     * Parse the given string into the Abstract Syntax Tree (AST) corresponding
     * to its type.
     */
    _parseContents(type, contents, url, inlineInfo) {
        const parser = this.parsers.get(type);
        if (parser == null) {
            throw new analyzer_1.NoKnownParserError(`No parser for for file type ${type}`);
        }
        try {
            return parser.parse(contents, url, inlineInfo);
        }
        catch (error) {
            if (error instanceof model_1.WarningCarryingException) {
                throw error;
            }
            throw new Error(`Error parsing ${url}:\n ${error.stack}`);
        }
    }
    /**
     * Returns true if the url given is resovable by the Analyzer's `UrlResolver`.
     */
    canResolveUrl(url) {
        return this.resolver.canResolve(url);
    }
    /**
     * Resolves a URL with this Analyzer's `UrlResolver` or returns the given
     * URL if it can not be resolved.
     */
    resolveUrl(url) {
        return this.resolver.canResolve(url) ? this.resolver.resolve(url) :
            url;
    }
}
exports.AnalysisContext = AnalysisContext;

//# sourceMappingURL=analysis-context.js.map
