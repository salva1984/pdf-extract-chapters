import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import * as pdfjsLib from "pdfjs-dist";

export interface PDFOutlineItem {
    title: string;
    start: number;
    items?: PDFOutlineItem[];
}

export interface PageObject {
    num: number;
    gen: number;
}

export interface PDFOutline {
    title: string;
    bold: boolean;
    italic: boolean;
    color: Uint8ClampedArray<ArrayBufferLike>;
    dest: string | Array<any> | null;
    url: string | null;
    unsafeUrl: string | undefined;
    newWindow: boolean | undefined;
    count: number | undefined;
    items: Array<any>;
}

export async function getPageIndexByNamedDestination(
    pdf: PDFDocumentProxy,
    destination: string) {
    const pageDestination = await pdf.getDestination(destination);

    if (!pageDestination) {
        throw new Error(`Destination not found for: ${destination}`);
    }

    const pageReference = pageDestination[0] as PageObject;

    if (!pageReference) {
        throw new Error(`Destination not found for: ${destination}`);
    }
    const pageIndex = await pdf.getPageIndex(pageReference);

    return pageIndex;
}


export async function constructOutlineTree(
    outline: PDFOutline[],
    pdf: pdfjsLib.PDFDocumentProxy): Promise<PDFOutlineItem[]> {
    const tree: PDFOutlineItem[] = [];

    for (const item of outline || []) {
        const outlineItem: PDFOutlineItem = {
            title: item.title,
            start: 0,
            items: [],
        };

        const destination = item.dest;

        if (typeof destination === "string") {
            outlineItem.start = await getPageIndexByNamedDestination(
                pdf,
                destination
            );
        }

        // Handle the case where the destination is an array (PageObject) Example: [PageObject, { name: "XYZ" }, 0, 0, null]
        // Explitcit destination
        if (Array.isArray(destination)) {
            const pageReference = destination[0] as PageObject;
            if (pageReference) {
                outlineItem.start = await pdf.getPageIndex(pageReference);
            }
        }

        if (item.items && item.items.length > 0) {
            outlineItem.items = await constructOutlineTree(item.items, pdf);
        }

        tree.push(outlineItem);
    }

    return tree;
}

