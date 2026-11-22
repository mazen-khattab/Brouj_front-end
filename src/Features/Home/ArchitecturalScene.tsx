import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, MathUtils } from "three";
import { LuxuryPavilion, TwilightEnvironment } from "./LuxuryPavilion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

type SceneProps = { hero: RefObject<HTMLElement | null>; onUnavailable: () => void };

function Pavilion({ hero, onUnavailable }: SceneProps) {
  const target = useRef({ x: 0, y: 0, progress: 0, visible: true });
  const invalidate = useThree((state) => state.invalidate);
  const { gl, size } = useThree();
  const modelScale = Math.min(0.78, (size.width / size.height) * 0.58);
  useEffect(() => {
    gl.domElement.addEventListener("webglcontextlost", onUnavailable);
    invalidate();
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", onUnavailable);
    };
  }, [gl, invalidate, onUnavailable]);
  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger);
    const position = target.current;
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      position.x = (event.clientX - bounds.left) / bounds.width - 0.5;
      position.y = (event.clientY - bounds.top) / bounds.height - 0.5;
      invalidate();
    };
    const reset = () => {
      position.x = 0;
      position.y = 0;
      invalidate();
    };
    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: element,
        start: "top top",
        end: "bottom top",
        onUpdate: (trigger) => {
          position.progress = trigger.progress;
          if (position.visible) invalidate();
        },
      });
    }, element);
    const observer = new IntersectionObserver(([entry]) => {
      position.visible = Boolean(entry?.isIntersecting);
      if (position.visible) invalidate();
    });
    observer.observe(element);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", reset);
    return () => {
      observer.disconnect();
      context.revert();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
    };
  }, [hero, invalidate]);
  useFrame(({ camera }, delta) => {
    const { x, y, progress, visible } = target.current;
    if (!visible) return;
    const destX = 4.25 + x * 1.7 + progress * 2.1,
      destY = 3.6 + y * 0.65 + progress * 0.8;
    camera.position.x = MathUtils.damp(camera.position.x, destX, 6, delta);
    camera.position.y = MathUtils.damp(camera.position.y, destY, 6, delta);
    camera.lookAt(0, 1.0, 0);
    if (Math.abs(camera.position.x - destX) + Math.abs(camera.position.y - destY) > 0.002) invalidate();
  });
  return (
    <>
      <TwilightEnvironment />
      <hemisphereLight args={["#8fa4bf", "#242a2c", 0.45]} />
      <directionalLight position={[-3, 7, 4]} color="#ffd8a8" intensity={2.2} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4}
        shadow-camera-top={5} shadow-camera-bottom={-3} shadow-normalBias={0.025} shadow-bias={-0.0003} />
      <directionalLight position={[4, 3, -3]} color="#13324a" intensity={1.8} />
      <group scale={modelScale} position-y={1 - modelScale}>
        <LuxuryPavilion />
      </group>
    </>
  );
}

export default function ArchitecturalScene({ hero, onUnavailable }: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      shadows="percentage"
      camera={{ position: [4.25, 3.6, 6.5], fov: 34 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <Pavilion hero={hero} onUnavailable={onUnavailable} />
    </Canvas>
  );
}
