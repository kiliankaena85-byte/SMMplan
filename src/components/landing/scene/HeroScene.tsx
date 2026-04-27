"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Float, Sphere, useTexture, Sparkles } from "@react-three/drei";
import { useRef, useEffect, Suspense } from "react";
import * as THREE from "three";

// ── Milky Way Photographic Skybox ──
const MILKYWAY_PATH = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/MilkyWay/';
const MILKYWAY_FILES = [
  'dark-s_px.jpg', 'dark-s_nx.jpg',
  'dark-s_py.jpg', 'dark-s_ny.jpg',
  'dark-s_pz.jpg', 'dark-s_nz.jpg'
];

function MilkyWaySkybox() {
  const { scene } = useThree();
  
  useEffect(() => {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(MILKYWAY_PATH);
    const texture = loader.load(MILKYWAY_FILES);
    scene.background = texture;
    
    return () => {
      texture.dispose();
      scene.background = null;
    };
  }, [scene]);
  
  return null;
}

function RealisticEarth() {
  const [colorMap, normalMap, specularMap, cloudsMap, nightMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png'
  ]);
  
  return (
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2} position={[38, -5, -45]}>
      <group rotation={[0.41, 1.2, 0]}>
        {/* Main Earth */}
        <Sphere args={[18, 64, 64]}>
          <meshStandardMaterial 
            map={colorMap} 
            normalMap={normalMap}
            roughnessMap={specularMap}
            emissiveMap={nightMap}
            emissive="#ffedd5" /* Warm city lights */
            emissiveIntensity={0.8}
            roughness={0.6} 
            metalness={0.4}
          />
        </Sphere>
        {/* Cloud Layer */}
        <Sphere args={[18.2, 64, 64]}>
          <meshStandardMaterial 
            map={cloudsMap}
            transparent
            opacity={0.8}
            blending={THREE.NormalBlending}
            depthWrite={false}
          />
        </Sphere>
        
        {/* Atmospheric Glow (Outer Layer) */}
        <Sphere args={[19, 64, 64]}>
          <meshStandardMaterial 
            color="#3b82f6"
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>
      </group>
    </Float>
  );
}

function RealisticMoon() {
  const [colorMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'
  ]);
  
  return (
    <Float speed={1} rotationIntensity={0.5} floatIntensity={1} position={[-25, 12, -35]}>
      <Sphere args={[4, 64, 64]} rotation={[0, Math.PI / 1.2, 0]}>
        <meshStandardMaterial 
          map={colorMap} 
          roughness={0.8} 
          metalness={0.2}
        />
      </Sphere>
    </Float>
  );
}

function DeepSpaceDebris() {
  return (
    <>
      {/* Golden Satellite / Debris */}
      <Float speed={0.15} rotationIntensity={0.5} floatIntensity={0.5} position={[10, 8, -15]}>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <octahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.5} metalness={1} roughness={0.1} />
        </mesh>
      </Float>
      
      {/* Distant Silver Monolith */}
      <Float speed={0.1} rotationIntensity={0.2} floatIntensity={0.3} position={[-20, -10, -20]}>
        <mesh rotation={[0, Math.PI / 3, Math.PI / 6]}>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="#94a3b8" emissive="#475569" emissiveIntensity={0.3} metalness={0.8} roughness={0.4} />
        </mesh>
      </Float>
    </>
  );
}

// Mouse tracking rotation component
function MouseRig() {
  const group = useRef<THREE.Group>(null);
  const target = new THREE.Vector2();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. Base continuous cosmic rotation
    const baseRotX = Math.sin(time * 0.05) * 0.2;
    const baseRotY = time * 0.03; // Constant slow rotation on Y axis

    // 2. Mouse parallax influence
    target.x = (state.pointer.x * Math.PI) / 8;
    target.y = (state.pointer.y * Math.PI) / 8;

    if (group.current) {
      // Combine base animation with mouse interaction
      const targetRotX = baseRotX + target.y;
      const targetRotY = baseRotY + target.x;

      group.current.rotation.x += (targetRotX - group.current.rotation.x) * 0.02;
      group.current.rotation.y += (targetRotY - group.current.rotation.y) * 0.02;
      
      // Gentle floating on Z axis
      group.current.position.z = Math.sin(time * 0.5) * 2;
    }
  });

  return (
    <group ref={group}>
      {/* Layer 1: Distant dense starfield */}
      <Stars radius={150} depth={50} count={2000} factor={9} saturation={1} fade speed={0.3} />
        
      {/* Layer 2: Cosmic Nebula Dust (Purple) */}
      <Sparkles count={1500} scale={150} size={15} speed={0.02} opacity={0.4} color="#a855f7" />
        
      {/* Layer 3: Cosmic Nebula Dust (Blue) */}
      <Sparkles count={1500} scale={180} size={20} speed={0.015} opacity={0.3} color="#0ea5e9" />
        
      {/* Layer 4: Close-up Slow Glowing Stardust */}
      <Sparkles count={400} scale={60} size={10} speed={0.05} opacity={0.4} color="#fdf4ff" />
        
      {/* Foreground / Midground Elements */}
      <Suspense fallback={null}>
        <RealisticEarth />
        <RealisticMoon />
        <DeepSpaceDebris />
      </Suspense>
    </group>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#020617] pointer-events-none -z-20">
      <Canvas 
        camera={{ position: [0, 0, 1] }} 
        gl={{ antialias: false, alpha: false }} // Better performance
        dpr={[1, 2]} // Support retina displays up to 2x for performance
      >
        {/* Milky Way photographic skybox (static, outside MouseRig) */}
        <Suspense fallback={<color attach="background" args={["#02040a"]} />}>
          <MilkyWaySkybox />
        </Suspense>
        
        {/* Realistic Space Lighting */}
        <ambientLight intensity={0.15} color="#ffffff" />
        
        {/* Main Sun (Left, Front, Top) to illuminate the facing sides - BOOSTED INTENSITY */}
        <directionalLight position={[-40, 20, 30]} intensity={4.5} color="#fffcf2" />
        
        {/* Soft blue rim light (Right, Back, Bottom) to fix the 'pitch black cutout' effect */}
        <directionalLight position={[60, -20, -50]} intensity={2.0} color="#1e3a8a" />
        
        {/* Extra micro-fill for the darkness */}
        <directionalLight position={[0, -10, 10]} intensity={0.5} color="#ffffff" />
        
        <MouseRig />
      </Canvas>
      
      {/* Cinematic vignette / fade out to blend with UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/60 to-[#FAFAFA] pointer-events-none" />
    </div>
  );
}
