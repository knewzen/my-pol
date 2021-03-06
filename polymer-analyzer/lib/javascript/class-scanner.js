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
const doctrine = require("doctrine");
const escodegen = require("escodegen");
const model_1 = require("../model/model");
const declaration_property_handlers_1 = require("../polymer/declaration-property-handlers");
const polymer_element_1 = require("../polymer/polymer-element");
const polymer2_config_1 = require("../polymer/polymer2-config");
const polymer2_mixin_scanner_1 = require("../polymer/polymer2-mixin-scanner");
const astValue = require("./ast-value");
const ast_value_1 = require("./ast-value");
const esutil = require("./esutil");
const esutil_1 = require("./esutil");
const jsdoc = require("./jsdoc");
/**
 * Find and classify classes from source code.
 *
 * Currently this has a bunch of Polymer stuff baked in that shouldn't be here
 * in order to support generating only one feature for stuff that's essentially
 * more specific kinds of classes, like Elements, PolymerElements, Mixins, etc.
 *
 * In a future change we'll add a mechanism whereby plugins can claim and
 * specialize classes.
 */
class ClassScanner {
    scan(document, visit) {
        return __awaiter(this, void 0, void 0, function* () {
            const classFinder = new ClassFinder(document);
            const mixinFinder = new polymer2_mixin_scanner_1.MixinVisitor(document);
            const elementDefinitionFinder = new CustomElementsDefineCallFinder(document);
            // Find all classes and all calls to customElements.define()
            yield Promise.all([
                visit(classFinder),
                visit(elementDefinitionFinder),
                visit(mixinFinder)
            ]);
            const mixins = mixinFinder.mixins;
            const elementDefinitionsByClassName = new Map();
            // For classes that show up as expressions in the second argument position
            // of a customElements.define call.
            const elementDefinitionsByClassExpression = new Map();
            for (const defineCall of elementDefinitionFinder.calls) {
                // MaybeChainedIdentifier is invented below. It's like Identifier, but it
                // includes 'Polymer.Element' as a name.
                if (defineCall.class_.type === 'MaybeChainedIdentifier') {
                    elementDefinitionsByClassName.set(defineCall.class_.name, defineCall);
                }
                else {
                    elementDefinitionsByClassExpression.set(defineCall.class_, defineCall);
                }
            }
            // TODO(rictic): emit ElementDefineCallFeatures for define calls that don't
            //     map to any local classes?
            const mixinClassExpressions = new Set();
            for (const mixin of mixins) {
                if (mixin.classAstNode) {
                    mixinClassExpressions.add(mixin.classAstNode);
                }
            }
            // Next we want to distinguish custom elements from other classes.
            const customElements = [];
            const normalClasses = [];
            for (const class_ of classFinder.classes) {
                if (mixinClassExpressions.has(class_.astNode)) {
                    // This class is a mixin and has already been handled as such.
                    continue;
                }
                // Class expressions inside the customElements.define call
                if (class_.astNode.type === 'ClassExpression') {
                    const definition = elementDefinitionsByClassExpression.get(class_.astNode);
                    if (definition) {
                        customElements.push({ class_, definition });
                        continue;
                    }
                }
                // Classes whose names are referenced in a same-file customElements.define
                const definition = elementDefinitionsByClassName.get(class_.name) ||
                    elementDefinitionsByClassName.get(class_.localName);
                if (definition) {
                    customElements.push({ class_, definition });
                    continue;
                }
                // Classes explicitly defined as elements in their jsdoc tags.
                // TODO(justinfagnani): remove @polymerElement support
                if (jsdoc.hasTag(class_.jsdoc, 'customElement') ||
                    jsdoc.hasTag(class_.jsdoc, 'polymerElement')) {
                    customElements.push({ class_ });
                    continue;
                }
                // Classes that aren't custom elements, or at least, aren't obviously.
                normalClasses.push(class_);
            }
            const scannedFeatures = [];
            for (const element of customElements) {
                scannedFeatures.push(this._makeElementFeature(element, document));
            }
            for (const scannedClass of normalClasses) {
                scannedFeatures.push(scannedClass);
            }
            for (const mixin of mixins) {
                scannedFeatures.push(mixin);
            }
            return {
                features: scannedFeatures,
                warnings: [
                    ...elementDefinitionFinder.warnings,
                    ...classFinder.warnings,
                    ...mixinFinder.warnings,
                ]
            };
        });
    }
    _makeElementFeature(element, document) {
        const class_ = element.class_;
        const astNode = element.class_.astNode;
        const docs = element.class_.jsdoc;
        let tagName = undefined;
        // TODO(rictic): support `@customElements explicit-tag-name` from jsdoc
        if (element.definition &&
            element.definition.tagName.type === 'string-literal') {
            tagName = element.definition.tagName.value;
        }
        else if (astNode.type === 'ClassExpression' ||
            astNode.type === 'ClassDeclaration') {
            tagName = polymer2_config_1.getIsValue(astNode);
        }
        let warnings = [];
        let scannedElement;
        let methods = new Map();
        let staticMethods = new Map();
        let observers = [];
        // This will cover almost all classes, except those defined only by
        // applying a mixin. e.g.   const MyElem = Mixin(HTMLElement)
        if (astNode.type === 'ClassExpression' ||
            astNode.type === 'ClassDeclaration') {
            const observersResult = this._getObservers(astNode, document);
            observers = [];
            if (observersResult) {
                observers = observersResult.observers;
                warnings = warnings.concat(observersResult.warnings);
            }
            const polymerProps = polymer2_config_1.getPolymerProperties(astNode, document);
            for (const prop of polymerProps) {
                const constructorProp = class_.properties.get(prop.name);
                let finalProp;
                if (constructorProp) {
                    finalProp = polymer_element_1.mergePropertyDeclarations(constructorProp, prop);
                }
                else {
                    finalProp = prop;
                }
                class_.properties.set(prop.name, finalProp);
            }
            methods = esutil_1.getMethods(astNode, document);
            staticMethods = esutil_1.getStaticMethods(astNode, document);
        }
        const extendsTag = jsdoc.getTag(docs, 'extends');
        const extends_ = extendsTag !== undefined ? extendsTag.name : undefined;
        // TODO(justinfagnani): Infer mixin applications and superclass from AST.
        scannedElement = new polymer_element_1.ScannedPolymerElement({
            className: class_.name,
            tagName,
            astNode,
            properties: [...class_.properties.values()],
            methods,
            staticMethods,
            observers,
            events: esutil.getEventComments(astNode),
            attributes: new Map(),
            behaviors: [],
            extends: extends_,
            listeners: [],
            description: class_.description,
            sourceRange: class_.sourceRange,
            superClass: class_.superClass,
            jsdoc: class_.jsdoc,
            abstract: class_.abstract,
            mixins: class_.mixins,
            privacy: class_.privacy
        });
        if (astNode.type === 'ClassExpression' ||
            astNode.type === 'ClassDeclaration') {
            const observedAttributes = this._getObservedAttributes(astNode, document);
            if (observedAttributes != null) {
                // If a class defines observedAttributes, it overrides what the base
                // classes defined.
                // TODO(justinfagnani): define and handle composition patterns.
                scannedElement.attributes.clear();
                for (const attr of observedAttributes) {
                    scannedElement.attributes.set(attr.name, attr);
                }
            }
        }
        warnings.forEach((w) => scannedElement.warnings.push(w));
        return scannedElement;
    }
    _getObservers(node, document) {
        const returnedValue = polymer2_config_1.getStaticGetterValue(node, 'observers');
        if (returnedValue) {
            return declaration_property_handlers_1.extractObservers(returnedValue, document);
        }
    }
    _getObservedAttributes(node, document) {
        const returnedValue = polymer2_config_1.getStaticGetterValue(node, 'observedAttributes');
        if (returnedValue && returnedValue.type === 'ArrayExpression') {
            return this._extractAttributesFromObservedAttributes(returnedValue, document);
        }
    }
    /**
     * Extract attributes from the array expression inside a static
     * observedAttributes method.
     *
     * e.g.
     *     static get observedAttributes() {
     *       return [
     *         /** @type {boolean} When given the element is totally inactive *\/
     *         'disabled',
     *         /** @type {boolean} When given the element is expanded *\/
     *         'open'
     *       ];
     *     }
     */
    _extractAttributesFromObservedAttributes(arry, document) {
        const results = [];
        for (const expr of arry.elements) {
            const value = astValue.expressionToValue(expr);
            if (value && typeof value === 'string') {
                let description = '';
                let type = null;
                const comment = esutil.getAttachedComment(expr);
                if (comment) {
                    const annotation = jsdoc.parseJsdoc(comment);
                    description = annotation.description || description;
                    const tags = annotation.tags || [];
                    for (const tag of tags) {
                        if (tag.title === 'type') {
                            type = type || doctrine.type.stringify(tag.type);
                        }
                        // TODO(justinfagnani): this appears wrong, any tag could have a
                        // description do we really let any tag's description override
                        // the previous?
                        description = description || tag.description || '';
                    }
                }
                const attribute = {
                    name: value,
                    description: description,
                    sourceRange: document.sourceRangeForNode(expr),
                    astNode: expr,
                    warnings: [],
                };
                if (type) {
                    attribute.type = type;
                }
                results.push(attribute);
            }
        }
        return results;
    }
}
exports.ClassScanner = ClassScanner;
/**
 * Finds all classes and matches them up with their best jsdoc comment.
 */
