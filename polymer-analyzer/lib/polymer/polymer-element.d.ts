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
import * as dom5 from 'dom5';
import * as estree from 'estree';
import { Annotation as JsDocAnnotation } from '../javascript/jsdoc';
import { ImmutableArray } from '../model/immutable';
import { Class, Document, Element, ElementBase, LiteralValue, Privacy, Property, ScannedAttribute, ScannedElement, ScannedElementBase, ScannedEvent, ScannedMethod, ScannedProperty, SourceRange, Warning } from '../model/model';
import { ScannedReference } from '../model/reference';
import { Behavior, ScannedBehaviorAssignment } from './behavior';
import { JavascriptDatabindingExpression } from './expression-scanner';
export interface BasePolymerProperty {
    published?: boolean;
    notify?: boolean;
    observer?: string;
    observerNode?: estree.Expression | estree.Pattern;
    observerExpression?: JavascriptDatabindingExpression;
    reflectToAttribute?: boolean;
    computedExpression?: JavascriptDatabindingExpression;
    /**
     * True if the property is part of Polymer's element configuration syntax.
     *
     * e.g. 'properties', 'is', 'extends', etc
     */
    isConfiguration?: boolean;
}
export interface ScannedPolymerProperty extends ScannedProperty, BasePolymerProperty {
}
export interface PolymerProperty extends Property, BasePolymerProperty {
}
export declare function mergePropertyDeclarations(propA: Readonly<ScannedPolymerProperty>, propB: Readonly<ScannedPolymerProperty>): ScannedPolymerProperty;
export declare class LocalId {
    name: string;
    range: SourceRange;
    constructor(name: string, range: SourceRange);
}
export interface Observer {
    javascriptNode: estree.Expression | estree.SpreadElement;
    expression: LiteralValue;
    parsedExpression: JavascriptDatabindingExpression | undefined;
}
export interface Options {
    tagName: string | undefined;
    className: string | undefined;
    superClass: ScannedReference | undefined;
    mixins: ScannedReference[];
    extends: string | undefined;
    jsdoc: JsDocAnnotation;
    description: string | undefined;
    properties: ScannedProperty[];
    methods: Map<string, ScannedMethod>;
    staticMethods: Map<string, ScannedMethod>;
    attributes: Map<string, ScannedAttribute>;
    observers: Observer[];
    listeners: {
        event: string;
        handler: string;
    }[];
    behaviors: ScannedBehaviorAssignment[];
    events: Map<string, ScannedEvent>;
    abstract: boolean;
    privacy: Privacy;
    astNode: any;
    sourceRange: SourceRange | undefined;
}
export interface ScannedPolymerExtension extends ScannedElementBase {
    properties: Map<string, ScannedPolymerProperty>;
    methods: Map<string, ScannedMethod>;
    observers: Observer[];
    listeners: {
        event: string;
        handler: string;
    }[];
    behaviorAssignments: ScannedBehaviorAssignment[];
    pseudo: boolean;
    addProperty(prop: ScannedPolymerProperty): void;
}
export declare function addProperty(target: ScannedPolymerExtension, prop: ScannedPolymerProperty): void;
export declare function addMethod(target: ScannedPolymerExtension, method: ScannedMethod): void;
/**
 * The metadata for a single polymer element
 */
export declare class ScannedPolymerElement extends ScannedElement implements ScannedPolymerExtension {
    properties: Map<string, ScannedPolymerProperty>;
    methods: Map<string, ScannedMethod>;
    observers: Observer[];
    listeners: {
        event: string;
        handler: string;
    }[];
    behaviorAssignments: ScannedBehaviorAssignment[];
    pseudo: boolean;
    abstract: boolean;
    constructor(options: Options);
    addProperty(prop: ScannedPolymerProperty): void;
    addMethod(method: ScannedMethod): void;
    resolve(document: Document): PolymerElement;
}
export interface PolymerExtension extends ElementBase {
    properties: Map<string, PolymerProperty>;
    observers: ImmutableArray<{
        javascriptNode: estree.Expression | estree.SpreadElement;
        expression: LiteralValue;
        parsedExpression: JavascriptDatabindingExpression | undefined;
    }>;
    listeners: ImmutableArray<{
        event: string;
        handler: string;
    }>;
    behaviorAssignments: ImmutableArray<ScannedBehaviorAssignment>;
    localIds: ImmutableArray<LocalId>;
    emitPropertyMetadata(property: PolymerProperty): any;
}
declare module '../model/queryable' {
    interface FeatureKindMap {
        'polymer-element': PolymerElement;
        'pseudo-element': Element;
    }
}
export declare class PolymerElement extends Element implements PolymerExtension {
    readonly properties: Map<string, PolymerProperty>;
    readonly observers: ImmutableArray<Observer>;
    readonly listeners: ImmutableArray<{
        event: string;
        handler: string;
    }>;
    readonly behaviorAssignments: ImmutableArray<ScannedBehaviorAssignment>;
    readonly domModule?: dom5.Node;
    readonly localIds: ImmutableArray<LocalId>;
    constructor(scannedElement: ScannedPolymerElement, document: Document);
    emitPropertyMetadata(property: PolymerProperty): {
        polymer: {
            notify?: boolean | undefined;
            observer?: string | undefined;
            readOnly?: boolean | undefined;
        };
    };
    protected _getSuperclassAndMixins(document: Document, init: ScannedPolymerElement): Class[];
}
export declare function getBehaviors(behaviorAssignments: ImmutableArray<ScannedBehaviorAssignment>, document: Document): {
    warnings: Warning[];
    behaviors: Behavior[];
};
