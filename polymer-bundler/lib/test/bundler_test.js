"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
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
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/node/index.d.ts" />
/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
const chai = require("chai");
const dom5 = require("dom5");
const fs = require("fs");
const parse5 = require("parse5");
const path = require("path");
const polymer_analyzer_1 = require("polymer-analyzer");
const bundle_manifest_1 = require("../bundle-manifest");
const bundler_1 = require("../bundler");
chai.config.showDiff = true;
const assert = chai.assert;
const matchers = require('../matchers');
const preds = dom5.predicates;
// TODO(usergenic): This suite is getting very big.  Please break up the file
// and/or reorganize the suites and tests to be easier to find and reason about.
suite('Bundler', () => {
    let documentBundle;
    let bundler;
    const inputPath = 'test/html/default.html';
    function bundle(inputPath, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Don't modify options directly because test-isolation problems occur.
            const bundlerOpts = Object.assign({}, opts || {});
            if (!bundlerOpts.analyzer) {
                bundlerOpts.analyzer = new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader(path.dirname(inputPath)) });
                inputPath = path.basename(inputPath);
            }
            bundler = new bundler_1.Bundler(bundlerOpts);
            const manifest = yield bundler.generateManifest([inputPath]);
            const bundleResult = yield bundler.bundle(manifest);
            documentBundle =
                bundleResult.manifest.getBundleForFile(inputPath).bundle;
            const { documents } = bundleResult;
            return documents.get(inputPath).ast;
        });
    }
    suite('Default Options', () => {
        test('URLs for inlined HTML imports are recorded in Bundle', () => __awaiter(this, void 0, void 0, function* () {
            yield bundle(inputPath);
            assert.deepEqual([...documentBundle.inlinedHtmlImports], ['imports/simple-import.html']);
        }));
        test('imports removed', () => __awaiter(this, void 0, void 0, function* () {
            const imports = preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import'), preds.hasAttr('href'), preds.NOT(preds.hasAttrValue('type', 'css')));
            assert.equal(dom5.queryAll(yield bundle(inputPath), imports).length, 0);
        }));
        test('imports were deduplicated', () => __awaiter(this, void 0, void 0, function* () {
            assert.equal(dom5.queryAll(yield bundle(inputPath), preds.hasTagName('dom-module'))
                .length, 1);
        }));
    });
    suite('Applying strategy', () => {
        test('inlines css/scripts of html imports added by strategy', () => __awaiter(this, void 0, void 0, function* () {
            const bundler = new bundler_1.Bundler({
                inlineCss: true,
                inlineScripts: true,
                // This strategy adds a file not in the original document to the
                // bundle.
                strategy: (bundles) => {
                    bundles.forEach((b) => {
                        b.files.add('test/html/imports/external-script.html');
                        b.files.add('test/html/imports/import-linked-style.html');
                    });
                    return bundles;
                },
            });
            const manifest = yield bundler.generateManifest(['test/html/default.html']);
            const { documents } = yield bundler.bundle(manifest);
            const document = documents.get('test/html/default.html');
            assert(document);
            // Look for the script referenced in the external-script.html source.
            const scriptTags = dom5.queryAll(document.ast, preds.hasTagName('script'));
            assert.isAtLeast(scriptTags.length, 1);
            assert.include(dom5.getTextContent(scriptTags.pop()), `console.log('imports/external.js');`);
            // Look for the css referenced in the import-linked-style.html source.
            const styleTags = dom5.queryAll(document.ast, preds.hasTagName('style'));
            assert.isAtLeast(styleTags.length, 1);
            assert.include(dom5.getTextContent(styleTags.pop()), `.from-import-linked-style {`);
        }));
        test('changes the href to another bundle if strategy moved it', () => __awaiter(this, void 0, void 0, function* () {
            const bundler = new bundler_1.Bundler({
                // This strategy moves a file to a different bundle.
                strategy: (bundles) => {
                    return [
                        new bundle_manifest_1.Bundle(new Set(['test/html/default.html']), new Set(['test/html/default.html'])),
                        new bundle_manifest_1.Bundle(new Set(), //
                        new Set(['test/html/imports/simple-import.html']))
                    ];
                }
            });
            const manifest = yield bundler.generateManifest(['test/html/default.html']);
            const { documents } = yield bundler.bundle(manifest);
            const document = documents.get('test/html/default.html');
            assert(document);
            // We've moved the 'imports/simple-import.html' into a shared bundle
            // so a link to import it now points to the shared bundle instead.
            const linkTag = dom5.query(document.ast, preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import')));
            assert(linkTag);
            assert.equal(dom5.getAttribute(linkTag, 'href'), '../../shared_bundle_1.html');
            const shared = documents.get('shared_bundle_1.html');
            assert(shared);
            assert.isOk(dom5.query(shared.ast, dom5.predicates.hasAttrValue('id', 'my-element')));
        }));
        test('bundle documents should not have tags added to them', () => __awaiter(this, void 0, void 0, function* () {
            const ast = yield bundle('test/html/imports/simple-import.html');
            assert.isNull(dom5.query(ast, dom5.predicates.OR(dom5.predicates.hasTagName('html'), dom5.predicates.hasTagName('head'), dom5.predicates.hasTagName('body'))));
        }));
    });
    suite('external dependencies', () => {
        test('html imports from bower_components are inlined', () => __awaiter(this, void 0, void 0, function* () {
            const ast = yield bundle('test/html/external-dependencies.html');
            const div = dom5.query(ast, preds.hasAttrValue('id', 'external-dependency'));
            assert(div);
        }));
    });
    test('svg is nested correctly', () => __awaiter(this, void 0, void 0, function* () {
        const opts = { inlineScripts: false, inlineCss: false };
        const svg = dom5.query(yield bundle(inputPath, opts), matchers.template)['content']
            .childNodes[1];
        assert.equal(svg.childNodes.filter(dom5.isElement).length, 6);
    }));
    test('import bodies are in one hidden div', () => __awaiter(this, void 0, void 0, function* () {
        assert.equal(dom5.queryAll(yield bundle(inputPath), matchers.hiddenDiv).length, 1);
    }));
    test('lazy imports are not moved', () => __awaiter(this, void 0, void 0, function* () {
        const bundler = new bundler_1.Bundler({
            analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('test/html/imports') })
        });
        const manifest = yield bundler.generateManifest(['lazy-imports.html']);
        const { documents } = yield bundler.bundle(manifest);
        // The `lazy-imports.html` file has 2 imports in the head of the
        // document.  The first is eager and should be moved.  The remaining
        // one is lazy and should not be moved.
        const entrypointBundle = documents.get('lazy-imports.html').ast;
        const entrypointLazyImports = dom5.queryAll(entrypointBundle, preds.AND(preds.parentMatches(matchers.head), matchers.htmlImport));
        assert.equal(entrypointLazyImports.length, 1);
        assert.equal(dom5.getAttribute(entrypointLazyImports[0], 'group'), 'one');
        // The shared bundle has an inlined dom-module with an embedded
        // lazy-import via `shared-eager-import-2.html` that we are verifying
        // is preserved.
        const sharedBundle = documents.get('shared_bundle_1.html').ast;
        const sharedLazyImports = dom5.queryAll(sharedBundle, preds.AND(preds.parentMatches(preds.hasTagName('dom-module')), preds.hasTagName('link'), preds.hasAttrValue('rel', 'lazy-import')));
        assert.equal(sharedLazyImports.length, 1);
        assert.equal(dom5.getAttribute(sharedLazyImports[0], 'group'), 'deeply');
    }));
    test('dom-modules have assetpath', () => __awaiter(this, void 0, void 0, function* () {
        const assetpath = preds.AND(preds.hasTagName('dom-module'), preds.hasAttrValue('assetpath', 'imports/'));
        assert.ok(dom5.query(yield bundle(inputPath), assetpath), 'assetpath set');
    }));
    test('output file is forced utf-8', () => __awaiter(this, void 0, void 0, function* () {
        const meta = preds.AND(preds.hasTagName('meta'), preds.hasAttrValue('charset', 'UTF-8'));
        assert.ok(dom5.query(yield bundle(inputPath), meta));
    }));
    test('lazy imports are treated like entrypoints', () => __awaiter(this, void 0, void 0, function* () {
        const bundler = new bundler_1.Bundler({
            analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('test/html/imports') })
        });
        const manifest = yield bundler.generateManifest(['lazy-imports.html']);
        const { documents } = yield bundler.bundle(manifest);
        const lazyImports = parse5.serialize(documents.get('lazy-imports.html').ast);
        assert.include(lazyImports, '<link rel="lazy-import" group="one" href="lazy-imports/lazy-import-1.html">', 'lazy-imports.html should keep link to lazy-import-1.html');
        assert.include(lazyImports, '<link rel="lazy-import" group="two" href="lazy-imports/lazy-import-2.html">', 'lazy-imports.html should keep link to lazy-import-2.html');
        const lazyImport1 = parse5.serialize(documents.get('lazy-imports/lazy-import-1.html').ast);
        assert.include(lazyImport1, '<link rel="import" href="../shared_bundle_1.html">', 'lazy-import-1.html should have a link to shared_bundle_1.html');
        assert.include(lazyImport1, '<link rel="lazy-import" href="shared-eager-and-lazy-import-1.html">', 'lazy-import-1.html should keep link to lazy-import shared-eager-and-lazy-import-1.html');
        const lazyImport2 = parse5.serialize(documents.get('lazy-imports/lazy-import-2.html').ast);
        assert.include(lazyImport2, '<link rel="import" href="../shared_bundle_1.html">', 'lazy-import-2.html should have a link to shared_bundle_1.html');
        assert.include(lazyImport2, '<link rel="import" href="shared-eager-and-lazy-import-1.html">', 'lazy-import-2.html should keep link to import shared-eager-and-lazy-import-1.html');
        const sharedEagerBundle = parse5.serialize(documents.get('shared_bundle_1.html').ast);
        assert.include(sharedEagerBundle, '<div id="shared-eager-import-2">');
    }));
    test('lazy imports governed by dom-module assetpath', () => __awaiter(this, void 0, void 0, function* () {
        const bundler = new bundler_1.Bundler({
            analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('test/html/imports') }),
            // We exclude this import so we can examine how the eager import URL
            // is modified in the bundled lazy-import-2.html document.
            excludes: ['lazy-imports/subfolder/eager-import-2.html'],
        });
        const manifest = yield bundler.generateManifest(['lazy-imports.html']);
        const { documents } = yield bundler.bundle(manifest);
        const lazyImport2 = parse5.serialize(documents.get('lazy-imports/lazy-import-2.html').ast);
        assert.include(lazyImport2, '<dom-module id="eager-import-1" assetpath="subfolder/">', 'lazy-import-2.html should have inlined subfolder/eager-import-1.html');
        assert.include(lazyImport2, '<link rel="lazy-import" href="lazy-import-3.html">', 'The href of the lazy import link in the inlined dom-module should not be modified');
        assert.include(lazyImport2, '<link rel="import" href="subfolder/eager-import-2.html">', 'The href of an eager import link inside a dom-module should still be modified');
    }));
    test('Handle <base> tag', () => __awaiter(this, void 0, void 0, function* () {
        const span = preds.AND(preds.hasTagName('span'), preds.hasAttrValue('href', 'imports/hello'));
        const a = preds.AND(preds.hasTagName('a'), preds.hasAttrValue('href', 'imports/sub-base/sub-base.html'));
        const doc = yield bundle('test/html/base.html');
        const spanHref = dom5.query(doc, span);
        assert.ok(spanHref);
        const anchorRef = dom5.query(doc, a);
        assert.ok(anchorRef);
    }));
    test('Imports in <body> are handled correctly', () => __awaiter(this, void 0, void 0, function* () {
        const importMatcher = preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import'));
        const bodyContainerMatcher = preds.AND(preds.hasTagName('div'), preds.hasAttr('hidden'), preds.hasAttr('by-polymer-bundler'));
        const scriptExpected = preds.hasTagName('script');
        const divExpected = preds.AND(preds.hasTagName('div'), preds.hasAttrValue('id', 'imported'));
        const doc = yield bundle('test/html/import-in-body.html');
        const imports = dom5.queryAll(doc, importMatcher);
        assert.equal(imports.length, 0);
        const bodyContainer = dom5.query(doc, bodyContainerMatcher);
        const scriptActual = dom5.query(doc, scriptExpected).parentNode;
        const divActual = dom5.query(doc, divExpected).parentNode;
        assert.equal(bodyContainer, scriptActual);
        assert.equal(bodyContainer, divActual);
    }));
    test('Scripts are not inlined if specified', () => __awaiter(this, void 0, void 0, function* () {
        const scripts = dom5.queryAll(yield bundle('test/html/external.html', { inlineScripts: false }), matchers.externalJavascript);
        assert.isAbove(scripts.length, 0, 'scripts were inlined');
        scripts.forEach(function (s) {
            assert.equal(dom5.getTextContent(s), '', 'script src should be empty');
        });
    }));
    test('Paths for import bodies are resolved correctly', () => __awaiter(this, void 0, void 0, function* () {
        const anchorMatcher = preds.hasTagName('a');
        const input = 'test/html/multiple-imports.html';
        const anchor = dom5.query(yield bundle(input), anchorMatcher);
        const href = dom5.getAttribute(anchor, 'href');
        assert.equal(href, 'imports/target.html');
    }));
    test('Spaces in paths are handled correctly', () => __awaiter(this, void 0, void 0, function* () {
        const input = 'test/html/spaces.html';
        const spacesMatcher = preds.AND(preds.hasTagName('dom-module'), preds.hasAttrValue('id', 'space-element'));
        const module = dom5.query(yield bundle(input), spacesMatcher);
        assert.ok(module);
    }));
    suite('Script Ordering', () => {
        test('Imports and scripts are ordered correctly', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/order-test.html', { inlineScripts: false });
            const expectedOrder = [
                'first-script',
                'second-import-first-script',
                'second-import-second-script',
                'first-import-first-script',
                'first-import-second-script',
                'second-script',
                'third-script'
            ];
            const expectedSrc = [
                'order/first-script.js',
                'order/second-import/first-script.js',
                'order/second-import/second-script.js',
                'order/first-import/first-script.js',
                'order/first-import/second-script.js',
                'order/second-script.js',
                'order/third-script.js'
            ];
            const scripts = dom5.queryAll(doc, matchers.jsMatcher);
            const actualOrder = [], actualSrc = [];
            scripts.forEach(function (s) {
                actualOrder.push(dom5.getAttribute(s, 'id'));
                actualSrc.push(dom5.getAttribute(s, 'src'));
            });
            assert.deepEqual(actualOrder, expectedOrder, 'order is not as expected');
            assert.deepEqual(actualSrc, expectedSrc, 'srcs are not preserved correctly');
        }));
        test('exhaustive script order testing', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/script-order/index.html', { inlineScripts: true });
            assert(doc);
            const serialized = parse5.serialize(doc);
            const beforeLoc = serialized.indexOf('window.BeforeJs');
            const afterLoc = serialized.indexOf('BeforeJs.value');
            assert.isBelow(beforeLoc, afterLoc);
        }));
        test('Paths are correct when maintaining order', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/recursion/import.html');
            assert(doc);
            const scripts = dom5.queryAll(doc, preds.AND(preds.hasTagName('script'), preds.hasAttr('src')));
            for (const s of scripts) {
                const src = dom5.getAttribute(s, 'src');
                assert.equal(src.indexOf('../order'), 0, 'path should start with ../order');
            }
        }));
    });
    suite('Absolute paths in URLs', () => {
        test('will be resolved by the analyzer', () => __awaiter(this, void 0, void 0, function* () {
            const options = { inlineCss: true, inlineScripts: true };
            const doc = yield bundle('test/html/absolute-paths.html', options);
            const html = parse5.serialize(doc);
            assert.include(html, '.absolute-paths-style');
            assert.include(html, 'hello from /absolute-paths/script.js');
        }));
    });
    suite('Excludes', () => {
        test('Excluded imports are not inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle(inputPath, { excludes: ['imports/simple-import.html'] });
            const imports = dom5.queryAll(doc, preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import'), preds.hasAttrValue('href', 'imports/simple-import.html')));
            assert.equal(imports.length, 1);
        }));
        test('Excluded imports are not listed as missing', () => __awaiter(this, void 0, void 0, function* () {
            const bundler = new bundler_1.Bundler({
                analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('test/html') }),
                excludes: [
                    'this/does/not/exist.html',
                    'this/does/not/exist.js',
                    'this/does/not/exist.css'
                ],
            });
            const manifest = yield bundler.generateManifest([
                'absolute-paths.html',
            ]);
            const result = yield bundler.bundle(manifest);
            assert.deepEqual([...result.manifest.bundles.get('absolute-paths.html')
                    .missingImports], []);
        }));
        test('Excluded CSS file urls is not inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external.html', { excludes: ['external/external.css'] });
            assert.include(parse5.serialize(doc), 'href="external/external.css"');
        }));
        test('Excluded CSS folder urls are not inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external.html', { excludes: ['external'] });
            assert.include(parse5.serialize(doc), 'href="external/external.css"');
        }));
        test('Excluded Script file urls are not inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external.html', { excludes: ['external/external.js'] });
            assert.include(parse5.serialize(doc), 'src="external/external.js"');
        }));
        test('Excluded Script folder urls are not inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external.html', { excludes: ['external'] });
            assert.include(parse5.serialize(doc), 'src="external/external.js"');
        }));
        test('Excluded comments are removed', () => __awaiter(this, void 0, void 0, function* () {
            const options = { stripComments: true };
            const doc = yield bundle('test/html/comments.html', options);
            const comments = dom5.nodeWalkAll(doc, dom5.isCommentNode, undefined, dom5.childNodesIncludeTemplate);
            const commentsExpected = [
                '#important server-side include business',
                '# this could be a server-side include too',
                '@license common',
                '@license main',
                '@license import 1',
                '@license import 2'
            ];
            const commentsActual = comments.map((c) => dom5.getTextContent(c).trim());
            assert.deepEqual(commentsActual, commentsExpected);
        }));
        test('Comments are kept by default', () => __awaiter(this, void 0, void 0, function* () {
            const options = { stripComments: false };
            const doc = yield bundle('test/html/comments.html', options);
            const comments = dom5.nodeWalkAll(doc, dom5.isCommentNode);
            // NOTE: Explicitly not trimming the expected comments to ensure we keep
            // the test fixtures with the same whitespace they currently have.
            const expectedComments = [
                '#important server-side include business ',
                '# this could be a server-side include too ',
                ' #this is not a server-side include ',
                ' @license common ',
                ' @license main ',
                '\n@license common\n',
                ' @license import 1 ',
                '\n  @license common\n  ',
                ' comment in import 1 ',
                ' @license import 2 ',
                ' comment in import 2 ',
                ' comment in main '
            ];
            const actualComments = comments.map((c) => dom5.getTextContent(c));
            assert.deepEqual(actualComments, expectedComments);
        }));
        test('Folder can be excluded', () => __awaiter(this, void 0, void 0, function* () {
            const linkMatcher = preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import'));
            const options = { excludes: ['imports/'] };
            const doc = yield bundle('test/html/default.html', options);
            const links = dom5.queryAll(doc, linkMatcher);
            // one duplicate import is removed.  default.html contains this
            // duplication:
            //     <link rel="import" href="imports/simple-import.html">
            //     <link rel="import" href="imports/simple-import.html">
            assert.equal(links.length, 1);
            assert.equal(dom5.getAttribute(links[0], 'href'), 'imports/simple-import.html');
        }));
    });
    suite('Inline Scripts', () => {
        const options = { inlineScripts: true };
        test('URLs for inlined scripts are recorded in Bundle', () => __awaiter(this, void 0, void 0, function* () {
            yield bundle('test/html/external.html');
            assert.deepEqual([...documentBundle.inlinedScripts], ['external/external.js']);
        }));
        test('External script tags are replaced with inline scripts', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external.html', options);
            const externalScripts = dom5.queryAll(doc, matchers.externalJavascript);
            assert.equal(externalScripts.length, 0);
            const inlineScripts = dom5.queryAll(doc, matchers.inlineJavascript);
            assert.equal(inlineScripts.length, 1);
        }));
        test('Remote scripts are kept', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/scripts.html', options);
            const scripts = dom5.queryAll(doc, matchers.externalJavascript);
            assert.equal(scripts.length, 1);
            assert.equal(dom5.getAttribute(scripts[0], 'src'), 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js');
            assert.deepEqual([...documentBundle.inlinedScripts].sort(), ['external/external.js', 'imports/external.js']);
        }));
        test('Absolute paths are correct for excluded links', () => __awaiter(this, void 0, void 0, function* () {
            const target = 'test/html/absolute-paths/import.html';
            const options = { excludes: ['absolute-paths/script.js'] };
            const doc = yield bundle(target, options);
            const scripts = dom5.queryAll(doc, matchers.externalJavascript);
            assert.equal(scripts.length, 2);
            assert.deepEqual(dom5.getAttribute(scripts[0], 'src'), '/absolute-paths/script.js');
            // A missing script will not be inlined and the script tag will not
            // be removed.
            assert.deepEqual(dom5.getAttribute(scripts[1], 'src'), '/this/does/not/exist.js');
        }));
        test('Escape inline <script>', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/xss.html', options);
            const script = dom5.query(doc, matchers.inlineJavascript);
            assert.include(dom5.getTextContent(script), 'var b = 0<\\/script><script>alert(\'XSS\'); //2;', 'Inline <script> should be escaped');
        }));
        test('Inlined Scripts are in the expected order', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/reordered/in.html', options);
            const scripts = dom5.queryAll(doc, matchers.inlineJavascript);
            const contents = scripts.map((script) => dom5.getTextContent(script));
            assert.deepEqual(['"First"', '"Second"'], contents);
        }));
        test('Firebase works inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/firebase.html', {
                inlineScripts: true,
                analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader() }),
            });
            const scripts = dom5.queryAll(doc, matchers.inlineJavascript);
            assert.equal(scripts.length, 1);
            const idx = dom5.getTextContent(scripts[0]).indexOf('</script>');
            assert(idx === -1, '/script found, should be escaped');
        }));
    });
    suite('Inline CSS', () => {
        const options = { inlineCss: true };
        test('URLs for inlined styles are recorded in Bundle', () => __awaiter(this, void 0, void 0, function* () {
            yield bundle(inputPath);
            assert.deepEqual([...documentBundle.inlinedStyles].sort(), [
                'imports/import-linked-style.css',
                'imports/regular-style.css',
                'imports/simple-style.css',
            ]);
        }));
        test('External links are replaced with inlined styles', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle(inputPath, options);
            const links = dom5.queryAll(doc, matchers.stylesheetImport);
            const styles = dom5.queryAll(doc, matchers.styleMatcher, [], dom5.childNodesIncludeTemplate);
            assert.equal(links.length, 0);
            assert.equal(styles.length, 3);
            assert.match(dom5.getTextContent(styles[0]), /regular-style/);
            assert.match(dom5.getTextContent(styles[1]), /simple-style/);
            assert.match(dom5.getTextContent(styles[2]), /import-linked-style/);
            // Verify the inlined url() values in the stylesheet are not rewritten
            // to use the "imports/" prefix, since the stylesheet is inside a
            // `<dom-module>` with an assetpath that defines the base url as
            // "imports/".
            assert.match(dom5.getTextContent(styles[1]), /url\("assets\/platform\.png"\)/);
        }));
        test('External style links in templates are inlined', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/external-in-template.html', { inlineCss: true });
            const externalStyles = dom5.queryAll(doc, matchers.externalStyle, undefined, dom5.childNodesIncludeTemplate);
            assert.equal(externalStyles.length, 0);
            // There were two links to external styles in the file, now there
            // should be two occurrences of inlined styles.  Note they are the
            // same external styles, so inlining should be happening for each
            // occurrence of the external style.
            const inlineStyles = dom5.queryAll(doc, matchers.styleMatcher, undefined, dom5.childNodesIncludeTemplate);
            assert.equal(inlineStyles.length, 2);
            assert.match(dom5.getTextContent(inlineStyles[0]), /content: 'external'/);
            assert.match(dom5.getTextContent(inlineStyles[1]), /content: 'external'/);
        }));
        test('Inlined styles observe containing dom-module assetpath', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/style-rewriting.html', { inlineCss: true });
            const style = dom5.query(doc, matchers.styleMatcher, dom5.childNodesIncludeTemplate);
            assert.isNotNull(style);
            assert.match(dom5.getTextContent(style), /url\("styles\/unicorn.png"\)/);
        }));
        test('Inlining ignores assetpath if rewriteUrlsInTemplates', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/style-rewriting.html', { inlineCss: true, rewriteUrlsInTemplates: true });
            const style = dom5.query(doc, matchers.styleMatcher, dom5.childNodesIncludeTemplate);
            assert.isNotNull(style);
            assert.match(dom5.getTextContent(style), /url\("style-rewriting\/styles\/unicorn.png"\)/);
        }));
        test('Inlined styles have proper paths', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/inline-styles.html', options);
            const styles = dom5.queryAll(doc, matchers.styleMatcher, [], dom5.childNodesIncludeTemplate);
            assert.equal(styles.length, 2);
            const content = dom5.getTextContent(styles[1]);
            assert(content.search('imports/foo.jpg') > -1, 'path adjusted');
            assert(content.search('@apply') > -1, '@apply kept');
        }));
        test('Remote styles and media queries are preserved', () => __awaiter(this, void 0, void 0, function* () {
            const input = 'test/html/imports/remote-stylesheet.html';
            const doc = yield bundle(input, options);
            const links = dom5.queryAll(doc, matchers.externalStyle);
            assert.equal(links.length, 1);
            assert.match(dom5.getAttribute(links[0], 'href'), /fonts.googleapis.com/);
            const styles = dom5.queryAll(doc, matchers.styleMatcher);
            assert.equal(styles.length, 1);
            assert.equal(dom5.getAttribute(styles[0], 'media'), '(min-width: 800px)');
        }));
        test('Inlined Polymer styles are moved into the <template>', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/default.html', options);
            const domModule = dom5.query(doc, preds.hasTagName('dom-module'));
            assert(domModule);
            const template = dom5.query(domModule, matchers.template);
            assert(template);
            const styles = dom5.queryAll(template, matchers.styleMatcher, [], dom5.childNodesIncludeTemplate);
            assert.equal(styles.length, 2);
            assert.match(dom5.getTextContent(styles[0]), /simple-style/, 'simple-style.css');
            assert.match(dom5.getTextContent(styles[1]), /import-linked-style/, 'import-linked-style.css');
        }));
        test('Inlined Polymer styles force dom-module to have template', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/inline-styles.html', options);
            const domModule = dom5.query(doc, preds.hasTagName('dom-module'));
            assert(domModule);
            const template = dom5.query(domModule, matchers.template);
            assert(template);
            const style = dom5.query(template, matchers.styleMatcher, dom5.childNodesIncludeTemplate);
            assert(style);
        }));
    });
    suite('Regression Testing', () => {
        // Ensure this https://github.com/Polymer/polymer-bundler/issues/596 doesn't
        // happen again.
        test('Bundled file should not import itself', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('/test/html/default.html', {
                inlineCss: true,
                analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('.') }),
            });
            const link = dom5.query(doc, preds.AND(matchers.htmlImport, preds.hasAttrValue('href', 'default.html')));
            assert.isNull(link, `Found unexpected link to default.html (self)`);
        }));
        test('Base tag emulation should not leak to other imports', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/base.html');
            const clickMe = dom5.query(doc, preds.hasTextValue('CLICK ME'));
            assert.ok(clickMe);
            // The base target from `test/html/imports/base.html` should apply to
            // the anchor tag in it.
            assert.equal(dom5.getAttribute(clickMe, 'target'), 'foo-frame');
            const doNotClickMe = dom5.query(doc, preds.hasTextValue('DO NOT CLICK ME'));
            assert.ok(doNotClickMe);
            // The base target from `test/html/imports/base.html` should NOT apply
            // to the anchor tag in `test/html/imports/base-foo/sub-base.html`
            assert.isFalse(dom5.hasAttribute(doNotClickMe, 'target'));
        }));
        test('Complicated Ordering', () => __awaiter(this, void 0, void 0, function* () {
            // refer to
            // https://github.com/Polymer/polymer-bundler/tree/master/test/html/complicated/ordering.svg
            // for visual reference on the document structure for this example
            const doc = yield bundle('test/html/complicated/A.html', { inlineScripts: true });
            assert(doc);
            const expected = ['A1', 'C', 'E', 'B', 'D', 'A2'];
            const scripts = dom5.queryAll(doc, matchers.jsMatcher);
            const contents = scripts.map(function (s) {
                return dom5.getTextContent(s).trim();
            });
            assert.deepEqual(contents, expected);
        }));
        test('Assetpath rewriting', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/path-rewriting/src/app-main/app-main.html', { analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader() }) });
            assert(doc);
            const domModules = dom5.queryAll(doc, preds.hasTagName('dom-module'));
            const assetpaths = domModules.map((domModule) => [dom5.getAttribute(domModule, 'id'),
                dom5.getAttribute(domModule, 'assetpath')]);
            assert.deepEqual(assetpaths, [
                ['test-c', '../../bower_components/test-component/'],
                ['test-b', '../../bower_components/test-component/src/elements/'],
                ['test-a', '../../bower_components/test-component/'],
                // We don't need an assetpath on app-main because its not been
                // moved/inlined from another location.
                ['app-main', null]
            ]);
        }));
        test('Bundler should not emit empty hidden divs', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/import-empty.html');
            assert(doc);
            assert.isNull(dom5.query(doc, matchers.hiddenDiv));
        }));
        test('Entrypoint body content should not be wrapped', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/default.html');
            assert(doc);
            const myElement = dom5.query(doc, preds.hasTagName('my-element'));
            assert(myElement);
            assert(preds.NOT(preds.parentMatches(preds.hasAttr('by-polymer-bundler')))(myElement));
        }));
        test('eagerly importing a fragment', () => __awaiter(this, void 0, void 0, function* () {
            const bundler = new bundler_1.Bundler({
                analyzer: new polymer_analyzer_1.Analyzer({ urlLoader: new polymer_analyzer_1.FSUrlLoader('test/html/imports') }),
                strategy: bundle_manifest_1.generateShellMergeStrategy('importing-fragments/shell.html'),
            });
            const manifest = yield bundler.generateManifest([
                'eagerly-importing-a-fragment.html',
                'importing-fragments/fragment-a.html',
                'importing-fragments/fragment-b.html',
                'importing-fragments/shell.html',
            ]);
            const result = yield bundler.bundle(manifest);
            assert.equal(result.manifest.bundles.size, 4);
            const shell = parse5.serialize(result.documents.get('importing-fragments/shell.html').ast);
            const fragmentAAt = shell.indexOf('rel="import" href="fragment-a.html"');
            const shellAt = shell.indexOf(`console.log('shell.html')`);
            const sharedUtilAt = shell.indexOf(`console.log('shared-util.html')`);
            assert.isTrue(sharedUtilAt < fragmentAAt, 'Inlined shared-util.html should come before fragment-a.html import');
            assert.isTrue(fragmentAAt < shellAt, 'fragment-a.html import should come before script in shell.html');
        }));
        test('Imports in templates should not inline', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/inside-template.html');
            const importMatcher = preds.AND(preds.hasTagName('link'), preds.hasAttrValue('rel', 'import'), preds.hasAttr('href'));
            const externalScriptMatcher = preds.AND(preds.hasTagName('script'), preds.hasAttrValue('src', 'external/external.js'));
            assert(doc);
            const imports = dom5.queryAll(doc, importMatcher, undefined, dom5.childNodesIncludeTemplate);
            assert.equal(imports.length, 1, 'import in template was inlined');
            const unexpectedScript = dom5.query(doc, externalScriptMatcher);
            assert.equal(unexpectedScript, null, 'script in external.html should not be present');
        }));
        test('Deprecated CSS imports should inline correctly', () => __awaiter(this, void 0, void 0, function* () {
            const doc = yield bundle('test/html/css-imports.html', { inlineCss: true });
            const styleA = fs.readFileSync('test/html/css-import/import-a.css', 'utf-8');
            const styleB = fs.readFileSync('test/html/css-import/import-b.css', 'utf-8');
            const elementA = dom5.query(doc, dom5.predicates.hasAttrValue('id', 'element-a'));
            assert(elementA, 'element-a not found.');
            assert.include(parse5.serialize(elementA), styleA);
            assert.notInclude(parse5.serialize(elementA), styleB);
            const elementB = dom5.query(doc, dom5.predicates.hasAttrValue('id', 'element-b'));
            assert(elementB, 'element-b not found.');
            assert.notInclude(parse5.serialize(elementB), styleA);
            assert.include(parse5.serialize(elementB), styleB);
        }));
    });
});
//# sourceMappingURL=bundler_test.js.map