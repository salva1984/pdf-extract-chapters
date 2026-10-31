/** La selección por clic y por arrastre pasan por la misma validación. */
export function bindFileUpload(
	input: HTMLInputElement,
	target: HTMLElement,
	onFile: (file: File) => Promise<void>,
	onInvalid: () => void,
) {
	function openFile(file: File | undefined) {
		if (!file || input.disabled) return;
		if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
			onInvalid();
			return;
		}
		void onFile(file);
	}

	// Vaciar el input permite volver a elegir el mismo archivo.
	input.addEventListener("change", () => {
		openFile(input.files?.[0]);
		input.value = "";
	});

	// Los hijos del área también disparan dragenter/dragleave; el contador
	// evita que el resaltado parpadee al pasar por el icono o el texto.
	let dragDepth = 0;
	target.addEventListener("dragenter", (event) => {
		if (!event.dataTransfer?.types.includes("Files")) return;
		event.preventDefault();
		dragDepth++;
		if (!input.disabled) target.classList.add("is-dragging");
	});
	target.addEventListener("dragover", (event) => {
		if (!event.dataTransfer?.types.includes("Files")) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = input.disabled ? "none" : "copy";
	});
	target.addEventListener("dragleave", () => {
		dragDepth = Math.max(0, dragDepth - 1);
		if (!dragDepth) target.classList.remove("is-dragging");
	});
	target.addEventListener("drop", (event) => {
		event.preventDefault();
		dragDepth = 0;
		target.classList.remove("is-dragging");
		openFile(event.dataTransfer?.files[0]);
	});
}
