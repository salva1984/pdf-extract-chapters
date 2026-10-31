import type { PDFDocumentProxy } from "pdfjs-dist";
import { mergeRanges, type PageRange } from "./ranges";

/** Genera siempre desde el PDF original, usando una copia de los intervalos actuales. */
export async function downloadPdf(
	pdf: PDFDocumentProxy,
	ranges: PageRange[],
	fileName: string,
	link: HTMLAnchorElement,
): Promise<void> {
	const includePages = mergeRanges(ranges).map(({ start, end }) => [
		start,
		end,
	]);
	const bytes = await pdf.extractPages([{ document: null, includePages }]);
	const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);
	link.href = url;
	link.download = fileName;
	link.click();
	releaseDownloadUrl(link, url);
}

function releaseDownloadUrl(link: HTMLAnchorElement, url: string) {
	// Dejamos que el navegador inicie la descarga antes de liberar el archivo.
	setTimeout(() => {
		URL.revokeObjectURL(url);
		// Una segunda descarga puede haber reemplazado el enlace entretanto.
		if (link.getAttribute("href") === url) link.removeAttribute("href");
	}, 1000);
}
