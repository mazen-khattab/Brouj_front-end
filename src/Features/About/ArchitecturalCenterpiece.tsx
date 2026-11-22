import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BoxGeometry, EdgesGeometry, LineBasicMaterial, MathUtils, MeshStandardMaterial, PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface SceneProps {
  hero: RefObject<HTMLElement | null>;
  onUnavailable: () => void;
}

function bakeStudio(gl: WebGLRenderer, scene: Scene) {
  const studio = new RoomEnvironment();
  const generator = new PMREMGenerator(gl);
  const reflection = generator.fromScene(studio, 0.04, 0.1, 100, { size: 64 });
  scene.environment = reflection.texture;
  scene.environmentIntensity = 0.8;
  generator.dispose();
  studio.dispose();
  return () => { scene.environment = null; reflection.dispose(); };
}

function Structure({ hero, onUnavailable }: SceneProps) {
  const { gl, scene, invalidate } = useThree();
  const target = useRef({ x: 0, y: 0, progress: 0, visible: true });
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);
  const navy = useMemo(() => new MeshStandardMaterial({ color: "#13324a", metalness: 0.65, roughness: 0.3 }), []);
  const gold = useMemo(() => new MeshStandardMaterial({ color: "#bfae89", metalness: 0.65, roughness: 0.3 }), []);
  const outline = useMemo(() => new LineBasicMaterial({ color: "#bfae89", transparent: true, opacity: 0.7 }), []);

  useEffect(() => () => { geometry.dispose(); edges.dispose(); navy.dispose(); gold.dispose(); outline.dispose(); }, [geometry, edges, navy, gold, outline]);
  useEffect(() => {
    const dispose = bakeStudio(gl, scene);
    gl.domElement.addEventListener("webglcontextlost", onUnavailable);
    invalidate();
    return () => {
      dispose();
      gl.domElement.removeEventListener("webglcontextlost", onUnavailable);
    };
  }, [gl, scene, invalidate, onUnavailable]);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    const position = target.current;
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      position.x = (event.clientX - bounds.left) / bounds.width - 0.5;
      position.y = (event.clientY - bounds.top) / bounds.height - 0.5;
      if (position.visible) invalidate();
    };
    const reset = () => { position.x = 0; position.y = 0; invalidate(); };
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: element, start: "top top", end: "bottom top", onUpdate: trigger => {
          position.progress = trigger.progress;
          if (position.visible) invalidate();
        }
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
      context.revert(); observer.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
    };
  }, [hero, invalidate]);

  useFrame(({ camera }, delta) => {
    const { x, y, progress, visible } = target.current;
    if (!visible) return;
    const destX = 6 + x * 1.3 + progress * 1.8;
    const destY = 4.4 + y * 0.7 + progress * 1.1;
    camera.position.x = MathUtils.damp(camera.position.x, destX, 5, delta);
    camera.position.y = MathUtils.damp(camera.position.y, destY, 5, delta);
    camera.lookAt(0, 1.5, 0);
    if (Math.abs(camera.position.x - destX) + Math.abs(camera.position.y - destY) > 0.002) invalidate();
  });

  return <>
    <color attach="background" args={["#13324a"]} />
    <hemisphereLight args={["#ffffff", "#13324a", 2]} />
    <directionalLight position={[2, 6, 4]} intensity={3} />
    <directionalLight position={[-4, 4, -3]} color="#bfae89" intensity={3} />
    <group rotation-y={-0.2}>
      <mesh position={[0, -0.15, 0]} scale={[5.8, 0.18, 4.2]} geometry={geometry}>
        <meshStandardMaterial color="#13324a" metalness={0.35} roughness={0.4} />
      </mesh>
      {([-1, 0, 1] as const).map((column, index) => {
        const height = [2.5, 4.1, 3.2][index]!;
        return <group key={column} position={[column * 1.55, height / 2 + 0.12, column * -0.35]} scale={[0.9, height, 1.25]}>
          <mesh geometry={geometry} material={index === 1 ? gold : navy} />
          <lineSegments geometry={edges} material={outline} />
        </group>;
      })}
      <lineSegments geometry={edges} position={[0, 2.25, 0]} scale={[5.5, 4.5, 3]}><lineBasicMaterial color="#bfae89" transparent opacity={0.24} /></lineSegments>
    </group>
  </>;
}

/** A demand-rendered structural study: no model downloads or continuous idle loop. */
export default function ArchitecturalCenterpiece(props: SceneProps) {
  return <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [6, 4.4, 8], fov: 36 }}
    gl={{ antialias: true, alpha: false, powerPreference: "low-power" }} fallback={null}>
    <Structure {...props} />
  </Canvas>;
}
