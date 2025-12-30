// src/components/HeroParallax.jsx
import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * HeroParallax
 * - Simple layered parallax based on mouse movement (desktop) and subtle floating animations.
 * - Props:
 *    - layers: array of { id, content (jsx/string), depth (number), className }
 *    - height: css height string (default '420px')
 */
export default function HeroParallax({ layers = [], height = "420px", className = "" }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function handleMove(e) {
      const rect = root.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) - 0.5; // -0.5 .. 0.5
      const y = ((e.clientY - rect.top) / rect.height) - 0.5;
      const nodes = root.querySelectorAll(".parallax-layer");
      nodes.forEach((node) => {
        const depth = Number(node.dataset.depth || 1);
        // smaller movement for deeper layers
        const tx = (x * depth * 12).toFixed(2);
        const ty = (y * depth * 8).toFixed(2);
        node.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });
    }

    function handleLeave() {
      const nodes = root.querySelectorAll(".parallax-layer");
      nodes.forEach((node) => {
        node.style.transform = "";
      });
    }

    // Desktop mouse move
    root.addEventListener("mousemove", handleMove);
    root.addEventListener("mouseleave", handleLeave);

    // Clean up
    return () => {
      root.removeEventListener("mousemove", handleMove);
      root.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`parallax relative overflow-hidden rounded-lg ${className}`}
      style={{ height }}
      aria-hidden="false"
    >
      {layers.map((L, i) => (
        <motion.div
          key={L.id || i}
          className={`parallax-layer absolute inset-0 ${L.className || ""}`}
          data-depth={L.depth ?? (i + 1)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 + i * 0.08, ease: "easeOut" }}
          style={{ pointerEvents: L.pointerEvents || "none" }}
        >
          {/* layer content may be JSX or a simple string */}
          <div style={{ width: "100%", height: "100%" }}>
            {typeof L.content === "string" ? (
              <div dangerouslySetInnerHTML={{ __html: L.content }} />
            ) : (
              L.content
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
