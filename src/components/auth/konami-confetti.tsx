"use client";

import { useEffect, useState, type CSSProperties } from "react";

/** ↑ ↑ ↓ ↓ ← → ← → B A */
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

const COLORS = ["#60a5fa", "#a78bfa", "#38bdf8", "#f5f5f5", "#818cf8"];
const PIECES = 80;
const LIFETIME_MS = 3200;

interface Piece {
  id: number;
  style: CSSProperties;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, id) => {
    const size = 6 + Math.random() * 6;
    return {
      id,
      style: {
        left: `${Math.random() * 100}vw`,
        width: size,
        height: size * (0.4 + Math.random() * 0.8),
        backgroundColor: COLORS[id % COLORS.length],
        animationDelay: `${Math.random() * 500}ms`,
        // Variables lues par l'animation CSS : dérive latérale, rotation, durée.
        "--drift": `${(Math.random() - 0.5) * 30}vw`,
        "--spin": `${360 + Math.random() * 720}deg`,
        "--fall-duration": `${1.8 + Math.random() * 1.2}s`,
      } as CSSProperties,
    };
  });
}

/**
 * Easter egg : taper le code Konami fait pleuvoir des confettis quelques
 * secondes. Purement décoratif, donc ignoré par les lecteurs d'écran et
 * désactivé si l'utilisateur a demandé moins d'animations.
 */
export function KonamiConfetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    let progress = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      // Bonne touche : on avance. Mauvaise : on repart de zéro (ou de 1 si c'est un ↑).
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress < KONAMI.length) return;

      progress = 0;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setPieces(makePieces());
      clearTimeout(timer);
      timer = setTimeout(() => setPieces([]), LIFETIME_MS);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, []);

  if (pieces.length === 0) return null;
  return (
    <div aria-hidden>
      {pieces.map((piece) => (
        <span key={piece.id} className="login-confetti" style={piece.style} />
      ))}
    </div>
  );
}
