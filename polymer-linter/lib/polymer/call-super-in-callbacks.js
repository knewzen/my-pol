"use strict";
/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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
const estraverse = require("estraverse");
const polymer_analyzer_1 = require("polymer-analyzer");
const registry_1 = require("../registry");
const rule_1 = require("../rule");
const util_1 = require("../util");
const util_2 = require("../util");
const methodsThatMustCallSuper = new Set([
    'ready',
    'connectedCallback',
    'disconnectedCallback',
    'attributeChangedCallback',
]);
class CallSuperInCallbacks extends rule_1.Rule {
    constructor() {
        super(...arguments);
        this.code = 'call-super-in-callbacks';
        this.description = util_2.stripIndentation(`
      Warns when a Polymer element overrides one of the custom element callbacks
      but does not call super.callbackName().
  `);
    }
    check(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            const elementLikes = new Array(...document.getFeatures({ kind: 'element' }), ...document.getFeatures({ kind: 'element-mixin' }));
            for (const elementLike of elementLikes) {
                // TODO(rictic): methods should have astNodes, that would make this
                //     simpler. Filed as:
                //     https://github.com/Polymer/polymer-analyzer/issues/562
                const classBody = getClassBody(elementLike.astNode);
                if (!classBody) {
                    continue;
                }
                for (const method of classBody.body) {
                    let methodName = undefined;
                    if (method.type !== 'MethodDefinition') {
                        // Guard against ES2018+ additions to class bodies.
                        continue;
                    }
                    if (method.kind === 'constructor') {
                        methodName = 'constructor';
                    }
                    let classThatRequiresSuper;
                    if (method.kind === 'method' && method.key.type === 'Identifier') {
                        classThatRequiresSuper =
                            mustCallSuper(elementLike, method.key.name, document);
                        if (classThatRequiresSuper) {
                            methodName = method.key.name;
                        }
                    }
                    if (!methodName) {
                        continue;
                    }
                    // Ok, so now just check that the method does call super.methodName()
                    if (!doesCallSuper(method, methodName)) {
                        // Construct a nice legible warning.
                        const parsedDocumentContaining = getParsedDocumentContaining(elementLike.sourceRange, document);
                        if (parsedDocumentContaining) {
                            const sourceRange = parsedDocumentContaining.sourceRangeForNode(method.key);
                            if (method.kind === 'constructor') {
                                warnings.push(new polymer_analyzer_1.Warning({
                                    parsedDocument: document.parsedDocument,
                                    code: 'call-super-in-constructor',
                                    severity: polymer_analyzer_1.Severity.ERROR, sourceRange,
                                    message: util_1.stripWhitespace(`
                  ES6 requires super() in constructors with superclasses.
                `)
                                }));
                            }
                            else {
                                let message;
                                let code;
                                if (elementLike instanceof polymer_analyzer_1.ElementMixin) {
                                    code = 'call-super-in-mixin-callbacks';
                                    message = util_1.stripWhitespace(`
                    This method should conditionally call super.${methodName}()
                    because a class ${getName(elementLike, 'this mixin')} is
                    applied to may also define ${methodName}.`);
                                }
                                else {
                                    code = this.code;
                                    message = util_1.stripWhitespace(`
                    You may need to call super.${methodName}() because
                    ${getName(elementLike, 'this class')} extends
                    ${classThatRequiresSuper}, which defines ${methodName} too.
                `);
                                }
                                warnings.push(new polymer_analyzer_1.Warning({
                                    parsedDocument: document.parsedDocument,
                                    severity: polymer_analyzer_1.Severity.WARNING, code, sourceRange, message
                                }));
                            }
                        }
                    }
                }
            }
            return warnings;
        });
    }
}
// TODO(rictic): This is awkward. Filed as
//     https://github.com/Polymer/polymer-analyzer/issues/557
function getParsedDocumentContaining(sourceRange, document) {
    if (!sourceRange) {
        return undefined;
    }
    let mostSpecificDocument = undefined;
    for (const doc of document.getFeatures({ kind: 'document' })) {
        if (polymer_analyzer_1.isPositionInsideRange(sourceRange.start, doc.sourceRange)) {
            if (!mostSpecificDocument ||
                polymer_analyzer_1.isPositionInsideRange(doc.sourceRange.start, mostSpecificDocument.sourceRange)) {
                mostSpecificDocument = doc;
            }
        }
    }
    mostSpecificDocument = mostSpecificDocument || document;
    return mostSpecificDocument.parsedDocument;
}
function getClassBody(astNode) {
    if (!astNode || !astNode.type) {
        return undefined;
    }
    let classBody = undefined;
    estraverse.traverse(astNode, {
        enter(node) {
            if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
                classBody = node.body;
                return estraverse.VisitorOption.Break;
            }
        }
    });
    return classBody;
}
/**
 * Returns the name of the class in element's inheritance chain that requires
 * super[methodName]() be called. Returns undefined if no such class exists.
 */
