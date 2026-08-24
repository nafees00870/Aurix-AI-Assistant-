/**
 * Aurix3DCore Component
 * A 60 FPS Three.js 3D WebGL Futuristic AI Core consisting of:
 * - 3D Glass Sphere with Fresnel rim lighting and dynamic reflections
 * - Inner Glowing Plasma Energy Core with animated procedural noise
 * - Concentric & Tilted Holographic Orbit Rings with independent 3D rotation
 * - 3D Floating & Orbiting Particle Starfield
 * - Real-time Audio-Reactive displacement and ripples for Idle / Listening / Thinking / Speaking states
 * - Mouse / Touch Parallax for realistic 3D depth
 * - Organic state-based breathing and scale transitions with CSS and Three.js dampening
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AurixConnectionState } from '../modules/AurixState';
import { AudioStreamer } from '../modules/AudioStreamer';

interface Aurix3DCoreProps {
  state: AurixConnectionState;
  audioStreamer: AudioStreamer | null;
  isMicActive: boolean;
}

export const Aurix3DCore: React.FC<Aurix3DCoreProps> = ({
  state,
  audioStreamer,
  isMicActive,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const audioStreamerRef = useRef(audioStreamer);
  const isMicActiveRef = useRef(isMicActive);

  stateRef.current = state;
  audioStreamerRef.current = audioStreamer;
  isMicActiveRef.current = isMicActive;

  // Determine breathing animation class based on active state
  const getBreathingClass = () => {
    switch (state) {
      case 'speaking':
        return 'animate-breathe-speaking';
      case 'listening':
        return 'animate-breathe-listening';
      case 'connecting':
        return 'animate-breathe-thinking';
      case 'disconnected':
      default:
        return 'animate-breathe-idle';
    }
  };

  // State-based base scale for the container wrapper
  const getStateScaleStyle = () => {
    switch (state) {
      case 'speaking':
        return 'scale-105';
      case 'listening':
        return 'scale-102';
      case 'connecting':
        return 'scale-100';
      case 'disconnected':
      default:
        return 'scale-98';
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Root Group for Mouse Parallax & Dynamic State Scaling
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // --- 1. Inner Plasma Energy Sphere ---
    const innerGeo = new THREE.SphereGeometry(1.25, 48, 48);
    const innerVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uAudio;
      uniform float uState; // 0=idle, 1=listening, 2=thinking, 3=speaking

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Subtle organic surface distortion
        float displacement = sin(position.x * 4.0 + uTime * 2.5) *
                             cos(position.y * 4.0 + uTime * 2.0) *
                             sin(position.z * 4.0 + uTime * 1.8) * (0.05 + uAudio * 0.18);
                             
        vec3 newPos = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `;

    const innerFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uAudio;
      uniform float uState;

      void main() {
        vec3 baseCyan = vec3(0.04, 0.78, 0.95);
        vec3 brightTeal = vec3(0.2, 0.95, 0.9);
        vec3 deepBlue = vec3(0.01, 0.25, 0.45);
        vec3 coreWhite = vec3(0.9, 0.98, 1.0);

        // Multi-frequency plasma patterns
        float p1 = sin(vPosition.x * 6.0 + uTime * 3.0);
        float p2 = cos(vPosition.y * 7.0 - uTime * 2.5);
        float p3 = sin(vPosition.z * 5.0 + uTime * 1.5);
        float plasma = (p1 + p2 + p3) / 3.0;

        float intensity = 0.5 + 0.5 * plasma;
        vec3 color = mix(deepBlue, baseCyan, intensity);
        color = mix(color, brightTeal, pow(intensity, 2.5));

        // State-driven color pulses
        if (uState == 1.0) { // Listening
          color = mix(color, brightTeal, 0.35 + uAudio * 0.5);
        } else if (uState == 2.0) { // Thinking
          color = mix(color, vec3(0.0, 0.9, 0.8), sin(uTime * 5.0) * 0.3 + 0.3);
        } else if (uState == 3.0) { // Speaking
          color = mix(color, coreWhite, uAudio * 0.65);
        }

        // Inner glowing core
        float centerGlow = 1.0 - length(vPosition) / 1.35;
        color += coreWhite * pow(clamp(centerGlow, 0.0, 1.0), 3.0) * (0.6 + uAudio * 0.8);

        gl_FragColor = vec4(color, 0.85);
      }
    `;

    const innerUniforms = {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uState: { value: 0 },
    };

    const innerMat = new THREE.ShaderMaterial({
      vertexShader: innerVertexShader,
      fragmentShader: innerFragmentShader,
      uniforms: innerUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    // --- 2. Outer Glass Shell with Fresnel Glow & Light Reflections ---
    const glassGeo = new THREE.SphereGeometry(1.85, 64, 64);
    const glassVertexShader = `
      varying vec3 vNormal;
      varying vec3 vEye;
      varying vec3 vWorldPosition;
      uniform float uTime;
      uniform float uAudio;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vEye = normalize(cameraPosition - worldPos.xyz);
        
        // Gentle pulse on speech
        vec3 pos = position * (1.0 + uAudio * 0.08);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const glassFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vEye;
      varying vec3 vWorldPosition;
      uniform float uTime;
      uniform float uAudio;
      uniform float uState;

      void main() {
        // Fresnel calculation for glass rim
        float fresnel = 1.0 - max(dot(vEye, vNormal), 0.0);
        fresnel = pow(fresnel, 2.8);

        vec3 rimCyan = vec3(0.15, 0.85, 1.0);
        vec3 deepTeal = vec3(0.02, 0.2, 0.3);

        vec3 color = mix(deepTeal * 0.2, rimCyan, fresnel * 1.2);

        // Specular highlight for glass glint
        vec3 lightDir = normalize(vec3(1.5, 2.0, 3.0));
        vec3 reflectDir = reflect(-lightDir, vNormal);
        float spec = pow(max(dot(vEye, reflectDir), 0.0), 32.0);
        color += vec3(0.9, 0.98, 1.0) * spec * 0.8;

        // Dynamic scanning light band during thinking
        if (uState == 2.0) {
          float scan = sin(vWorldPosition.y * 3.0 - uTime * 4.0);
          scan = smoothstep(0.85, 1.0, scan);
          color += rimCyan * scan * 0.6;
        }

        float alpha = clamp(fresnel * 0.75 + spec * 0.4 + 0.05, 0.0, 0.92);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const glassUniforms = {
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uState: { value: 0 },
    };

    const glassMat = new THREE.ShaderMaterial({
      vertexShader: glassVertexShader,
      fragmentShader: glassFragmentShader,
      uniforms: glassUniforms,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    const glassSphere = new THREE.Mesh(glassGeo, glassMat);
    coreGroup.add(glassSphere);

    // --- 3. Thin Holographic Rings ---
    const ringGroup = new THREE.Group();
    coreGroup.add(ringGroup);

    const ringDefs = [
      { radius: 2.2, tube: 0.008, tiltX: 0.3, tiltY: 0.2, speed: 0.35, dir: 1 },
      { radius: 2.5, tube: 0.006, tiltX: -0.4, tiltY: 0.6, speed: 0.25, dir: -1 },
      { radius: 2.8, tube: 0.007, tiltX: 0.7, tiltY: -0.3, speed: 0.18, dir: 1 },
      { radius: 3.15, tube: 0.005, tiltX: -0.2, tiltY: -0.5, speed: 0.12, dir: -1 },
    ];

    const rings: { mesh: THREE.Mesh; speed: number; dir: number; baseScale: number }[] = [];

    ringDefs.forEach((def) => {
      const geo = new THREE.TorusGeometry(def.radius, def.tube, 16, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x38bdf8),
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });

      const ringMesh = new THREE.Mesh(geo, mat);
      ringMesh.rotation.x = def.tiltX;
      ringMesh.rotation.y = def.tiltY;
      ringGroup.add(ringMesh);

      rings.push({
        mesh: ringMesh,
        speed: def.speed,
        dir: def.dir,
        baseScale: 1,
      });
    });

    // --- 4. 3D Orbiting Particle Starfield ---
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);
    const particleInclinations = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.9 + Math.random() * 2.2;
      const angle = Math.random() * Math.PI * 2;
      const inc = (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = (0.2 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1);

      particleRadii[i] = radius;
      particleAngles[i] = angle;
      particleInclinations[i] = inc;
      particleSpeeds[i] = speed;

      positions[i * 3] = radius * Math.cos(angle) * Math.cos(inc);
      positions[i * 3 + 1] = radius * Math.sin(inc);
      positions[i * 3 + 2] = radius * Math.sin(angle) * Math.cos(inc);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Material with Soft Circular Point
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.65,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particleSystem);

    // --- Audio Telemetry & State Helpers ---
    const freqData = new Uint8Array(64);
    let smoothedAudio = 0;

    // Mouse / Touch Parallax Target
    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.25;
      targetRotX = -y * 0.25;
    };

    window.addEventListener('pointermove', handlePointerMove);

    // --- Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Pause when hidden
      if (document.hidden) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const currentState = stateRef.current;
      const streamer = audioStreamerRef.current;

      // Extract Audio Amplitude
      let currentAudio = 0;
      if (currentState === 'speaking' && streamer?.outputAnalyser) {
        streamer.outputAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 20; i++) sum += freqData[i];
        currentAudio = sum / (20 * 255);
      } else if (currentState === 'listening' && streamer?.inputAnalyser && isMicActiveRef.current) {
        streamer.inputAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 20; i++) sum += freqData[i];
        currentAudio = sum / (20 * 255);
      }

      // Smooth audio dampening (decay vs attack)
      smoothedAudio += (currentAudio - smoothedAudio) * (currentAudio > smoothedAudio ? 0.35 : 0.15);

      // State index: 0=idle, 1=listening, 2=thinking, 3=speaking
      let stateIndex = 0;
      if (currentState === 'listening') stateIndex = 1;
      else if (currentState === 'connecting') stateIndex = 2;
      else if (currentState === 'speaking') stateIndex = 3;

      // Update Shader Uniforms
      innerUniforms.uTime.value = time;
      innerUniforms.uAudio.value = smoothedAudio;
      innerUniforms.uState.value = stateIndex;

      glassUniforms.uTime.value = time;
      glassUniforms.uAudio.value = smoothedAudio;
      glassUniforms.uState.value = stateIndex;

      // Smooth Parallax
      coreGroup.rotation.x += (targetRotX - coreGroup.rotation.x) * 0.05;
      coreGroup.rotation.y += (targetRotY - coreGroup.rotation.y) * 0.05;

      // Core Ambient Breathing Rotation
      const rotSpeed = stateIndex === 2 ? 1.5 : 0.35;
      innerSphere.rotation.y += delta * 0.3 * rotSpeed;
      innerSphere.rotation.x += delta * 0.15 * rotSpeed;
      glassSphere.rotation.y -= delta * 0.12 * rotSpeed;

      // Animate Holographic Rings
      const ringAudioBoost = stateIndex === 3 ? smoothedAudio * 0.25 : stateIndex === 1 ? smoothedAudio * 0.15 : 0;
      rings.forEach((r, idx) => {
        const speedMultiplier = stateIndex === 2 ? 3.0 : 1.0;
        r.mesh.rotation.z += delta * r.speed * r.dir * speedMultiplier;
        r.mesh.rotation.x += delta * 0.08 * r.dir;

        const scale = 1.0 + Math.sin(time * 2.0 + idx) * 0.03 + ringAudioBoost;
        r.mesh.scale.set(scale, scale, scale);

        // Opacity responsiveness
        const baseMat = r.mesh.material as THREE.MeshBasicMaterial;
        if (stateIndex === 1) {
          baseMat.opacity = 0.55 + Math.sin(time * 4.0 + idx) * 0.2;
        } else if (stateIndex === 3) {
          baseMat.opacity = 0.6 + smoothedAudio * 0.35;
        } else {
          baseMat.opacity = 0.35;
        }
      });

      // Animate 3D Particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const particleSpeedBoost = stateIndex === 2 ? 2.5 : stateIndex === 3 ? 1.0 + smoothedAudio * 2.0 : 1.0;

      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += delta * particleSpeeds[i] * 0.4 * particleSpeedBoost;
        const ang = particleAngles[i];
        const rad = particleRadii[i] + (stateIndex === 3 ? Math.sin(time * 5.0 + i) * smoothedAudio * 0.3 : 0);
        const inc = particleInclinations[i];

        posArray[i * 3] = rad * Math.cos(ang) * Math.cos(inc);
        posArray[i * 3 + 1] = rad * Math.sin(inc);
        posArray[i * 3 + 2] = rad * Math.sin(ang) * Math.cos(inc);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // --- Clean Up ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      // Dispose three.js resources
      innerGeo.dispose();
      innerMat.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      rings.forEach((r) => {
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={`relative w-full max-w-[420px] aspect-square flex items-center justify-center pointer-events-auto select-none touch-none cursor-grab active:cursor-grabbing transition-transform duration-700 ease-out ${getStateScaleStyle()}`}
    >
      <div
        ref={mountRef}
        className={`w-full h-full flex items-center justify-center transition-all duration-700 ease-in-out ${getBreathingClass()}`}
        title="Aurix 3D Neural Core"
      />
    </div>
  );
};
