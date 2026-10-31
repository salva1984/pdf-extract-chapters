import { cloneTemplate, getElement } from "./dom";
import type { PDFOutlineItem } from "./pdf";

/** El checkbox guarda la selección; sus datos guardan las páginas del capítulo. */
export function renderOutline(
	output: HTMLElement,
	tree: PDFOutlineItem[],
	onSelectionChange: () => void,
): void {
	let nextId = 0;

	// Clonamos el HTML y rellenamos los capítulos y sus subsecciones.
	function renderLevel(items: PDFOutlineItem[], container: HTMLElement): void {
		for (const item of items) renderItem(item, container);
	}

	function renderItem(item: PDFOutlineItem, container: HTMLElement): void {
		const hasChildren = Boolean(item.items?.length);
		const fragment = cloneTemplate(
			hasChildren ? "expandableItemTemplate" : "treeItemTemplate",
		);
		const element = fragment.firstElementChild as HTMLElement;
		const row = hasChildren ? getElement("summary", element) : element;
		row.append(cloneTemplate("sectionControlsTemplate"));
		fillSectionRow(row, item);
		if (hasChildren) {
			renderLevel(item.items ?? [], getElement(".tree-level", element));
		}
		container.append(fragment);
	}

	function fillSectionRow(row: HTMLElement, item: PDFOutlineItem) {
		const checkbox = getElement<HTMLInputElement>(".section-checkbox", row);
		const title = getElement<HTMLLabelElement>(".section-title", row);
		checkbox.id = `section-${nextId++}`;
		title.htmlFor = checkbox.id;
		title.textContent = item.title;
		getElement(".page-start", row).textContent = String(item.start + 1);
		checkbox.dataset.start = String(item.start);
		checkbox.dataset.end = String(item.end);
	}

	function handleSelectionChange(event: Event) {
		const checkbox = event.target;
		if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== "checkbox")
			return;
		checkDescendants(checkbox);
		updateAncestors(checkbox);
		onSelectionChange();
	}

	output.replaceChildren();
	renderLevel(tree, output);
	// Reemplazar el manejador evita acumular eventos cuando se carga otro PDF.
	output.onchange = handleSelectionChange;
}

// Selección descendente: un capítulo incluye todas sus subsecciones.
function checkDescendants(checkbox: HTMLInputElement) {
	const ownDetails = checkbox.closest("summary")?.closest("details");
	if (!ownDetails) return;
	for (const child of ownDetails.querySelectorAll<HTMLInputElement>(
		".section-checkbox",
	)) {
		child.checked = checkbox.checked;
		child.indeterminate = false;
	}
}

// Selección ascendente: un padre puede estar marcado, vacío o parcialmente marcado.
function updateAncestors(checkbox: HTMLInputElement) {
	const ownDetails = checkbox.closest("summary")?.closest("details");
	let parent = ownDetails
		? ownDetails.parentElement?.closest("details")
		: checkbox.closest("details");
	while (parent) {
		updateParentCheckbox(parent);
		parent = parent.parentElement?.closest("details") ?? null;
	}
}

function updateParentCheckbox(parent: HTMLDetailsElement) {
	const checkbox = getElement<HTMLInputElement>(
		":scope > summary > .section-checkbox",
		parent,
	);
	const children = Array.from(
		parent.querySelectorAll<HTMLInputElement>(
			":scope > .tree-level .section-checkbox",
		),
	);
	const allChecked =
		children.length > 0 && children.every((child) => child.checked);
	checkbox.checked = allChecked;
	checkbox.indeterminate =
		!allChecked &&
		children.some((child) => child.checked || child.indeterminate);
}
