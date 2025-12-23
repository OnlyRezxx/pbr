import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { PBRMaps, MaterialSettings } from '../types';

interface PreviewProps {
  maps: PBRMaps;
  shape: 'sphere' | 'cube' | 'plane';
  settings: MaterialSettings;
}

const FALLBACK_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const Scene = ({ maps, shape, settings }: PreviewProps) => {
  // Use unique keys for textures to force reload only when necessary
  const textureUrls = useMemo(() => [
    maps.albedo || FALLBACK_TEXTURE,
    maps.normal || FALLBACK_TEXTURE,
    maps.roughness || FALLBACK_TEXTURE,
    maps.metalness || FALLBACK_TEXTURE,
    maps.ao || FALLBACK_TEXTURE,
    maps.height || FALLBACK_TEXTURE
  ], [
    maps.albedo, 
    maps.normal, 
    maps.roughness, 
    maps.metalness, 
    maps.ao, 
    maps.height
  ]);

  const textures = useLoader(THREE.TextureLoader, textureUrls);
  const [albedo, normal, roughness, metalness, ao, height] = textures;

  useEffect(() => {
    textures.forEach((t) => {
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(settings.repeat, settings.repeat);
        t.anisotropy = 8;
        t.needsUpdate = true;
      }
    });
  }, [textures, settings.repeat]);

  return (
    <mesh castShadow receiveShadow>
      {shape === 'sphere' && <sphereGeometry args={[1, 64, 64]} />}
      {shape === 'cube' && <boxGeometry args={[1.5, 1.5, 1.5, 32, 32, 32]} />}
      {shape === 'plane' && <planeGeometry args={[2, 2, 128, 128]} />}
      
      <meshStandardMaterial
        map={albedo}
        normalMap={maps.normal ? normal : null}
        normalScale={new THREE.Vector2(settings.normalScale, settings.normalScale)}
        roughnessMap={maps.roughness ? roughness : null}
        roughness={settings.roughnessIntensity}
        metalnessMap={maps.metalness ? metalness : null}
        metalness={settings.metalnessIntensity}
        aoMap={maps.ao ? ao : null}
        aoMapIntensity={1.0}
        displacementMap={maps.height ? height : null}
        displacementScale={settings.displacementScale}
      />
    </mesh>
  );
};

const Preview3D: React.FC<PreviewProps> = (props) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-600/50 text-slate-300 shadow-lg">
          <i className="fas fa-cube mr-2 text-indigo-400"></i>
          PBR Real-time Preview
        </div>
      </div>
      
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={40} />
          <Stage environment="city" intensity={0.5} adjustCamera={false}>
             <Scene {...props} />
          </Stage>
          <OrbitControls 
            makeDefault 
            enableDamping 
            dampingFactor={0.05} 
            minDistance={1.5} 
            maxDistance={8} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Preview3D;