import { App, Request, Response } from "@tinyhttp/app";
type HtmlTemplate = (js: string, preRender: string, stylesheet: string) => string;
type JsTemplate = (state: any, scriptPath: string) => string;
interface HyperlightConfiguration {
    host: string;
    port: string | number;
    dev: undefined | true;
}
interface HyperlightPage {
    pageImport: any;
    script: string;
    outputPaths: {
        html: string;
        script: string;
    };
    routes: {
        base: string;
        html: string | undefined;
        script: string;
        stylesheet: string;
    };
}
declare class HyperlightServer {
    config: Partial<HyperlightConfiguration>;
    app: App;
    cacheDir: string;
    constructor(config?: Partial<HyperlightConfiguration>);
    devServer(): void;
    prodServer(): Promise<void>;
    staticallyCache(page: HyperlightPage, htmlTemplate: HtmlTemplate, jsTemplate: JsTemplate): Promise<void>;
    ssrMw(page: HyperlightPage, htmlTemplate: HtmlTemplate, jsTemplate: JsTemplate): (req: Request, res: Response) => Promise<void>;
    normalizeRoute(route: string): string;
}
declare const Hyperlight: (config?: Partial<HyperlightConfiguration> | undefined) => HyperlightServer;
export { Hyperlight, HyperlightServer };
