import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { constructOutlineTree, type PDFOutlineItem } from "./pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const input = document.getElementById("fileInput") as HTMLInputElement;

let tree: PDFOutlineItem[] = [];

input.addEventListener("change", async (event) => {
	const file = (event.target as HTMLInputElement).files?.[0];

	if (!file) {
		console.error("No file selected");
		return;
	}

	try {
		const arrayBuffer: ArrayBuffer = await file.arrayBuffer();

		const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

		const outline = await pdf.getOutline();

		tree = await constructOutlineTree(outline || [], pdf);

		console.log("Constructed tree:", tree);
	} catch (error) {
		console.error("Error reading PDF file:", error);
	}
	const output = document.getElementById("output");

	if (output) {
		output.innerHTML = ""; // Clear previous content
		const treeView = createTreeView(tree);
		output.appendChild(treeView);
	}
});

function createTreeView(tree: PDFOutlineItem[]): HTMLElement {
	const out = document.createElement("div");
	out.className = "tree-level";

	for (const item of tree) {
		// If the item has children, create an expandable item
		if (item.items && item.items.length > 0) {
			renderExpandableItem(item, out);
		} else {
			// If the item has no children, create a simple tree item
			renderTreeItem(item, out);
		}
	}
	return out;
}

function renderTreeItem(item: PDFOutlineItem, out: HTMLDivElement) {
	const div = document.createElement("div");
	div.className = "tree-item";
	div.textContent = ` ${item.title} - Página: ${item.start + 1}`;
	const checkbox = createCheckbox(item);
	div.prepend(checkbox);
	out.appendChild(div);
}

function renderExpandableItem(item: PDFOutlineItem, out: HTMLDivElement) {
	const summary = document.createElement("summary");
	summary.textContent = ` ${item.title} - Página: ${item.start + 1}`;
	const checkbox = createCheckbox(item);
	summary.prepend(checkbox);

	const details = document.createElement("details");
	details.appendChild(summary);

	// Recursively create the tree view for child items
	const childTreeView = createTreeView(item.items || []);

	details.appendChild(childTreeView);
	out.appendChild(details);
}

function createCheckbox(item: PDFOutlineItem): HTMLInputElement {
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.addEventListener("change", () => {
		const summary = checkbox.closest("summary");


		// Si no es un nodo expandible, no hay hijos que modificar.
		if (!summary) {
			uncheckParentFromLeaf(checkbox);
			return;
		};

		if (!checkbox.checked) {
			uncheckParentFromNode(checkbox);
		}

		// El padre directo del summary debe ser un details.
		const details = summary.parentElement;

		if (details instanceof HTMLDetailsElement) {
			checkChildCheckboxes(details, checkbox.checked);
		}
	});
	return checkbox;
}

function checkChildCheckboxes(parent: HTMLElement, isChecked: boolean) {
	const childCheckboxes = parent.querySelectorAll<HTMLInputElement>(
		"input[type='checkbox']",
	);
	childCheckboxes.forEach((checkbox) => {
		if (!isChecked) {
			checkbox.indeterminate = false;
		}
		checkbox.checked = isChecked;
	});
}

function uncheckParentFromNode(checkbox: HTMLInputElement) {
	let parentDetails = checkbox.closest("details")?.parentElement;

	while (parentDetails) {
		const parentSummaryCheckbox = parentDetails.querySelector<HTMLInputElement>(
			":scope > summary > input[type='checkbox']"
		);

		if (parentSummaryCheckbox) {
			if (parentSummaryCheckbox.checked) {
				parentSummaryCheckbox.checked = false;
				parentSummaryCheckbox.indeterminate = true;
			}
		};

		// traverse up the tree
		parentDetails = parentDetails.parentElement?.closest("details") ?? null;
	}
}

function uncheckParentFromLeaf(checkbox: HTMLInputElement) {
	let parentDetails = checkbox.closest("details");
	const isChecked = checkbox.checked;

	while (parentDetails) {
		const parentSummaryCheckbox = parentDetails.querySelector<HTMLInputElement>(
			":scope > summary > input[type='checkbox']"
		);

		const parentSiblingCheckboxes = parentDetails.querySelectorAll<HTMLInputElement>(
			":scope > div input[type='checkbox']"
		);

		let siblingCheckboxes = Array.from(parentSiblingCheckboxes)
		
		// console.log("parentscbk", parentSiblingCheckboxes)

		if (parentSummaryCheckbox) {
			if (!isChecked) {
				parentSummaryCheckbox.checked = false;
				parentSummaryCheckbox.indeterminate = true;
			} else if (areAllSiblingsChecked(siblingCheckboxes)) {
				parentSummaryCheckbox.checked = true;
				parentSummaryCheckbox.indeterminate = false;
			};

		};

		// traverse up the tree
		parentDetails = parentDetails.parentElement?.closest("details") ?? null;
	}
}

function areAllSiblingsChecked(checkboxes: HTMLInputElement[]): boolean {
	return checkboxes.length > 0 && checkboxes.every(checkbox => checkbox.checked)
}

function updateParentCheckboxes(checkbox: HTMLInputElement) {
	// Si el checkbox pertenece a un summary, su propio
	// details no debe considerarse un ancestro lógico.
	const ownDetails = checkbox.closest("summary")
		?.closest("details");

	let parentDetails = ownDetails
		? ownDetails.parentElement?.closest("details")
		: checkbox.closest("details");

	while (parentDetails) {
		const parentCheckbox =
			parentDetails.querySelector<HTMLInputElement>(
				":scope > summary > input[type='checkbox']"
			);

		const childCheckboxes =
			parentDetails.querySelectorAll<HTMLInputElement>(
				":scope > .tree-level input[type='checkbox']"
			);

		if (parentCheckbox) {
			const children = Array.from(childCheckboxes);

			const allChecked =
				children.length > 0 &&
				children.every(cb => cb.checked);

			const someChecked =
				children.some(cb => cb.checked || cb.indeterminate);

			parentCheckbox.checked = allChecked;
			parentCheckbox.indeterminate = someChecked && !allChecked;
		}

		// Continuar hacia el siguiente ancestro
		parentDetails =
			parentDetails.parentElement?.closest("details") ?? null;
	}
  }