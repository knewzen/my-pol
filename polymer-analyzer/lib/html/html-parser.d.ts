import { InlineDocInfo } from '../model/model';
import { ResolvedUrl } from '../model/url';
import { Parser } from '../parser/parser';
import { ParsedHtmlDocument } from './html-document';
export declare class HtmlParser implements Parser<ParsedHtmlDocument> {
    /**
     * Parse html into ASTs.
     *
     * @param {string} htmlString an HTML document.
     * @param {string} href is the path of the document.
     */
    parse(contents: string, url: ResolvedUrl, inlineInfo?: InlineDocInfo<any>): ParsedHtmlDocument;
}
