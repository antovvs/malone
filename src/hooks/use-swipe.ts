"use client";

import { useEffect, type TouchEvent } from "react";

/** Distance horizontale minimale pour qu'un glissement compte. */
const SWIPE_DISTANCE = 60;
/** Zone de départ du glissement d'ouverture, depuis le bord gauche de l'écran. */
const EDGE_WIDTH = 28;

/**
 * Glisser depuis le bord gauche de l'écran vers la droite (ouvre le menu).
 * Actif uniquement sur écran tactile étroit ; les écouteurs sont passifs pour
 * ne jamais ralentir le défilement.
 */
export function useEdgeSwipe(onSwipeRight: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onStart(event: globalThis.TouchEvent) {
      const touch = event.touches[0];
      tracking = window.innerWidth < 1024 && touch.clientX <= EDGE_WIDTH;
      startX = touch.clientX;
      startY = touch.clientY;
    }
    function onEnd(event: globalThis.TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      // Un geste surtout horizontal : sinon c'est un défilement vertical.
      if (dx > SWIPE_DISTANCE && dy < dx / 2) onSwipeRight();
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onSwipeRight, enabled]);
}

/** Gestionnaires à poser sur un panneau : glisser vers la gauche le referme. */
export function swipeLeftHandlers(onSwipeLeft: () => void) {
  let startX = 0;
  let startY = 0;
  return {
    onTouchStart(event: TouchEvent) {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    onTouchEnd(event: TouchEvent) {
      const dx = startX - event.changedTouches[0].clientX;
      const dy = Math.abs(event.changedTouches[0].clientY - startY);
      if (dx > SWIPE_DISTANCE && dy < dx / 2) onSwipeLeft();
    },
  };
}
