// Los efectos nunca retrasan la actualización de los datos ni la descarga.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const activeAnimations = new Map<HTMLElement, Animation>();

function playAnimation(
	element: HTMLElement,
	keyframes: Keyframe[],
	duration: number,
) {
	if (reducedMotion.matches) return;
	// Repetir «−1» reemplaza el efecto anterior en vez de acumular animaciones.
	activeAnimations.get(element)?.cancel();
	const animation = element.animate(keyframes, {
		duration,
		easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
	});
	activeAnimations.set(element, animation);
	function cleanup() {
		if (activeAnimations.get(element) === animation)
			activeAnimations.delete(element);
	}
	animation.finished.then(cleanup, cleanup);
}

/** Al volver a extraer, la lista completa responde como una sola unidad. */
export function animateRangeRefresh(output: HTMLElement) {
	playAnimation(
		output,
		[
			{ opacity: 0, transform: "translateX(8px)" },
			{ opacity: 1, transform: "translateX(0)" },
		],
		240,
	);
}

/** Resalta el final que cambió al quitar una página. */
export function animatePageTrim(field: HTMLInputElement, count: HTMLElement) {
	playAnimation(
		field,
		[
			{ backgroundColor: "var(--pale-blue)", borderColor: "var(--blue)" },
			{ backgroundColor: "var(--white)", borderColor: "#d4dcea" },
		],
		380,
	);
	playAnimation(count, [{ opacity: 0.35 }, { opacity: 1 }], 220);
}

// Si la preferencia cambia con un efecto en curso, lo detenemos de inmediato.
reducedMotion.addEventListener("change", () => {
	if (!reducedMotion.matches) return;
	for (const animation of activeAnimations.values()) animation.cancel();
	activeAnimations.clear();
});
