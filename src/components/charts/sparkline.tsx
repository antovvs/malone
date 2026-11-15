/**
 * Mini-courbe de tendance d'une tuile d'indicateur.
 * Volontairement sans axe ni valeur : elle donne l'allure (ça monte, ça baisse,
 * c'est irrégulier), le chiffre exact est dans la tuile et dans les graphiques.
 */

const WIDTH = 100;
const HEIGHT = 28;
/** Marge verticale pour que le trait ne soit pas rogné en haut et en bas. */
const PAD = 3;

export function Sparkline({ values }: { values: (number | null)[] }) {
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => point.value !== null);
  // Moins de 3 points : pas assez pour parler de tendance.
  if (points.length < 3) return null;

  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const span = max - min || 1;
  const lastIndex = Math.max(values.length - 1, 1);

  const coords = points.map((point) => {
    const x = (point.index / lastIndex) * WIDTH;
    // Série plate : on la trace au milieu plutôt que collée en bas.
    const y = max === min ? HEIGHT / 2 : HEIGHT - PAD - ((point.value - min) / span) * (HEIGHT - PAD * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coords.join(" L")}`;
  const firstX = coords[0].split(",")[0];
  const lastX = coords[coords.length - 1].split(",")[0];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="mt-1 h-7 w-full"
      // Décoratif : les mêmes données sont lisibles dans les graphiques et leurs tableaux.
      aria-hidden
    >
      <path d={`${line} L${lastX},${HEIGHT} L${firstX},${HEIGHT} Z`} fill="var(--series-1)" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Garde un trait de 2 px même quand le SVG est étiré en largeur.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
