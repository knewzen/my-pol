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
const dom5 = require("dom5");
const polymer_analyzer_1 = require("polymer-analyzer");
const registry_1 = require("../registry");
const util_1 = require("../util");
const util_2 = require("../util");
const rule_1 = require("./rule");
const p = dom5.predicates;
class DomModuleNameOrIs extends rule_1.HtmlRule {
    constructor() {
        super(...arguments);
        this.code = 'dom-module-invalid-attrs';
        this.description = util_2.stripIndentation(`
      Warns for:

          <dom-module name="foo-elem">
          </dom-module>

      or

          <dom-module is="foo-elem">
          </dom-module>

      Correct syntax:

          <dom-module id="foo-elem">
          </dom-module>
  `);
    }
    checkDocument(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            const badModule = p.AND(p.hasTagName('dom-module'), p.OR(p.hasAttr('is'), p.hasAttr('name')));
            const badModules = dom5.nodeWalkAll(document.ast, badModule);
            for (const domModule of badModules) {
                for (const badAttr of ['is', 'name']) {
                    const attr = dom5.getAttribute(domModule, badAttr);
                    if (attr != null) {
                        warnings.push(new polymer_analyzer_1.Warning({
                            parsedDocument: document,
                            code: this.code,
                            message: util_1.stripWhitespace(`
                Use the "id" attribute rather than "${badAttr}"
                to associate the tagName of an element with its dom-module.`),
                            severity: polymer_analyzer_1.Severity.WARNING,
                            sourceRange: document.sourceRangeForAttributeName(domModule, badAttr)
                        }));
                    }
                }
            }
            return warnings;
        });
    }
}
registry_1.registry.register(new DomModuleNameOrIs());
//# sourceMappingURL=dom-module-name-or-is.js.map