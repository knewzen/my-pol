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
const clone = require("clone");
const dom5 = require("dom5");
const parse5 = require("parse5");
const document_1 = require("../parser/document");
class ParsedHtmlDocument extends document_1.ParsedDocument {
    constructor(from) {
        super(from);
        this.type = 'html';
    }
    visit(visitors) {
        dom5.nodeWalk(this.ast, (node) => {
            visitors.forEach((visitor) => visitor(node));
            return false;
        });
    }
    // An element node with end tag information will produce a source range that
    // includes the closing tag.  It is assumed for offset calculation that the
    // closing tag is always of the expected `</${tagName}>` form.
    _sourceRangeForElementWithEndTag(node) {
        const location = node.__location;
        if (isElementLocationInfo(location)) {
            return {
                file: this.url,
                start: {
                    line: location.startTag.line - 1,
                    column: location.startTag.col - 1
                },
                end: {
                    line: location.endTag.line - 1,
                    column: location.endTag.col + (node.tagName || '').length + 2
                }
            };
        }
    }
    // parse5 locations are 1 based but ours are 0 based.
    _sourceRangeForNode(node) {
        const location = node.__location;
        if (!node.__location) {
            return;
        }
        if (isElementLocationInfo(location)) {
            if (voidTagNames.has(node.tagName || '')) {
                return this.sourceRangeForStartTag(node);
            }
            return this._sourceRangeForElementWithEndTag(node);
        }
        return this._getSourceRangeForLocation(location);
    }
    sourceRangeForAttribute(node, attrName) {
        return this._getSourceRangeForLocation(getAttributeLocation(node, attrName));
    }
    sourceRangeForAttributeName(node, attrName) {
        const range = this.sourceRangeForAttribute(node, attrName);
        if (!range) {
            return;
        }
        // The attribute name can't have any spaces, newlines, or other funny
        // business in it, so this is pretty simple.
        return {
            file: range.file,
            start: range.start,
            end: {
                line: range.start.line,
                column: range.start.column + attrName.length
            }
        };
    }
    sourceRangeForAttributeValue(node, attrName, excludeQuotes) {
        const attributeRange = this.sourceRangeForAttribute(node, attrName);
        if (!attributeRange) {
            return;
        }
        // This is an attribute without a value.
        if ((attributeRange.start.line === attributeRange.end.line) &&
            (attributeRange.end.column - attributeRange.start.column ===
                attrName.length)) {
            return undefined;
        }
        const location = getAttributeLocation(node, attrName);
        // This is complex because there may be whitespace around the = sign.
        const fullAttribute = this.contents.substring(location.startOffset, location.endOffset);
        const equalsIndex = fullAttribute.indexOf('=');
        if (equalsIndex === -1) {
            // This is super weird and shouldn't happen, but it's probably better to
            // just return the most reasonable thing we have here rather than
            // throwing.
            return undefined;
        }
        const whitespaceAfterEquals = fullAttribute.substring(equalsIndex + 1).match(/[\s\n]*/)[0];
        let endOfTextToSkip = 
        // the beginning of the attribute key value pair
        location.startOffset +
            // everything up to the equals sign
            equalsIndex +
            // plus one for the equals sign
            1 +
            // plus all the whitespace after the equals sign
            whitespaceAfterEquals.length;
        if (excludeQuotes) {
            const maybeQuote = this.contents.charAt(endOfTextToSkip);
            if (maybeQuote === '\'' || maybeQuote === '"') {
                endOfTextToSkip += 1;
            }
        }
        return this.offsetsToSourceRange(endOfTextToSkip, location.endOffset);
    }
    sourceRangeForStartTag(node) {
        return this._getSourceRangeForLocation(getStartTagLocation(node));
    }
    sourceRangeForEndTag(node) {
        return this._getSourceRangeForLocation(getEndTagLocation(node));
    }
    _getSourceRangeForLocation(location) {
        if (!location) {
            return;
        }
        return this.offsetsToSourceRange(location.startOffset, location.endOffset);
    }
    stringify(options) {
        options = options || {};
        /**
         * We want to mutate this.ast with the results of stringifying our inline
         * documents. This will mutate this.ast even if no one else has mutated it
         * yet, because our inline documents' stringifiers may not perfectly
         * reproduce their input. However, we don't want to mutate any analyzer
         * object after they've been produced and cached, ParsedHtmlDocuments
         * included. So we want to clone first.
         *
         * Because our inline documents contain references into this.ast, we need to
         * make of copy of `this` and the inline documents such the
         * inlineDoc.astNode references into this.ast are maintained. Fortunately,
         * clone() does this! So we'll clone them all together in a single call by
         * putting them all into an array.
         */
        const immutableDocuments = options.inlineDocuments || [];
        immutableDocuments.unshift(this);
        // We can modify these, as they don't escape this method.
        const mutableDocuments = clone(immutableDocuments);
        const selfClone = mutableDocuments.shift();
        for (const doc of mutableDocuments) {
            // TODO(rictic): infer this from doc.astNode's indentation.
            const expectedIndentation = 2;
            dom5.setTextContent(doc.astNode, '\n' + doc.stringify({
                indent: expectedIndentation
            }) + '  '.repeat(expectedIndentation - 1));
        }
        removeFakeNodes(selfClone.ast);
        return parse5.serialize(selfClone.ast);
    }
}
exports.ParsedHtmlDocument = ParsedHtmlDocument;
const injectedTagNames = new Set(['html', 'head', 'body']);
function removeFakeNodes(ast) {
    const children = (ast.childNodes || []).slice();
    if (ast.parentNode && isFakeNode(ast)) {
        for (const child of children) {
            dom5.insertBefore(ast.parentNode, ast, child);
        }
        dom5.remove(ast);
    }
    for (const child of children) {
        removeFakeNodes(child);
    }
}
function isFakeNode(ast) {
    return !ast.__location && injectedTagNames.has(ast.nodeName);
}
exports.isFakeNode = isFakeNode;
function isElementLocationInfo(location) {
    const loc = location;
    return (loc.startTag && loc.endTag) != null;
}
function getStartTagLocation(node) {
    if (voidTagNames.has(node.tagName || '')) {
        return node.__location;
    }
    if ('startTag' in node.__location) {
        return node.__location.startTag;
    }
    // Sometimes parse5 throws an attrs attribute on a location info that seems
    // to correspond to an unclosed tag with attributes but no children.
    // In that case, the node's location corresponds to the start tag. In other
    // cases though, node.__location will include children.
    if ('attrs' in node.__location) {
        return node.__location;
    }
}
function getEndTagLocation(node) {
    if ('endTag' in node.__location) {
        return node.__location.endTag;
    }
}
function getAttributeLocation(node, attrName) {
    if (!node || !node.__location) {
        return;
    }
    let attrs = undefined;
    const location = node.__location;
    const elemLocation = location;
    const elemStartLocation = location;
    if (elemLocation.startTag !== undefined && elemLocation.startTag.attrs) {
        attrs = elemLocation.startTag.attrs;
    }
    else if (elemStartLocation.attrs !== undefined) {
        attrs = elemStartLocation.attrs;
    }
    if (!attrs) {
        return;
    }
    return attrs[attrName];
}
/**
 * HTML5 treats these tags as *always* self-closing. This is relevant for
 * getting start tag information.
 *
 * Source: https://www.w3.org/TR/html5/syntax.html#void-elements
 */
const voidTagNames = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
]);

//# sourceMappingURL=html-document.js.map
