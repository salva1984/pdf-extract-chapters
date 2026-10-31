/** Intervalo inclusivo con índices desde cero, como los espera PDF.js. */
export interface PageRange {
	start: number;
	end: number;
}

// Unir también los intervalos adyacentes evita repetir páginas al descargar.
export function mergeRanges(ranges: PageRange[]): PageRange[] {
	const merged: PageRange[] = [];
	for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
		const previous = merged.at(-1);
		if (previous && range.start <= previous.end + 1) {
			previous.end = Math.max(previous.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}
	return merged;
}

/** Validación de los números visibles, que empiezan en uno. */
export function isValidPageRange(
	start: number,
	end: number,
	totalPages: number,
): boolean {
	return (
		Number.isInteger(start) &&
		Number.isInteger(end) &&
		start >= 1 &&
		start <= end &&
		end <= totalPages
	);
}
