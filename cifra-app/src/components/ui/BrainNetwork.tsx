const NODES: [number, number][] = [
  [70, 60],
  [140, 55],
  [110, 90],
  [60, 120],
  [160, 115],
  [95, 150],
  [150, 165],
  [75, 185],
];

const EDGES: [number, number][] = [
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 6],
  [5, 7],
  [6, 7],
  [0, 1],
];

interface BrainNetworkProps {
  size?: number;
}

/**
 * Ilustración propia de Cifra: una red de nodos abstracta sobre un
 * contorno geométrico simplificado. Reemplaza cualquier imagen de stock
 * o ilustración de terceros — todo el trazo se genera aquí mismo.
 */
export function BrainNetwork({ size = 200 }: BrainNetworkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden="true">
      <path
        d="M110,20 C150,15 185,40 190,75 C210,80 215,110 200,130 C210,150 200,175 180,180 C175,205 150,215 125,205 C100,220 70,215 60,195 C35,195 20,175 25,150 C10,140 10,115 25,100 C15,80 30,55 55,45 C60,25 90,15 110,20 Z"
        fill="var(--petrol-soft)"
        stroke="var(--petrol)"
        strokeWidth="2"
      />
      {EDGES.map(([a, b], i) => {
        const [x1, y1] = NODES[a]!;
        const [x2, y2] = NODES[b]!;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--violet)" strokeWidth="1.4" opacity={0.55} />;
      })}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 6 : 4} fill={i % 4 === 0 ? "var(--jade)" : "var(--petrol)"} />
      ))}
    </svg>
  );
}
