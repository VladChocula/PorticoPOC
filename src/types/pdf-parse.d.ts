declare module "pdf-parse" {
    interface PDFInfo {
        numpages: number,
        numrender: number;
        info: Record<string, any>;
        metadata: Record<string, any>;
        text: string;
        version: string;
    }

    function pdfParse(dataBuffer: Buffer): Promise<PDFInfo>;

    export default pdfParse;
}