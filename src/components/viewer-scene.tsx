"use client";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Bounds,
  Center,
  useGLTF,
  useAnimations,
  Html,
  useProgress,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
function Model({
  url,
  wire,
  play,
  speed,
  clip,
  onClips,
}: {
  url: string;
  wire: boolean;
  play: boolean;
  speed: number;
  clip: string;
  onClips: (v: string[]) => void;
}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((m) => m.clone())
          : obj.material.clone();
      }
    });
    return clone;
  }, [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, scene);
  useEffect(() => {
    onClips(names);
  }, [names, onClips]);
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.forEach((m) => {
          if (m instanceof MeshStandardMaterial) m.wireframe = wire;
        });
      }
    });
  }, [scene, wire]);
  useEffect(() => {
    const action = actions[clip || names[0]];
    if (action) {
      action.play();
      action.paused = !play;
      action.timeScale = speed;
    }
    return () => {
      action?.stop();
    };
  }, [actions, names, clip, play, speed]);
  return <primitive object={scene} />;
}
function Loading() {
  const { progress } = useProgress();
  return (
    <Html center>
      <span style={{ whiteSpace: "nowrap" }}>
        Loading {Math.round(progress)}%
      </span>
    </Html>
  );
}
function Capture({ request }: { request: number }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!request) return;
    try {
      gl.render(scene, camera);
      const a = document.createElement("a");
      a.href = gl.domElement.toDataURL("image/png");
      a.download = "blackmamer-preview.png";
      a.click();
    } catch {
      /* Browser cross-origin restrictions may prevent screenshots. */
    }
  }, [request, gl, scene, camera]);
  return null;
}
export default function Scene({ url }: { url: string }) {
  const [rotate, setRotate] = useState(true);
  const [wire, setWire] = useState(false);
  const [play, setPlay] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [clip, setClip] = useState("");
  const [clips, setClips] = useState<string[]>([]);
  const [bg, setBg] = useState("#141414");
  const [light, setLight] = useState(3);
  const [capture, setCapture] = useState(0);
  const [reset, setReset] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const controls = useRef<OrbitControlsType>(null);
  return (
    <div ref={root}>
      <div className="viewer">
        <Canvas
          key={reset}
          camera={{ position: [4, 3, 5], fov: 40 }}
          dpr={[1, 1.7]}
          gl={{ preserveDrawingBuffer: true }}
        >
          <color attach="background" args={[bg]} />
          <ambientLight intensity={light / 2} />
          <directionalLight position={[4, 6, 3]} intensity={light} />
          <pointLight position={[-4, 2, -2]} color="#ff263e" intensity={15} />
          <Suspense fallback={<Loading />}>
            <Bounds fit clip observe margin={1.3}>
              <Center>
                {url === "procedural" ? (
                  <mesh>
                    <torusKnotGeometry args={[1, 0.3, 150, 24]} />
                    <meshStandardMaterial
                      color="#b91b30"
                      metalness={0.65}
                      roughness={0.3}
                      wireframe={wire}
                    />
                  </mesh>
                ) : (
                  <Model
                    url={url}
                    wire={wire}
                    play={play}
                    speed={speed}
                    clip={clip}
                    onClips={setClips}
                  />
                )}
              </Center>
            </Bounds>
          </Suspense>
          <OrbitControls
            ref={controls}
            makeDefault
            autoRotate={rotate}
            autoRotateSpeed={1}
            enableDamping
          />
          <Capture request={capture} />
        </Canvas>
      </div>
      <div className="viewer-controls">
        <button onClick={() => setRotate(!rotate)}>
          {rotate ? "Pause rotation" : "Auto rotate"}
        </button>
        <button onClick={() => setWire(!wire)}>
          {wire ? "Solid" : "Wireframe"}
        </button>
        <button onClick={() => setReset(reset + 1)}>Reset camera</button>
        <button
          onClick={() => root.current?.requestFullscreen().catch(() => {})}
        >
          Fullscreen
        </button>
        <button onClick={() => setCapture(capture + 1)}>Screenshot</button>
        <label>
          Background
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
          />
        </label>
        <label>
          Light
          <input
            aria-label="Light intensity"
            type="range"
            min="1"
            max="8"
            value={light}
            onChange={(e) => setLight(Number(e.target.value))}
          />
        </label>
        {clips.length > 0 && (
          <>
            <select
              aria-label="Animation"
              value={clip}
              onChange={(e) => setClip(e.target.value)}
            >
              {clips.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button onClick={() => setPlay(!play)}>
              {play ? "Pause animation" : "Play animation"}
            </button>
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[0.5, 1, 2].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <p className="tiny muted">
        Drag to orbit · Scroll to zoom · Right-drag to pan · Pinch on
        touchscreens
      </p>
    </div>
  );
}