class ClassFinder {
    constructor(document) {
        this.classes = [];
        this.warnings = [];
        this.alreadyMatched = new Set();
        this._document = document;
    }
    enterAssignmentExpression(node, parent) {
        this.handleGeneralAssignment(astValue.getIdentifierName(node.left), node.right, node, parent);
    }
    enterVariableDeclarator(node, parent) {
        if (node.init) {
            this.handleGeneralAssignment(astValue.getIdentifierName(node.id), node.init, node, parent);
        }
    }
    /** Generalizes over variable declarators and assignment expressions. */
    handleGeneralAssignment(assignedName, value, assignment, statement) {
        const comment = esutil.getAttachedComment(value) ||
            esutil.getAttachedComment(assignment) ||
            esutil.getAttachedComment(statement) || '';
        const doc = jsdoc.parseJsdoc(comment);
        if (value.type === 'ClassExpression') {
            const name = assignedName ||
                value.id && astValue.getIdentifierName(value.id) || undefined;
            this._classFound(name, doc, value);
        }
        else {
            // TODO(justinfagnani): remove @polymerElement support
            if (jsdoc.hasTag(doc, 'customElement') ||
                jsdoc.hasTag(doc, 'polymerElement')) {
                this._classFound(assignedName, doc, value);
            }
        }
    }
    enterClassExpression(node, parent) {
        // Class expressions may be on the right hand side of assignments, so
        // we may have already handled this expression from the parent or
        // grandparent node. Class declarations can't be on the right hand side of
        // assignments, so they'll definitely only be handled once.
        if (this.alreadyMatched.has(node)) {
            return;
        }
        const name = node.id ? astValue.getIdentifierName(node.id) : undefined;
        const comment = esutil.getAttachedComment(node) ||
            esutil.getAttachedComment(parent) || '';
        this._classFound(name, jsdoc.parseJsdoc(comment), node);
    }
    enterClassDeclaration(node, parent) {
        const name = astValue.getIdentifierName(node.id);
        const comment = esutil.getAttachedComment(node) ||
            esutil.getAttachedComment(parent) || '';
        this._classFound(name, jsdoc.parseJsdoc(comment), node);
    }
    _classFound(name, doc, astNode) {
        const namespacedName = name && ast_value_1.getNamespacedIdentifier(name, doc);
        const warnings = [];
        const properties = extractPropertiesFromConstructor(astNode, this._document);
        this.classes.push(new model_1.ScannedClass(namespacedName, name, astNode, doc, (doc.description || '').trim(), this._document.sourceRangeForNode(astNode), properties, esutil_1.getMethods(astNode, this._document), esutil_1.getStaticMethods(astNode, this._document), this._getExtends(astNode, doc, warnings, this._document), jsdoc.getMixinApplications(this._document, astNode, doc, warnings), esutil_1.getOrInferPrivacy(namespacedName || '', doc), warnings, jsdoc.hasTag(doc, 'abstract'), jsdoc.extractDemos(doc)));
        if (astNode.type === 'ClassExpression') {
            this.alreadyMatched.add(astNode);
        }
    }
    /**
     * Returns the name of the superclass, if any.
     */
    _getExtends(node, docs, warnings, document) {
        const extendsAnnotations = docs.tags.filter((tag) => tag.title === 'extends');
        // prefer @extends annotations over extends clauses
        if (extendsAnnotations.length > 0) {
            const extendsId = extendsAnnotations[0].name;
            // TODO(justinfagnani): we need source ranges for jsdoc annotations
            const sourceRange = document.sourceRangeForNode(node);
            if (extendsId == null) {
                warnings.push(new model_1.Warning({
                    code: 'class-extends-annotation-no-id',
                    message: '@extends annotation with no identifier',
                    severity: model_1.Severity.WARNING,
                    sourceRange,
                    parsedDocument: this._document
                }));
            }
            else {
                return new model_1.ScannedReference(extendsId, sourceRange);
            }
        }
        else if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
            // If no @extends tag, look for a superclass.
            const superClass = node.superClass;
            if (superClass != null) {
                let extendsId = ast_value_1.getIdentifierName(superClass);
                if (extendsId != null) {
                    if (extendsId.startsWith('window.')) {
                        extendsId = extendsId.substring('window.'.length);
                    }
                    const sourceRange = document.sourceRangeForNode(superClass);
                    return new model_1.ScannedReference(extendsId, sourceRange);
                }
            }
        }
    }
}
/** Finds calls to customElements.define() */
class CustomElementsDefineCallFinder {
    constructor(document) {
        this.warnings = [];
        this.calls = [];
        this._document = document;
    }
    enterCallExpression(node) {
        const callee = astValue.getIdentifierName(node.callee);
        if (!(callee === 'window.customElements.define' ||
            callee === 'customElements.define')) {
            return;
        }
        const tagNameExpression = this._getTagNameExpression(node.arguments[0]);
        if (tagNameExpression == null) {
            return;
        }
        const elementClassExpression = this._getElementClassExpression(node.arguments[1]);
        if (elementClassExpression == null) {
            return;
        }
        this.calls.push({ tagName: tagNameExpression, class_: elementClassExpression });
    }
    _getTagNameExpression(expression) {
        if (expression == null) {
            return;
        }
        const tryForLiteralString = astValue.expressionToValue(expression);
        if (tryForLiteralString != null &&
            typeof tryForLiteralString === 'string') {
            return {
                type: 'string-literal',
                value: tryForLiteralString,
                sourceRange: this._document.sourceRangeForNode(expression)
            };
        }
        if (expression.type === 'MemberExpression') {
            // Might be something like MyElement.is
            const isPropertyNameIs = (expression.property.type === 'Identifier' &&
                expression.property.name === 'is') ||
                (astValue.expressionToValue(expression.property) === 'is');
            const className = astValue.getIdentifierName(expression.object);
            if (isPropertyNameIs && className) {
                return {
                    type: 'is',
                    className,
                    classNameSourceRange: this._document.sourceRangeForNode(expression.object)
                };
            }
        }
        this.warnings.push(new model_1.Warning({
            code: 'cant-determine-element-tagname',
            message: `Unable to evaluate this expression down to a definitive string ` +
                `tagname.`,
            severity: model_1.Severity.WARNING,
            sourceRange: this._document.sourceRangeForNode(expression),
            parsedDocument: this._document
        }));
        return undefined;
    }
    _getElementClassExpression(elementDefn) {
        if (elementDefn == null) {
            return null;
        }
        const className = astValue.getIdentifierName(elementDefn);
        if (className) {
            return {
                type: 'MaybeChainedIdentifier',
                name: className,
                sourceRange: this._document.sourceRangeForNode(elementDefn)
            };
        }
        if (elementDefn.type === 'ClassExpression') {
            return elementDefn;
        }
        this.warnings.push(new model_1.Warning({
            code: 'cant-determine-element-class',
            message: `Unable to evaluate this expression down to a class reference.`,
            severity: model_1.Severity.WARNING,
            sourceRange: this._document.sourceRangeForNode(elementDefn),
            parsedDocument: this._document,
        }));
        return null;
    }
}
function extractPropertiesFromConstructor(astNode, document) {
    const properties = new Map();
    if (!(astNode.type === 'ClassExpression' ||
        astNode.type === 'ClassDeclaration')) {
        return properties;
    }
    for (const method of astNode.body.body) {
        if (method.type !== 'MethodDefinition' || method.kind !== 'constructor') {
            continue;
        }
        const constructor = method;
        for (const statement of constructor.value.body.body) {
            if (statement.type !== 'ExpressionStatement') {
                continue;
            }
            let name;
            let astNode;
            let defaultValue;
            if (statement.expression.type === 'AssignmentExpression') {
                // statements like:
                // /** @public The foo. */
                // this.foo = baz;
                name = getPropertyNameOnThisExpression(statement.expression.left);
                astNode = statement.expression.left;
                defaultValue = escodegen.generate(statement.expression.right);
            }
            else if (statement.expression.type === 'MemberExpression') {
                // statements like:
                // /** @public The foo. */
                // this.foo;
                name = getPropertyNameOnThisExpression(statement.expression);
                astNode = statement;
            }
            else {
                continue;
            }
            if (name === undefined) {
                continue;
            }
            const comment = esutil.getAttachedComment(statement);
            const jsdocAnn = comment === undefined ? undefined : jsdoc.parseJsdoc(comment);
            if (!jsdocAnn || jsdocAnn.tags.length === 0) {
                // The comment only counts if there's a jsdoc annotation in there
                // somewhere.
                // Otherwise it's just an assignment, maybe to a property in a
                // super class or something.
                continue;
            }
            const description = getDescription(jsdocAnn);
            let type = undefined;
            const typeTag = jsdoc.getTag(jsdocAnn, 'type');
            if (typeTag && typeTag.type) {
                type = doctrine.type.stringify(typeTag.type);
            }
            properties.set(name, {
                name,
                astNode,
                type,
                default: defaultValue,
                jsdoc: jsdocAnn,
                sourceRange: document.sourceRangeForNode(astNode),
                description,
                privacy: esutil_1.getOrInferPrivacy(name, jsdocAnn),
                warnings: [],
                readOnly: jsdoc.hasTag(jsdocAnn, 'const'),
            });
        }
    }
    return properties;
}
exports.extractPropertiesFromConstructor = extractPropertiesFromConstructor;
function getPropertyNameOnThisExpression(node) {
    if (node.type !== 'MemberExpression' || node.computed ||
        node.object.type !== 'ThisExpression' ||
        node.property.type !== 'Identifier') {
        return;
    }
    return node.property.name;
}
function getDescription(jsdocAnn) {
    if (jsdocAnn.description) {
        return jsdocAnn.description;
    }
    // These tags can be used to describe a field.
    // e.g.:
    //    /** @type {string} the name of the animal */
    //    this.name = name || 'Rex';
    const tagSet = new Set(['public', 'private', 'protected', 'type']);
    for (const tag of jsdocAnn.tags) {
        if (tagSet.has(tag.title) && tag.description) {
            return tag.description;
        }
    }
}

//# sourceMappingURL=class-scanner.js.map
