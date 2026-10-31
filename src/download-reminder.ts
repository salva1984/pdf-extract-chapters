import { getElement } from "./dom";

const preferenceKey = "pdf-extract-chapters:hide-download-reminder";

function readPreference(): boolean {
	try {
		return localStorage.getItem(preferenceKey) === "true";
	} catch {
		// El aviso sigue funcionando si el navegador bloquea el almacenamiento.
		return false;
	}
}

export function setupDownloadReminder(): () => void {
	const dialog = getElement<HTMLDialogElement>("#downloadReminder");
	let suppressed = readPreference();

	dialog.addEventListener("close", () => {
		if (dialog.returnValue !== "hide") return;
		suppressed = true;
		try {
			localStorage.setItem(preferenceKey, "true");
		} catch {
			// La elección se conserva en esta sesión aunque no pueda persistirse.
		}
	});

	return function showDownloadReminder() {
		if (suppressed || dialog.open) return;
		dialog.returnValue = "";
		dialog.showModal();
	};
}
