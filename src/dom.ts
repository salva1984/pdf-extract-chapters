/** Busca un elemento obligatorio y señala qué selector falta si cambia el HTML. */
export function getElement<T extends HTMLElement = HTMLElement>(
	selector: string,
	root: ParentNode = document,
): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Missing HTML element: ${selector}`);
	return element;
}

/** La estructura vive en index.html; aquí solo clonamos sus plantillas. */
export function cloneTemplate(id: string): DocumentFragment {
	const template = getElement<HTMLTemplateElement>(`#${id}`);
	return template.content.cloneNode(true) as DocumentFragment;
}
