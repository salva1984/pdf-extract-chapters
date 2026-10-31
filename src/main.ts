import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getElement } from "./dom";
import { setupDownloadReminder } from "./download-reminder";
import { bindFileUpload } from "./file-upload";
import { renderOutline } from "./outline-view";
import { openPdf, type PDFOutlineItem } from "./pdf";
import { downloadPdf } from "./pdf-download";
import { renderRanges, reportRangeValidity } from "./range-view";
import { mergeRanges, type PageRange } from "./ranges";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Referencias al HTML. La estructura se define en index.html.
const ui = {
	app: getElement("#app"),
	input: getElement<HTMLInputElement>("#fileInput"),
	welcome: getElement("#welcome"),
	workspace: getElement("#workspace"),
	fileName: getElement("#fileName"),
	pageCount: getElement("#pageCount"),
	output: getElement("#output"),
	outlineEmpty: getElement("#outlineEmpty"),
	selectAllButton: getElement<HTMLButtonElement>("#selectAllButton"),
	selectAllLabel: getElement("#selectAllLabel"),
	selectionCount: getElement("#selectionCount"),
	extractButton: getElement<HTMLButtonElement>("#extractButton"),
	review: getElement("#extractionReview"),
	reviewEmpty: getElement("#reviewEmpty"),
	reviewTotal: getElement("#reviewTotal"),
	rangesOutput: getElement("#rangesOutput"),
	downloadButton: getElement<HTMLButtonElement>("#downloadButton"),
	downloadLink: getElement<HTMLAnchorElement>("#downloadLink"),
	downloadName: getElement("#downloadName"),
	downloadStatus: getElement("#downloadStatus"),
	status: getElement("#status"),
};
const statusMessages = ui.status.querySelectorAll<HTMLElement>("[data-status]");
const showDownloadReminder = setupDownloadReminder();

// Solo conservamos el PDF y los intervalos preparados para descargar.
// La selección se consulta directamente en los checkboxes.
let preparedRanges: PageRange[] = [];
let pdf: pdfjsLib.PDFDocumentProxy | undefined;
let originalFileName = "";
let busy = false;

// Estado de la interfaz.
function showStatus(message: string) {
	ui.status.hidden = !message;
	for (const element of statusMessages)
		element.hidden = element.dataset.status !== message;
}

function setBusy(isBusy: boolean) {
	busy = isBusy;
	ui.input.disabled = isBusy;
	ui.downloadButton.disabled = isBusy;
	ui.app.setAttribute("aria-busy", String(isBusy));
	updateSelection();
}

function updateSelection() {
	const fields = getCheckboxes();
	const checked = fields.filter((field) => field.checked).length;
	ui.selectionCount.textContent = String(getSelectedCheckboxes().length);
	ui.selectAllLabel.textContent =
		checked && checked === fields.length
			? "Quitar selección"
			: "Seleccionar todo";
	ui.selectAllButton.disabled = busy || !fields.length;
	ui.extractButton.disabled = busy || !pdf || !checked;
}

function updateReviewTotal() {
	const total = mergeRanges(preparedRanges).reduce(
		(sum, range) => sum + range.end - range.start + 1,
		0,
	);
	ui.reviewTotal.textContent = `${total} ${total === 1 ? "página" : "páginas"}`;
}

// Carga y sustitución del PDF.
function resetWorkspace() {
	preparedRanges = [];
	ui.output.replaceChildren();
	ui.rangesOutput.replaceChildren();
	ui.workspace.hidden = true;
	ui.review.hidden = true;
	ui.downloadStatus.hidden = true;
	ui.reviewEmpty.hidden = false;
	ui.reviewTotal.hidden = true;
}

