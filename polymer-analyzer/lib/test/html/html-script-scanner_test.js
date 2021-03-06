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
const chai_1 = require("chai");
const path = require("path");
const analyzer_1 = require("../../core/analyzer");
const html_parser_1 = require("../../html/html-parser");
const html_script_scanner_1 = require("../../html/html-script-scanner");
const model_1 = require("../../model/model");
const fs_url_loader_1 = require("../../url-loader/fs-url-loader");
const fixturesDir = path.resolve(__dirname, '../static');
suite('HtmlScriptScanner', () => {
    suite('scan()', () => {
        let scanner;
        setup(() => {
            scanner = new html_script_scanner_1.HtmlScriptScanner();
        });
        test('finds external and inline scripts', () => __awaiter(this, void 0, void 0, function* () {
            const contents = `<html><head>
          <script src="foo.js"></script>
          <script>console.log('hi')</script>
        </head></html>`;
            const document = new html_parser_1.HtmlParser().parse(contents, 'test-document.html');
            const visit = (visitor) => __awaiter(this, void 0, void 0, function* () { return document.visit([visitor]); });
            const { features } = yield scanner.scan(document, visit);
            chai_1.assert.equal(features.length, 2);
            chai_1.assert.instanceOf(features[0], model_1.ScannedImport);
            const feature0 = features[0];
            chai_1.assert.equal(feature0.type, 'html-script');
            chai_1.assert.equal(feature0.url, 'foo.js');
            chai_1.assert.instanceOf(features[1], model_1.ScannedInlineDocument);
            const feature1 = features[1];
            chai_1.assert.equal(feature1.type, 'js');
            chai_1.assert.equal(feature1.contents, `console.log('hi')`);
            chai_1.assert.deepEqual(feature1.locationOffset, { line: 2, col: 18 });
        }));
        test('finds external scripts relative to baseUrl', () => __awaiter(this, void 0, void 0, function* () {
            const contents = `<html><head><base href="/aybabtu/">
          <script src="foo.js"></script>
        </head></html>`;
            const document = new html_parser_1.HtmlParser().parse(contents, 'test-document.html');
            const visit = (visitor) => __awaiter(this, void 0, void 0, function* () { return document.visit([visitor]); });
            const { features } = yield scanner.scan(document, visit);
            chai_1.assert.equal(features.length, 1);
            chai_1.assert.instanceOf(features[0], model_1.ScannedImport);
            const feature0 = features[0];
            chai_1.assert.equal(feature0.type, 'html-script');
            chai_1.assert.equal(feature0.url, '/aybabtu/foo.js');
        }));
        suite('modules', () => {
            const urlLoader = new fs_url_loader_1.FSUrlLoader(fixturesDir);
            const analyzer = new analyzer_1.Analyzer({ urlLoader });
            let analysis;
            before(() => __awaiter(this, void 0, void 0, function* () {
                analysis = yield analyzer.analyze(['js-modules.html']);
            }));
            test('finds external module scripts', () => {
                const htmlScripts = [...analysis.getFeatures({ kind: 'html-script' })];
                chai_1.assert.equal(htmlScripts.length, 1);
                const js = htmlScripts[0].document.parsedDocument;
                chai_1.assert.equal(js.url, 'javascript/module.js');
                chai_1.assert.equal(js.parsedAsSourceType, 'module');
                chai_1.assert.equal(js.contents.trim(), `import * as submodule from './submodule.js';`);
            });
            test('finds inline module scripts', () => {
                const inlineDocuments = [...analysis.getFeatures({ kind: 'inline-document' })];
                chai_1.assert.equal(inlineDocuments.length, 1);
                const js = inlineDocuments[0].parsedDocument;
                chai_1.assert.equal(js.url, 'js-modules.html');
                chai_1.assert.equal(js.parsedAsSourceType, 'module');
                chai_1.assert.equal(js.contents.trim(), `import * as something from './javascript/module-with-export.js';`);
            });
            test('follows import statements in modules', () => __awaiter(this, void 0, void 0, function* () {
                const jsImports = [...analysis.getFeatures({ kind: 'js-import' })];
                chai_1.assert.equal(jsImports.length, 2);
                // import statement in inline module script in 'js-modules.html'
                const js0 = jsImports[0].document.parsedDocument;
                chai_1.assert.equal(js0.url, 'javascript/module-with-export.js');
                chai_1.assert.equal(js0.parsedAsSourceType, 'module');
                chai_1.assert.equal(js0.contents.trim(), `export const someValue = 'value goes here';`);
                // import statement in external module script 'javascript/module.js'
                const js1 = jsImports[1].document.parsedDocument;
                chai_1.assert.equal(js1.url, 'javascript/submodule.js');
                chai_1.assert.equal(js1.parsedAsSourceType, 'module');
                chai_1.assert.equal(js1.contents.trim(), `export const subThing = 'sub-thing';`);
            }));
        });
    });
});

//# sourceMappingURL=html-script-scanner_test.js.map
