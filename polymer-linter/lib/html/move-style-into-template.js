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
const clone = require("clone");
const dom5 = require("dom5");
const parse5 = require("parse5");
const polymer_analyzer_1 = require("polymer-analyzer");
const registry_1 = require("../registry");
const util_1 = require("../util");
const rule_1 = require("./rule");
const util_2 = require("./util");
const p = dom5.predicates;
const styleMustBeInside = p.OR(p.hasTagName('style'), p.AND(p.hasTagName('link'), p.hasAttrValue('rel', 'stylesheet')));
const mustBeOutsideTemplate = p.AND(p.hasTagName('link'), p.hasAttrValue('rel', 'import'));
// Discoveries:
//   <style> does not work outside of template. Polymer 2.0 logs a warning.
//   <link rel="stylesheet"> does not work outside of template.
//       No runtime warning.
//   <link rel="import" type="css"> *only* works outside of template.
//       Polymer 2.0 logs a warning when you place one inside.
class MoveStyleIntoTemplate extends rule_1.HtmlRule {
    constructor() {
        super(...arguments);
        this.code = 'style-into-template';
        this.description = util_1.stripIndentation(`
      Warns about \`style\` tags in dom-modules but not in templates.

      This:

          <dom-module>
            <style></style>
            <template>foo</template>
          <dom-module>

      Should instead be written as:

          <dom-module>
            <template>
              <style></style>
              foo
            </template>
          <dom-module>
  `);
    }
    checkDocument(parsedDocument, document) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            const domModules = document.getFeatures({ kind: 'dom-module' });
            for (const domModule of domModules) {
                const moduleChildren = domModule.astNode.childNodes || [];
                const template = moduleChildren.find((n) => n.tagName === 'template');
                if (!template) {
                    continue;
                }
                for (const child of moduleChildren) {
                    if (!styleMustBeInside(child)) {
                        continue;
                    }
                    const templateContentStart = parsedDocument.sourceRangeForStartTag(template).end;
                    const styleIndentation = util_2.getIndentationInside(child);
                    const templateIndentation = util_2.getIndentationInside(parse5.treeAdapters.default.getTemplateContent(template));
                    const clonedStyle = clone(child);
                    const contents = clonedStyle.childNodes;
                    if (styleIndentation === templateIndentation && contents != null) {
                        for (const textNode of contents) {
                            util_2.addIndentation(textNode, '  ');
                        }
                    }
                    const docFrag = parse5.treeAdapters.default.createDocumentFragment();
                    dom5.append(docFrag, clonedStyle);
                    const serializedStyle = parse5.serialize(docFrag);
                    const edit = [];
                    // Delete trailing whitespace that we would leave behind.
                    const prevNode = moduleChildren[moduleChildren.indexOf(child) - 1];
                    if (prevNode && dom5.isTextNode(prevNode)) {
                        const whitespaceReplacement = util_2.removeTrailingWhitespace(prevNode, parsedDocument);
                        if (whitespaceReplacement) {
                            edit.push(whitespaceReplacement);
                        }
                    }
                    // Delete the existing location for the node
                    edit.push({
                        range: parsedDocument.sourceRangeForNode(child),
                        replacementText: ''
                    });
                    // Insert that same text inside the template element
                    const whitespaceBefore = templateIndentation ?
                        `\n${templateIndentation}` :
                        templateIndentation;
                    edit.push({
                        range: {
                            file: parsedDocument.url,
                            start: templateContentStart,
                            end: templateContentStart
                        },
                        replacementText: whitespaceBefore + serializedStyle
                    });
                    warnings.push(new polymer_analyzer_1.Warning({
                        parsedDocument,
                        code: this.code,
                        message: `Style tags should not be direct children of <dom-module>, they should be moved into the <template>`,
                        severity: polymer_analyzer_1.Severity.WARNING,
                        sourceRange: parsedDocument.sourceRangeForStartTag(child),
                        fix: edit
                    }));
                }
                const linksInShadowDom = dom5.nodeWalkAll(template, mustBeOutsideTemplate, [], dom5.childNodesIncludeTemplate);
                for (const linkInShadowDom of linksInShadowDom) {
                    let message;
                    let code;
                    if (dom5.getAttribute(linkInShadowDom, 'type') === 'css') {
                        code = 'css-import-in-shadow';
                        message = 'CSS imports inside shadow roots are ignored. ' +
                            'This should be placed inside the <dom-module>, ' +
                            'not in the <template>.';
                    }
                    else {
                        code = 'import-in-shadow';
                        message = 'Imports inside shadow roots are ignored.';
                    }
                    warnings.push(new polymer_analyzer_1.Warning({
                        code,
                        message,
                        severity: polymer_analyzer_1.Severity.WARNING, parsedDocument,
                        sourceRange: parsedDocument.sourceRangeForNode(linkInShadowDom)
                    }));
                }
            }
            // Reverse here so that when we apply the fixes we move multiple
            // styles into the template we preserve their order.
            return warnings.reverse();
        });
    }
}
registry_1.registry.register(new MoveStyleIntoTemplate());
//# sourceMappingURL=move-style-into-template.js.map