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
require("./rules");
const registry_1 = require("./registry");
const rule_1 = require("./rule");
registry_1.registry.register(new rule_1.RuleCollection('polymer-2', `Rules for projects that use Polymer 2.x`, [
    'behaviors-spelling',
    'call-super-in-callbacks',
    'content-to-slot-declarations',
    'content-to-slot-usages',
    'databind-with-unknown-property',
    'databinding-calls-must-be-functions',
    'dom-module-invalid-attrs',
    'element-before-dom-module',
    'set-unknown-attribute',
    'style-into-template',
    'unbalanced-polymer-delimiters',
    'undefined-elements',
    'deprecated-css-custom-property-syntax',
    'paper-toolbar-v1-to-v2',
]));
registry_1.registry.register(new rule_1.RuleCollection('polymer-2-hybrid', `Rules for projects that are compatible with either Polymer 1.x or 2.x

Will warn about use of deprecated Polymer 1.x features or brand new features in Polymer 2.x`, [
    'behaviors-spelling',
    'content-to-slot-declarations',
    'content-to-slot-usages',
    'databinding-calls-must-be-functions',
    'databind-with-unknown-property',
    'dom-module-invalid-attrs',
    'element-before-dom-module',
    'set-unknown-attribute',
    'style-into-template',
    'unbalanced-polymer-delimiters',
    'undefined-elements',
    'deprecated-css-custom-property-syntax',
    'paper-toolbar-v1-to-v2',
]));
registry_1.registry.register(new rule_1.RuleCollection('polymer-1', `Rules for projects that use Polymer 1.x.

For projects that are ready to start transitioning to Polymer 2.0 see polymer-2-hybrid.
`, [
    'behaviors-spelling',
    'databinding-calls-must-be-functions',
    'databind-with-unknown-property',
    'element-before-dom-module',
    'set-unknown-attribute',
    'unbalanced-polymer-delimiters',
    'undefined-elements',
]));
//# sourceMappingURL=collections.js.map