function showLoadedFile(
	file: File,
	pdf: pdfjsLib.PDFDocumentProxy,
	tree: PDFOutlineItem[],
) {
	originalFileName = file.name;
	renderOutline(ui.output, tree, updateSelection);
	ui.fileName.textContent = file.name;
	ui.fileName.title = file.name;
	ui.downloadName.textContent = file.name;
	ui.pageCount.textContent = String(pdf.numPages);
	ui.outlineEmpty.hidden = tree.length > 0;
	ui.welcome.hidden = true;
	ui.workspace.hidden = false;
	showStatus("");
}

async function loadFile(file: File) {
	setBusy(true);
	resetWorkspace();
	const previousPdf = pdf;
	pdf = undefined;
	showStatus("loading");
	try {
		await previousPdf?.loadingTask.destroy();
		const loaded = await openPdf(file);
		pdf = loaded.pdf;
		showLoadedFile(file, pdf, loaded.tree);
	} catch (error) {
		console.error("Error reading PDF file:", error);
		await pdf?.loadingTask.destroy();
		pdf = undefined;
		ui.welcome.hidden = false;
		showStatus("load-error");
	} finally {
		setBusy(false);
	}
}

// Selección del índice y preparación de los intervalos editables.
function getCheckboxes(): HTMLInputElement[] {
	return Array.from(
		ui.output.querySelectorAll<HTMLInputElement>(".section-checkbox"),
	);
}

function getSelectedCheckboxes(): HTMLInputElement[] {
	return getCheckboxes().filter((checkbox) => {
		if (!checkbox.checked) return false;
		// Un capítulo marcado ya incluye sus subsecciones.
		const parent = checkbox.closest(".tree-level")?.closest("details");
		return !parent?.querySelector(
			":scope > summary > .section-checkbox:checked",
		);
	});
}

function toggleAllChapters() {
	const fields = getCheckboxes();
	const checkAll = !fields.every((field) => field.checked);
	for (const field of fields) {
		field.checked = checkAll;
		field.indeterminate = false;
	}
	// Un solo evento actualiza las casillas de padres e hijos.
	fields[0]?.dispatchEvent(new Event("change", { bubbles: true }));
}

function prepareExtraction() {
	if (!pdf || busy) return;
	preparedRanges = mergeRanges(
		getSelectedCheckboxes().map((checkbox) => ({
			start: Number(checkbox.dataset.start),
			end: Number(checkbox.dataset.end),
		})),
	);
	const hasRanges = preparedRanges.length > 0;
	ui.review.hidden = !hasRanges;
	ui.reviewEmpty.hidden = hasRanges;
	ui.reviewTotal.hidden = !hasRanges;
	ui.downloadStatus.hidden = true;
	renderRanges(
		ui.rangesOutput,
		preparedRanges,
		pdf.numPages,
		updateReviewTotal,
	);
	updateReviewTotal();
	showStatus("");
	if (hasRanges && window.matchMedia("(max-width: 760px)").matches) {
		ui.review.scrollIntoView({ behavior: "instant", block: "start" });
	}
}

// Descarga y recordatorio. El aviso solo aparece si se generó el archivo.
async function downloadExtraction() {
	if (busy || !pdf || !preparedRanges.length) return;
	if (!reportRangeValidity(ui.rangesOutput)) return;
	setBusy(true);
	ui.downloadStatus.hidden = true;
	let downloaded = false;
	try {
		await downloadPdf(pdf, preparedRanges, originalFileName, ui.downloadLink);
		showStatus("");
		ui.downloadStatus.hidden = false;
		downloaded = true;
	} catch (error) {
		console.error("Error extracting PDF pages:", error);
		showStatus("extract-error");
	} finally {
		setBusy(false);
	}
	// Abrimos el diálogo después de reactivar el botón para restaurar su foco al cerrar.
	if (downloaded) showDownloadReminder();
}

// Conexión de eventos: las funciones anteriores contienen el comportamiento.
bindFileUpload(ui.input, ui.app, loadFile, () => showStatus("invalid-file"));
ui.selectAllButton.addEventListener("click", toggleAllChapters);
ui.extractButton.addEventListener("click", prepareExtraction);
ui.downloadButton.addEventListener("click", downloadExtraction);
