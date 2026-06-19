interface LGlyphProps {
  rotation?: number;
  flip?: boolean;
  size?: number;
  color?: string;
}

/**
 * Figura asimétrica reutilizable para los reactivos de rotación espacial.
 * `flip` aplica un espejo real (no una simple rotación), lo que permite
 * construir distractores que parecen una rotación válida pero no lo son.
 */
export function LGlyph({ rotation = 0, flip = false, size = 56, color = "var(--petrol)" }: LGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g transform={`rotate(${rotation} 32 32)`}>
        <g transform={flip ? "translate(64,0) scale(-1,1)" : undefined}>
          <polygon points="14,14 50,14 50,28 28,28 28,50 14,50" fill={color} />
          <circle cx="44" cy="44" r="4" fill={color} opacity={0.55} />
        </g>
      </g>
    </svg>
  );
}
