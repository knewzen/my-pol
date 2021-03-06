[![view on npm](http://img.shields.io/npm/v/wordwrapjs.svg)](https://www.npmjs.org/package/wordwrapjs)
[![npm module downloads](http://img.shields.io/npm/dt/wordwrapjs.svg)](https://www.npmjs.org/package/wordwrapjs)
[![Build Status](https://travis-ci.org/75lb/wordwrapjs.svg?branch=master)](https://travis-ci.org/75lb/wordwrapjs)
[![Dependency Status](https://david-dm.org/75lb/wordwrapjs.svg)](https://david-dm.org/75lb/wordwrapjs)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

# wordwrapjs

Word wrapping, with a few features.

- force-break option
- wraps hypenated words
- multilingual - wraps any language that uses whitespace for word separation.

## Synopsis

Wrap some text in a 20 character column.

```js
> wordwrap = require('wordwrapjs')

> text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

> result = wordwrap.wrap(text, { width: 20 })
```

`result` now looks like this:
```
Lorem ipsum dolor
sit amet,
consectetur
adipiscing elit, sed
do eiusmod tempor
incididunt ut labore
et dolore magna
aliqua.
```

By default, long words will not break. Unless you set the `break` option.
```js
> url = 'https://github.com/75lb/wordwrapjs'

> wrap.lines(url, { width: 18 })
[ 'https://github.com/75lb/wordwrapjs' ]

> wrap.lines(url, { width: 18, break: true })
[ 'https://github.com', '/75lb/wordwrapjs' ]
```

## API Reference


* [wordwrapjs](#module_wordwrapjs)
    * [WordWrap](#exp_module_wordwrapjs--WordWrap) ⏏
        * [.wrap(text, [options])](#module_wordwrapjs--WordWrap.wrap) ⇒ <code>string</code>
        * [.lines(text, options)](#module_wordwrapjs--WordWrap.lines)
        * [.isWrappable(text)](#module_wordwrapjs--WordWrap.isWrappable) ⇒ <code>boolean</code>
        * [.getChunks(text)](#module_wordwrapjs--WordWrap.getChunks) ⇒ <code>Array.&lt;string&gt;</code>

<a name="exp_module_wordwrapjs--WordWrap"></a>

### WordWrap ⏏
**Kind**: Exported class  
<a name="module_wordwrapjs--WordWrap.wrap"></a>

#### wordwrap.wrap(text, [options]) ⇒ <code>string</code>
**Kind**: static method of <code>[WordWrap](#exp_module_wordwrapjs--WordWrap)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | the input text to wrap |
| [options] | <code>object</code> | optional configuration |
| [options.width] | <code>number</code> | the max column width in characters (defaults to 30). |
| [options.break] | <code>boolean</code> | if true, words exceeding the specified `width` will be forcefully broken |
| [options.noTrim] | <code>boolean</code> | By default, each line output is trimmed. If `noTrim` is set, no line-trimming occurs - all whitespace from the input text is left in. |

<a name="module_wordwrapjs--WordWrap.lines"></a>

#### wordwrap.lines(text, options)
Wraps the input text, returning an array of strings (lines).

**Kind**: static method of <code>[WordWrap](#exp_module_wordwrapjs--WordWrap)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | input text |
| options | <code>object</code> | Accepts same options as constructor. |

<a name="module_wordwrapjs--WordWrap.isWrappable"></a>

#### wordwrap.isWrappable(text) ⇒ <code>boolean</code>
Returns true if the input text would be wrapped if passed into `.wrap()`.

**Kind**: static method of <code>[WordWrap](#exp_module_wordwrapjs--WordWrap)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | input text |

<a name="module_wordwrapjs--WordWrap.getChunks"></a>

#### wordwrap.getChunks(text) ⇒ <code>Array.&lt;string&gt;</code>
Splits the input text into an array of words and whitespace.

**Kind**: static method of <code>[WordWrap](#exp_module_wordwrapjs--WordWrap)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | input text |


* * *

&copy; 2015-16 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
