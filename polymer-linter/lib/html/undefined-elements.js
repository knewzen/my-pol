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
const polymer_analyzer_1 = require("polymer-analyzer");
const registry_1 = require("../registry");
const util_1 = require("../util");
const rule_1 = require("./rule");
class UndefinedElements extends rule_1.HtmlRule {
    constructor() {
        super(...arguments);
        this.code = 'undefined-elements';
        this.description = util_1.stripIndentation(`
    Warns when an HTML tag refers to a custom element with no known definition.
  `);
    }
    checkDocument(parsedDocument, document) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            const refs = document.getFeatures({ kind: 'element-reference' });
            for (const ref of refs) {
                if (ref.tagName === 'test-fixture') {
                    // HACK. Filed as https://github.com/Polymer/polymer-analyzer/issues/507
                    continue;
                }
                // TODO(rictic): ASTNodes should always exist for element references, and
                //   it should always be possible to get their start tags, but we saw some
                //   errors where the source range was undefined. Needs investigation.
                if (!ref.astNode) {
                    continue;
                }
                const el = document.getFeatures({
                    kind: 'element',
                    id: ref.tagName,
                    imported: true,
                    externalPackages: true
                });
                if (el.size === 0) {
                    const sourceRange = parsedDocument.sourceRangeForStartTag(ref.astNode);
                    if (!sourceRange) {
                        continue;
                    }
                    warnings.push(new polymer_analyzer_1.Warning({
                        parsedDocument,
                        code: 'undefined-elements',
                        message: `The element ${ref.tagName} is not defined`,
                        severity: polymer_analyzer_1.Severity.WARNING, sourceRange
                    }));
                }
            }
            return warnings;
        });
    }
}
registry_1.registry.register(new UndefinedElements());
//# sourceMappingURL=undefined-elements.js.map