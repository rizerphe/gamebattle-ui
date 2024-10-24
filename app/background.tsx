"use client";
import { useEffect, useRef, useState } from "react";

const InteractiveDotBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseMagentaRef = useRef({ x: 0, y: 0 });
  const mouseGreenRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const opacityRef = useRef(0); // For initial fade in
  const glowIntensityRef = useRef(0); // For glow fade in/out
  const isMouseInWindowRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set initial canvas size
    const resizeCanvas = () => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(scale, scale);
    };

    resizeCanvas();

    // Set initial positions to match the mouse when the component mounts
    const handleInitialMousePosition = (e: MouseEvent) => {
      const initialPosition = { x: e.clientX, y: e.clientY };
      mouseMagentaRef.current = initialPosition;
      mouseGreenRef.current = initialPosition;

      isMouseInWindowRef.current = true;

      // Remove the listener after setting the initial position
      window.removeEventListener("mousemove", handleInitialMousePosition);
    };
    window.addEventListener("mousemove", handleInitialMousePosition);

    // Animation variables
    const dotSpacing = 20;
    const dotRadius = 2;
    const glowRadius = 200;
    let animationId: number | null = null;

    // Animation loop
    const animate = () => {
      if (!ctx) return;

      // Increment initial fade-in opacity
      if (opacityRef.current < 1) {
        opacityRef.current = Math.min(1, opacityRef.current + 0.01);
      }

      // Handle glow intensity fade in/out
      if (isMouseInWindowRef.current) {
        glowIntensityRef.current = Math.min(1, glowIntensityRef.current + 0.05);
      } else {
        glowIntensityRef.current = Math.max(0, glowIntensityRef.current - 0.05);
      }

      // Clear canvas
      ctx.fillStyle = "rgb(0, 0, 0)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smooth mouse following for both colors
      mouseMagentaRef.current.x +=
        (targetRef.current.x - mouseMagentaRef.current.x) * 0.05;
      mouseMagentaRef.current.y +=
        (targetRef.current.y - mouseMagentaRef.current.y) * 0.05;

      mouseGreenRef.current.x +=
        (targetRef.current.x - mouseGreenRef.current.x) * 0.1;
      mouseGreenRef.current.y +=
        (targetRef.current.y - mouseGreenRef.current.y) * 0.1;

      // Draw dot grid
      const scale = window.devicePixelRatio || 1;
      for (let x = 0; x < window.innerWidth * scale; x += dotSpacing * scale) {
        for (
          let y = 0;
          y < window.innerHeight * scale;
          y += dotSpacing * scale
        ) {
          // Calculate distance from mouseMagenta
          const dxMagenta = x / scale - mouseMagentaRef.current.x;
          const dyMagenta = y / scale - mouseMagentaRef.current.y;
          const distanceMagenta = Math.sqrt(
            dxMagenta * dxMagenta + dyMagenta * dyMagenta
          );

          // Calculate distance from mouseGreen
          const dxGreen = x / scale - mouseGreenRef.current.x;
          const dyGreen = y / scale - mouseGreenRef.current.y;
          const distanceGreen = Math.sqrt(
            dxGreen * dxGreen + dyGreen * dyGreen
          );

          // Calculate dot brightness based on distance for each color
          const glowEffectMagenta = Math.max(
            0.2,
            1 - distanceMagenta / glowRadius
          );
          const glowEffectGreen = Math.max(0.2, 1 - distanceGreen / glowRadius);

          // Combine base opacity, glow effect, and glow intensity
          const brightnessMagenta =
            0.2 + (glowEffectMagenta - 0.2) * 0.5 * glowIntensityRef.current;
          const brightnessGreen =
            0.2 + (glowEffectGreen - 0.2) * 0.5 * glowIntensityRef.current;

          ctx.beginPath();
          ctx.arc(x, y, dotRadius * scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${brightnessMagenta * 255}, ${
            brightnessGreen * 255
          }, ${brightnessMagenta * 200}, ${opacityRef.current})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };
    const handleMouseEnter = () => {
      isMouseInWindowRef.current = true;
    };

    const handleMouseLeave = () => {
      isMouseInWindowRef.current = false;
    };

    // Add event listeners
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [mounted]);

  // Only render canvas on client side
  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-black pointer-events-none"
      style={{ touchAction: "none" }}
    />
  );
};

export default InteractiveDotBackground;
