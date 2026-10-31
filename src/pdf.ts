import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

/** Los índices internos empiezan en cero; la interfaz muestra páginas desde uno. */
export interface PDFOutlineItem {
	title: string;
	start: number;
	end: number;
	items?: PDFOutlineItem[];
}

export interface PageObject {
	num: number;
	gen: number;
}

export interface PDFOutline {
	title: string;
	dest: string | unknown[] | null;
	items: PDFOutline[];
}

// Carga del documento y preparación de su índice.
export async function openPdf(file: File) {
	const task = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
	try {
		const pdf = await task.promise;
		const outline = await pdf.getOutline();
		const tree = await constructOutlineTree(outline ?? [], pdf);
		setEndPages(tree, pdf.numPages - 1);
		return { pdf, tree };
	} catch (error) {
		await task.destroy();
		throw error;
	}
}

export async function constructOutlineTree(
	outline: PDFOutline[],
	pdf: PDFDocumentProxy,
): Promise<PDFOutlineItem[]> {
	const tree: PDFOutlineItem[] = [];
	for (const item of outline) {
		tree.push({
			title: item.title,
			start: await getOutlineStartPage(item, pdf),
			end: 0,
			items: await constructOutlineTree(item.items ?? [], pdf),
		});
	}
	return tree;
}

function setEndPages(tree: PDFOutlineItem[], finalPage: number) {
	// Los marcadores solo indican el inicio; el final se puede ajustar al extraer.
	for (const [index, item] of tree.entries()) {
		item.end = Math.max(item.start, tree[index + 1]?.start ?? finalPage);
		setEndPages(item.items ?? [], item.end);
	}
}

// Los PDF pueden guardar un destino con nombre o una referencia directa de página.
async function getOutlineStartPage(item: PDFOutline, pdf: PDFDocumentProxy) {
	if (typeof item.dest === "string") {
		return getPageIndexByNamedDestination(pdf, item.dest);
	}
	if (Array.isArray(item.dest) && item.dest[0]) {
		return pdf.getPageIndex(item.dest[0] as PageObject);
	}
	return 0;
}

export async function getPageIndexByNamedDestination(
	pdf: PDFDocumentProxy,
	destination: string,
) {
	const pageDestination = await pdf.getDestination(destination);
	const reference = pageDestination?.[0] as PageObject | undefined;
	if (!reference) throw new Error(`Destination not found for: ${destination}`);
	return pdf.getPageIndex(reference);
}
