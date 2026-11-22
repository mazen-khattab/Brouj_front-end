import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { ContactShadows, Environment } from "@react-three/drei";
import { DataTexture, InstancedMesh, Object3D, RepeatWrapping, RedFormat, type BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import sunsetEnvironment from "../../assets/home/venice-sunset-1k.hdr?url";

type Box = [number, number, number, number, number, number];
const stone: Box[] = [];
const glass: Box[] = [];
const warmGlass: Box[] = [];
const dimGlass: Box[] = [];
const guards: Box[] = [];
const brass: Box[] = [];
const dark: Box[] = [[0, -0.17, 0, 5.8, 0.22, 3.6]];
const planting: Box[] = [];
const led: Box[] = [];
const rooms: [Box[], Box[], Box[]] = [[], [], []];
const curtains: Box[] = [];

// Separate panes, recessed rooms and projecting terraces give the facade real depth.
for (let floor = 0; floor < 4; floor++) {
  const x = floor * 0.16, y = floor * 0.59, width = 4.9 - floor * 0.42;
  stone.push([x, y, 0, width, 0.105, 2.75]);
  dark.push([x, y + 0.29, -0.68, width - 0.5, 0.47, 0.08]);
  led.push([x, y + 0.548, 1.025, width - 0.4, 0.014, 0.025]);
  brass.push([x, y + 0.075, 1.37, width - 0.06, 0.016, 0.025]);
  const bayWidth = (width - 0.5) / 7;
  for (let bay = 0; bay < 7; bay++) {
    const bx = x + (bay - 3) * bayWidth;
    const room = (bay * 3 + floor * 2) % 5 === 0 ? rooms[0] : (bay + floor) % 2 === 0 ? rooms[1] : rooms[2];
    (room === rooms[0] ? glass : room === rooms[1] ? warmGlass : dimGlass)
      .push([bx, y + 0.3, 0.89, bayWidth - 0.025, 0.46, 0.018]);
    room.push([bx, y + 0.29, 0.30, bayWidth - 0.05, 0.4, 0.025]);
    stone.push([bx + bayWidth / 2, y + 0.29, -0.12, 0.025, 0.47, 1.65]);
    brass.push([bx - bayWidth / 2, y + 0.3, 0.91, 0.018, 0.48, 0.035]);
    if ((bay + floor) % 3 === 0)
      curtains.push([bx + 0.12, y + 0.3, 0.78, bayWidth * 0.26, 0.43, 0.025]);
  }
  // Clear balcony guards stand in front of the recessed window wall.
  guards.push([x, y + 0.205, 1.31, width - 0.1, 0.27, 0.015]);
  brass.push([x, y + 0.345, 1.32, width - 0.08, 0.016, 0.025]);
  for (const side of [-1, 1]) {
    const sx = x + side * (width - 0.46) / 2;
    for (let bay = 0; bay < 3; bay++) {
      ((bay + floor) % 3 === 0 ? glass : (bay + floor) % 2 === 0 ? warmGlass : dimGlass)
        .push([sx, y + 0.3, (bay - 1) * 0.58, 0.018, 0.46, 0.56]);
      brass.push([sx, y + 0.3, (bay - 1.5) * 0.58, 0.035, 0.48, 0.018]);
    }
    guards.push([x + side * (width - 0.13) / 2, y + 0.205, 0, 0.015, 0.27, 2.6]);
    brass.push([x + side * (width - 0.13) / 2, y + 0.345, 0, 0.025, 0.016, 2.6]);
    for (let i = 0; i < 13; i++) {
      brass.push([sx + side * 0.05, y + 0.3, -0.88 + i * 0.065, 0.13, 0.47, 0.018]);
    }
    led.push([sx, y + 0.548, 0, 0.018, 0.014, 1.92]);
  }
}
stone.push([0.48, 2.36, 0, 3.64, 0.1, 2.75]);
// Rooftop penthouse, pergola, pool coping and low planted borders.
dark.push([0.68, 2.55, -0.42, 1.45, 0.3, 0.7]);
glass.push([0.68, 2.55, -0.04, 1.43, 0.3, 0.018]);
stone.push([0.68, 2.74, -0.3, 1.65, 0.08, 1]);
for (const x of [-0.95, 1.9]) {
  brass.push([x, 2.62, 0.72, 0.025, 0.45, 0.025]);
}
for (let i = 0; i < 17; i++) brass.push([-0.95 + i * 0.178, 2.85, 0.82, 0.035, 0.045, 0.82]);
dark.push([0.45, 2.424, 0.87, 2.65, 0.035, 0.67]);
for (const x of [-1.08, 2.03]) {
  dark.push([x, 2.47, -0.55, 0.16, 0.14, 1.3]);
  planting.push([x, 2.57, -0.55, 0.14, 0.12, 1.27]);
}
for (const z of [-1.55, 1.55]) {
  dark.push([0, -0.035, z, 5.35, 0.07, 0.19]);
  planting.push([0, 0.005, z, 5.25, 0.06, 0.13]);
}
led.push([0, -0.13, 1.805, 5.5, 0.012, 0.012]);

function Pieces({ boxes, geometry, children, shadow = true }: {
  boxes: Box[]; geometry?: BufferGeometry; children: ReactNode; shadow?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const piece = new Object3D();
    boxes.forEach(([x, y, z, w, h, d], index) => {
      piece.position.set(x, y, z);
      piece.scale.set(w, h, d);
      piece.updateMatrix();
      mesh.current!.setMatrixAt(index, piece.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [boxes]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, boxes.length]} castShadow={shadow} receiveShadow>
    {!geometry && <boxGeometry />}
    {children}
  </instancedMesh>;
}

export function TwilightEnvironment() {
  // The sunset preset's HDR is bundled locally so reflections never require a CDN.
  return <Environment files={sunsetEnvironment} environmentIntensity={0.6} environmentRotation={[0, 0.7, 0]} />;
}

export function LuxuryPavilion() {
  const resources = useMemo(() => {
    const data = new Uint8Array(128 * 128);
    // Deterministic mineral pores with faint sedimentary bands, without a texture download.
    for (let i = 0; i < data.length; i++) {
      const grain = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      data[i] = 110 + (grain - Math.floor(grain)) * 40 + Math.sin(Math.floor(i / 128) * 0.45) * 12;
    }
    const bump = new DataTexture(data, 128, 128, RedFormat);
    bump.wrapS = bump.wrapT = RepeatWrapping;
    bump.repeat.set(5, 3);
    bump.needsUpdate = true;
    return { bump, bevel: new RoundedBoxGeometry(1, 1, 1, 2, 0.035) };
  }, []);
  useEffect(() => () => {
    resources.bump.dispose();
    resources.bevel.dispose();
  }, [resources]);
  return <>
    <Pieces boxes={stone} geometry={resources.bevel}>
      <meshStandardMaterial color="#e8e2d5" roughness={0.78} metalness={0.05} bumpMap={resources.bump} bumpScale={0.012} />
    </Pieces>
    <Pieces boxes={dark} geometry={resources.bevel}>
      <meshStandardMaterial color="#16222e" roughness={0.85} bumpMap={resources.bump} bumpScale={0.008} />
    </Pieces>
    <Pieces boxes={glass} shadow={false}>
      <meshPhysicalMaterial color="#13324a" roughness={0.08} metalness={0.1} transmission={0.4} ior={1.5} reflectivity={0.9} clearcoat={1} thickness={0.025} />
    </Pieces>
    {/* A subtle warm tint preserves interior light through the deeply colored glass. */}
    {[warmGlass, dimGlass].map((boxes, i) => <Pieces key={i} boxes={boxes} shadow={false}>
      <meshPhysicalMaterial color="#13324a" roughness={0.08} metalness={0.1} transmission={0.4} ior={1.5} reflectivity={0.9} clearcoat={1} thickness={0.025} emissive="#ffbe76" emissiveIntensity={i === 0 ? 0.72 : 0.19} />
    </Pieces>)}
    <Pieces boxes={guards} shadow={false}>
      <meshPhysicalMaterial color="#13324a" roughness={0.08} metalness={0.1} transmission={0.4} ior={1.5} reflectivity={0.9} clearcoat={1} transparent opacity={0.22} depthWrite={false} />
    </Pieces>
    <Pieces boxes={brass}>
      <meshStandardMaterial color="#bfae89" metalness={0.85} roughness={0.25} />
    </Pieces>
    {rooms.map((boxes, i) => <Pieces key={i} boxes={boxes} shadow={false}>
      <meshStandardMaterial color={i === 0 ? "#403b35" : "#bd9470"} emissive={i === 1 ? "#ffbe76" : "#ffd8a8"} emissiveIntensity={[0.04, 1.6, 0.65][i] ?? 0.04} roughness={0.9} />
    </Pieces>)}
    <Pieces boxes={curtains} shadow={false}><meshStandardMaterial color="#bfb19a" roughness={1} /></Pieces>
    <Pieces boxes={led} shadow={false}>
      <meshStandardMaterial color="#ffd8a8" emissive="#ffbe76" emissiveIntensity={3} />
    </Pieces>
    <Pieces boxes={planting}><meshStandardMaterial color="#344338" roughness={0.95} bumpMap={resources.bump} bumpScale={0.04} /></Pieces>
    <mesh position={[0.45, 2.448, 0.87]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.55, 0.58]} />
      <meshPhysicalMaterial color="#397b86" roughness={0.12} metalness={0.2} clearcoat={1} bumpMap={resources.bump} bumpScale={0.008} emissive="#26616c" emissiveIntensity={0.3} />
    </mesh>
    {/* A few real lights support the emissive soffits without one light per window. */}
    {[0, 1, 2, 3].map(floor => <pointLight key={floor} position={[0.2, floor * 0.59 + 0.48, 1.04]} color="#ffbe76" intensity={0.35} distance={1.5} decay={2} />)}
    <ContactShadows position={[0, -0.055, 0]} scale={7} opacity={0.55} blur={2.5} far={4} resolution={256} frames={1} color="#080f19" />
  </>;
}
