"use strict";
/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
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
const ast_value_1 = require("../javascript/ast-value");
const esutil_1 = require("../javascript/esutil");
const jsdoc = require("../javascript/jsdoc");
const model_1 = require("../model/model");
const declaration_property_handlers_1 = require("./declaration-property-handlers");
const declaration_property_handlers_2 = require("./declaration-property-handlers");
const docs = require("./docs");
const expression_scanner_1 = require("./expression-scanner");
const js_utils_1 = require("./js-utils");
const polymer_element_1 = require("./polymer-element");
class PolymerElementScanner {
    scan(document, visit) {
        return __awaiter(this, void 0, void 0, function* () {
            const visitor = new ElementVisitor(document);
            yield visit(visitor);
            return { features: visitor.features, warnings: visitor.warnings };
        });
    }
}
exports.PolymerElementScanner = PolymerElementScanner;
class ElementVisitor {
    constructor(document) {
        this.features = [];
        /**
         * The element being built during a traversal;
         */
        this.element = null;
        this.propertyHandlers = null;
        this.classDetected = false;
        this.warnings = [];
        this.document = document;
    }
    enterClassDeclaration(node, _) {
        this.classDetected = true;
        const className = node.id.name;
        const docs = jsdoc.parseJsdoc(esutil_1.getAttachedComment(node) || '');
        this.element = new polymer_element_1.ScannedPolymerElement({
            astNode: node,
            description: docs.description,
            events: esutil_1.getEventComments(node),
            sourceRange: this.document.sourceRangeForNode(node),
            className,
            privacy: esutil_1.getOrInferPrivacy(className, docs),
            abstract: jsdoc.hasTag(docs, 'abstract'),
            attributes: new Map(),
            properties: [],
            behaviors: [],
            extends: undefined,
            jsdoc: docs,
            listeners: [],
            methods: new Map(),
            staticMethods: new Map(),
            mixins: [],
            observers: [],
            superClass: undefined,
            tagName: undefined
        });
        this.propertyHandlers =
            declaration_property_handlers_2.declarationPropertyHandlers(this.element, this.document);
    }
    leaveClassDeclaration(_, _parent) {
        for (const property of this.element.properties.values()) {
            docs.annotate(property);
        }
        // TODO(justinfagnani): this looks wrong, class definitions can be nested
        // so a definition in a method in a Polymer() declaration would end the
        // declaration early. We should track which class induced the current
        // element and finish the element when leaving _that_ class.
        this.element = null;
        this.propertyHandlers = null;
        this.classDetected = false;
    }
    enterAssignmentExpression(node, _) {
        if (!this.element) {
            return;
        }
        const left = node.left;
        if (left && left.object && left.object.type !== 'ThisExpression') {
            return;
        }
        const prop = left.property;
        if (prop && prop.name && this.propertyHandlers) {
            const name = prop.name;
            if (name in this.propertyHandlers) {
                this.propertyHandlers[name](node.right);
            }
        }
    }
    enterMethodDefinition(node, _parent) {
        const element = this.element;
        if (!element) {
            return;
        }
        const prop = Object.assign({}, node, {
            method: true,
            shorthand: false,
            computed: false,
        });
        if (node.kind === 'get') {
            const returnStatement = node.value.body.body[0];
            const argument = returnStatement.argument;
            const propDesc = js_utils_1.toScannedPolymerProperty(prop, this.document.sourceRangeForNode(node), this.document);
            docs.annotate(propDesc);
            // We only support observers and behaviors getters that return array
            // literals.
            if ((propDesc.name === 'behaviors' || propDesc.name === 'observers') &&
                !Array.isArray(argument.elements)) {
                return;
            }
            if (propDesc.name === 'behaviors') {
                argument.elements.forEach((argNode) => {
                    const result = declaration_property_handlers_1.getBehaviorAssignmentOrWarning(argNode, this.document);
                    if (result.kind === 'warning') {
                        element.warnings.push(result.warning);
                    }
                    else {
                        element.behaviorAssignments.push(result.assignment);
                    }
                });
                return;
            }
            if (propDesc.name === 'observers') {
                argument.elements.forEach((elementObject) => {
                    const parseResult = expression_scanner_1.parseExpressionInJsStringLiteral(this.document, elementObject, 'callExpression');
                    element.warnings = element.warnings.concat(parseResult.warnings);
                    let expressionText = undefined;
                    if (elementObject.type === 'Literal') {
                        expressionText = elementObject.raw;
                    }
                    element.observers.push({
                        javascriptNode: elementObject,
                        expression: expressionText,
                        parsedExpression: parseResult.databinding
                    });
                });
                return;
            }
            element.addProperty(propDesc);
            return;
        }
        if (node.kind === 'method') {
            const methodDesc = esutil_1.toScannedMethod(prop, this.document.sourceRangeForNode(node), this.document);
            docs.annotate(methodDesc);
            element.addMethod(methodDesc);
        }
    }
    enterCallExpression(node, parent) {
        // When dealing with a class, enterCallExpression is called after the
        // parsing actually starts
        if (this.classDetected) {
            return estraverse.VisitorOption.Skip;
        }
        const callee = node.callee;
        if (callee.type === 'Identifier') {
            if (callee.name === 'Polymer') {
                const rawDescription = esutil_1.getAttachedComment(parent);
                let className = undefined;
                if (parent.type === 'AssignmentExpression') {
                    className = ast_value_1.getIdentifierName(parent.left);
                }
                else if (parent.type === 'VariableDeclarator') {
                    className = ast_value_1.getIdentifierName(parent.id);
                }
                const jsDoc = jsdoc.parseJsdoc(rawDescription || '');
                this.element = new polymer_element_1.ScannedPolymerElement({
                    className,
                    astNode: node,
                    description: jsDoc.description,
                    events: esutil_1.getEventComments(parent),
                    sourceRange: this.document.sourceRangeForNode(node.arguments[0]),
                    privacy: esutil_1.getOrInferPrivacy('', jsDoc),
                    abstract: jsdoc.hasTag(jsDoc, 'abstract'),
                    attributes: new Map(),
                    properties: [],
                    behaviors: [],
                    extends: undefined,
                    jsdoc: jsDoc,
                    listeners: [],
                    methods: new Map(),
                    staticMethods: new Map(),
                    mixins: [],
                    observers: [],
                    superClass: undefined,
                    tagName: undefined
                });
                this.element.description = (this.element.description || '').trim();
                this.propertyHandlers =
                    declaration_property_handlers_2.declarationPropertyHandlers(this.element, this.document);
            }
        }
    }
    leaveCallExpression(node, _) {
        const callee = node.callee;
        const args = node.arguments;
        if (callee.type === 'Identifier' && args.length === 1 &&
            args[0].type === 'ObjectExpression') {
            if (callee.name === 'Polymer') {
                if (this.element) {
                    this.features.push(this.element);
                    this.element = null;
                    this.propertyHandlers = null;
                }
            }
        }
    }
    enterObjectExpression(node, _) {
        // When dealing with a class, there is no single object that we can
        // parse to retrieve all properties.
        if (this.classDetected) {
            return estraverse.VisitorOption.Skip;
        }
        const element = this.element;
        if (element) {
            const getters = {};
            const setters = {};
            const definedProperties = {};
            for (const prop of node.properties) {
                const name = esutil_1.objectKeyToString(prop.key);
                if (!name) {
                    element.warnings.push(new model_1.Warning({
                        message: `Can't determine name for property key from expression with type ${prop.key
                            .type}.`,
                        code: 'cant-determine-property-name',
                        severity: model_1.Severity.WARNING,
                        sourceRange: this.document.sourceRangeForNode(prop.key),
                        parsedDocument: this.document
                    }));
                    continue;
                }
                if (!this.propertyHandlers) {
                    continue;
                }
                if (name in this.propertyHandlers) {
                    this.propertyHandlers[name](prop.value);
                    continue;
                }
                try {
                    const scannedPolymerProperty = js_utils_1.toScannedPolymerProperty(prop, this.document.sourceRangeForNode(prop), this.document);
                    if (prop.kind === 'get') {
                        getters[scannedPolymerProperty.name] = scannedPolymerProperty;
                    }
                    else if (prop.kind === 'set') {
                        setters[scannedPolymerProperty.name] = scannedPolymerProperty;
                    }
                    else if (prop.method === true || esutil_1.isFunctionType(prop.value)) {
                        const scannedPolymerMethod = esutil_1.toScannedMethod(prop, this.document.sourceRangeForNode(prop), this.document);
                        element.addMethod(scannedPolymerMethod);
                    }
                    else {
                        element.addProperty(scannedPolymerProperty);
                    }
                }
                catch (e) {
                    if (e instanceof model_1.WarningCarryingException) {
                        element.warnings.push(e.warning);
                        continue;
                    }
                    throw e;
                }
            }
            Object.keys(getters).forEach((name) => {
                const prop = getters[name];
                definedProperties[prop.name] = prop;
                prop.readOnly = !!setters[prop.name];
            });
            Object.keys(setters).forEach((name) => {
                const prop = setters[name];
                if (!(prop.name in definedProperties)) {
                    definedProperties[prop.name] = prop;
                }
            });
            Object.keys(definedProperties).forEach((name) => {
                const prop = definedProperties[name];
                element.addProperty(prop);
            });
            return estraverse.VisitorOption.Skip;
        }
    }
}

//# sourceMappingURL=polymer-element-scanner.js.map
