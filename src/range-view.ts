import { cloneTemplate, getElement } from "./dom";
import { animatePageTrim, animateRangeRefresh } from "./motion";
import { isValidPageRange, type PageRange } from "./ranges";

interface RangeEditor {
	start: HTMLInputElement;
	end: HTMLInputElement;
	trimButton: HTMLButtonElement;
	error: HTMLElement;
	count: HTMLElement;
}

// Vista de los intervalos ya unidos, independiente de las casillas del índice.
export function renderRanges(
	output: HTMLElement,
	ranges: PageRange[],
	totalPages: number,
	onChange: () => void,
) {
	output.replaceChildren();
	for (const [index, range] of ranges.entries()) {
		const fragment = cloneTemplate("rangeTemplate");
		const row = fragment.firstElementChild as HTMLElement;
		getElement(".range-number", row).textContent = String(index + 1);
		bindRangeEditor(row, range, totalPages, index, onChange);
		output.append(fragment);
	}
	if (ranges.length) animateRangeRefresh(output);
}

function getEditor(row: HTMLElement): RangeEditor {
	return {
		start: getElement<HTMLInputElement>(".range-start", row),
		end: getElement<HTMLInputElement>(".range-end", row),
		trimButton: getElement<HTMLButtonElement>(".trim-end", row),
		error: getElement(".range-error", row),
		count: getElement(".range-count", row),
	};
}

function configureEditor(
	editor: RangeEditor,
	range: PageRange,
	totalPages: number,
	index: number,
) {
	const { start, end, error, trimButton } = editor;
	getElement(".total-pages", error).textContent = String(totalPages);
	error.id = `range-error-${index}`;
	start.value = String(range.start + 1);
	end.value = String(range.end + 1);
	for (const [field, label] of [
		[start, "Desde"],
		[end, "Hasta"],
	] as const) {
		field.max = String(totalPages);
		field.setAttribute("aria-label", `${label} de intervalo ${index + 1}`);
		field.setAttribute("aria-describedby", error.id);
	}
	trimButton.setAttribute(
		"aria-label",
		`Quitar una página al final de intervalo ${index + 1}`,
	);
}

// Actualización del modelo y de sus mensajes de validación.
function updateRange(
	editor: RangeEditor,
	range: PageRange,
	totalPages: number,
) {
	const first = editor.start.valueAsNumber;
	const last = editor.end.valueAsNumber;
	const valid = isValidPageRange(first, last, totalPages);
	showValidity(editor, valid);
	editor.trimButton.disabled = !valid || last <= first;
	editor.count.textContent = valid
		? `${last - first + 1} ${last === first ? "página" : "páginas"}`
		: "";
	// Un valor incompleto durante la escritura no reemplaza el último intervalo válido.
	if (valid) {
		range.start = first - 1;
		range.end = last - 1;
	}
}

function showValidity(editor: RangeEditor, valid: boolean) {
	const message = valid ? "" : (editor.error.textContent?.trim() ?? "");
	for (const field of [editor.start, editor.end]) {
		field.setCustomValidity(message);
		field.setAttribute("aria-invalid", String(!valid));
	}
	editor.error.hidden = valid;
}

function bindRangeEditor(
	row: HTMLElement,
	range: PageRange,
	totalPages: number,
	index: number,
	onChange: () => void,
) {
	const editor = getEditor(row);
	configureEditor(editor, range, totalPages, index);
	function handleInput() {
		updateRange(editor, range, totalPages);
		onChange();
	}
	editor.start.addEventListener("input", handleInput);
	editor.end.addEventListener("input", handleInput);
	editor.trimButton.addEventListener("click", () => {
		editor.end.value = String(editor.end.valueAsNumber - 1);
		handleInput();
		animatePageTrim(editor.end, editor.count);
	});
	updateRange(editor, range, totalPages);
}

/** Bloquea la descarga y enfoca el primer campo con un intervalo inválido. */
export function reportRangeValidity(output: HTMLElement): boolean {
	for (const field of output.querySelectorAll<HTMLInputElement>(
		"input[type='number']",
	)) {
		if (field.checkValidity()) continue;
		field.reportValidity();
		return false;
	}
	return true;
}