function mustCallSuper(elementLike, methodName, document) {
    // TODO(rictic): look up the inheritance graph for a jsdoc tag that describes
    //     the method as needing to be called?
    if (!methodsThatMustCallSuper.has(methodName)) {
        return;
    }
    // ElementMixins should always conditionally call super in callbacks.
    if (elementLike instanceof polymer_analyzer_1.ElementMixin) {
        return `some of the classes this mixin may be applied to`;
    }
    // Did the element's super class define the method?
    if (elementLike.superClass) {
        const superElement = onlyOrNone(document.getFeatures({ kind: 'element', id: elementLike.superClass.identifier }));
        if (superElement && getMethodDefiner(superElement, methodName)) {
            return superElement.tagName || superElement.className;
        }
    }
    return getMethodDefinerFromMixins(elementLike, methodName, document, true);
}
function doesCallSuper(method, methodName) {
    const superCallTargets = [];
    estraverse.traverse(method.value.body, {
        enter(node) {
            if (node.type === 'ExpressionStatement' &&
                node.expression.type === 'CallExpression') {
                const callee = node.expression.callee;
                // Just super()
                if (callee.type === 'Super') {
                    superCallTargets.push('constructor');
                }
                // super.foo()
                if (callee.type === 'MemberExpression' &&
                    callee.object.type === 'Super' &&
                    callee.property.type === 'Identifier') {
                    superCallTargets.push(callee.property.name);
                }
            }
        }
    });
    return !!superCallTargets.find((ct) => ct === methodName);
}
function getMethodDefinerFromMixins(elementLike, methodName, document, skipLocalCheck) {
    if (!skipLocalCheck) {
        const source = getMethodDefiner(elementLike, methodName);
        if (source) {
            return source;
        }
    }
    for (const mixinReference of elementLike.mixins) {
        // TODO(rictic): once we have a representation of a Class this should be
        //   something like `document.getById('class')` instead.
        //   https://github.com/Polymer/polymer-analyzer/issues/563
        const mixin = onlyOrNone(document.getFeatures({ kind: 'element-mixin', id: mixinReference.identifier }));
        // TODO(rictic): if mixins had their own mixins pre-mixed in we wouldn't
        //     need to recurse here, just use definesMethod directly.
        //     https://github.com/Polymer/polymer-analyzer/issues/564
        const cause = mixin && getMethodDefinerFromMixins(mixin, methodName, document, false);
        if (cause) {
            return cause;
        }
    }
    return;
}
function getMethodDefiner(elementLike, methodName) {
    if (!elementLike) {
        return;
    }
    // Note that if elementLike is an element, this will include methods
    // defined on super classes and in mixins. If it's a mixin it doesn't,
    // thus the need for anyMixinDefinesMethod until
    // https://github.com/Polymer/polymer-analyzer/issues/564 is fixed.
    const method = elementLike.methods.get(methodName);
    if (method) {
        return method.inheritedFrom || getName(elementLike);
    }
}
function getName(elementLike, fallback) {
    if (elementLike instanceof polymer_analyzer_1.Element) {
        return elementLike.className || elementLike.tagName || fallback ||
            'Unknown Element';
    }
    else {
        return elementLike.name || fallback || 'Unknown Mixin';
    }
}
function onlyOrNone(iterable) {
    let first = true;
    let result = undefined;
    for (const val of iterable) {
        if (first) {
            result = val;
            first = false;
        }
        else {
            return undefined;
        }
    }
    return result;
}
registry_1.registry.register(new CallSuperInCallbacks());
//# sourceMappingURL=call-super-in-callbacks.js.map