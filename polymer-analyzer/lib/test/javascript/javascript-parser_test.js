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
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs = require("fs");
const path = require("path");
const stripIndent = require("strip-indent");
const esutil = require("../../javascript/esutil");
const javascript_document_1 = require("../../javascript/javascript-document");
const javascript_parser_1 = require("../../javascript/javascript-parser");
suite('JavaScriptParser', () => {
    let parser;
    setup(() => {
        parser = new javascript_parser_1.JavaScriptParser();
    });
    suite('parse()', () => {
        test('parses classes', () => {
            const contents = `
        class Foo extends HTMLElement {
          constructor() {
            super();
            this.bar = () => {};
            const let = 'let const';
          }
        }
      `;
            const document = parser.parse(contents, '/static/es6-support.js');
            chai_1.assert.instanceOf(document, javascript_document_1.JavaScriptDocument);
            chai_1.assert.equal(document.url, '/static/es6-support.js');
            chai_1.assert.equal(document.ast.type, 'Program');
            chai_1.assert.equal(document.parsedAsSourceType, 'script');
            // First statement is a class declaration
            chai_1.assert.equal(document.ast.body[0].type, 'ClassDeclaration');
        });
        test('parses async await', () => {
            const contents = `
        async function foo() {
          await Promise.resolve();
        }
      `;
            const document = parser.parse(contents, '/static/es6-support.js');
            chai_1.assert.instanceOf(document, javascript_document_1.JavaScriptDocument);
            chai_1.assert.equal(document.url, '/static/es6-support.js');
            chai_1.assert.equal(document.ast.type, 'Program');
            chai_1.assert.equal(document.parsedAsSourceType, 'script');
            // First statement is an async function declaration
            const functionDecl = document.ast.body[0];
            if (functionDecl.type !== 'FunctionDeclaration') {
                throw new Error('Expected a function declaration.');
            }
            chai_1.assert.equal(functionDecl.async, true);
        });
        test('throws syntax errors', () => {
            const file = fs.readFileSync(path.resolve(__dirname, '../static/js-parse-error.js'), 'utf8');
            chai_1.assert.throws(() => parser.parse(file, '/static/js-parse-error.js'));
        });
        test('attaches comments', () => {
            const file = fs.readFileSync(path.resolve(__dirname, '../static/js-elements.js'), 'utf8');
            const document = parser.parse(file, '/static/js-elements.js');
            const ast = document.ast;
            const element1 = ast.body[0];
            const comment = esutil.getAttachedComment(element1);
            chai_1.assert.isTrue(comment.indexOf('test-element') !== -1);
        });
        test('parses an ES module', () => {
            const contents = `
        import foo from 'foo';
      `;
            const document = parser.parse(contents, '/static/es6-support.js');
            chai_1.assert.instanceOf(document, javascript_document_1.JavaScriptDocument);
            chai_1.assert.equal(document.url, '/static/es6-support.js');
            chai_1.assert.equal(document.ast.type, 'Program');
            chai_1.assert.equal(document.parsedAsSourceType, 'module');
        });
    });
    suite(`stringify()`, () => {
        test('pretty prints output', () => {
            const contents = stripIndent(`
        class Foo extends HTMLElement {
          constructor() {
            super();
            this.bar = () => {
            };
            const let = 'let const';
          }
        }`).trim() +
                '\n';
            const document = parser.parse(contents, 'test-file.js');
            chai_1.assert.deepEqual(document.stringify({}), contents);
        });
    });
});
suite('JavaScriptModuleParser', () => {
    let parser;
    setup(() => {
        parser = new javascript_parser_1.JavaScriptModuleParser();
    });
    suite('parse()', () => {
        test('parses an ES6 module', () => {
            const contents = `
    import foo from 'foo';
  `;
            const document = parser.parse(contents, '/static/es6-support.js');
            chai_1.assert.instanceOf(document, javascript_document_1.JavaScriptDocument);
            chai_1.assert.equal(document.url, '/static/es6-support.js');
            chai_1.assert.equal(document.ast.type, 'Program');
            chai_1.assert.equal(document.parsedAsSourceType, 'module');
        });
    });
});
suite('JavaScriptScriptParser', () => {
    let parser;
    setup(() => {
        parser = new javascript_parser_1.JavaScriptScriptParser();
    });
    test('throws a syntax error when parsing es6 module', () => {
        const contents = `
      import foo from 'foo';
    `;
        chai_1.assert.throws(() => parser.parse(contents, '/static/es6-support.js'));
    });
});

//# sourceMappingURL=javascript-parser_test.js.map
