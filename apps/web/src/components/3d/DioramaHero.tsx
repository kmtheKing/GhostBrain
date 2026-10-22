import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const DioramaHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060608, 0.04);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1a150e, 1.4);
    scene.add(ambientLight);

    const cursorSpot = new THREE.SpotLight(0xffe099, 4.2);
    cursorSpot.position.set(0, 3, 6);
    cursorSpot.angle = Math.PI / 4;
    cursorSpot.penumbra = 0.8;
    scene.add(cursorSpot);

    const rimLight = new THREE.DirectionalLight(0xe5b364, 2.5);
    rimLight.position.set(-6, 5, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x4a3a1f, 1.2);
    fillLight.position.set(6, -4, 3);
    scene.add(fillLight);

    // 3. PROCEDURAL 3D NEURAL BRAIN (Two Symmetrical Hemispheres)
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    const pointsPerHemisphere = 650;
    const totalPoints = pointsPerHemisphere * 2;
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);

    const goldColor = new THREE.Color(0xe5b364);
    const brightColor = new THREE.Color(0xfff5dd);
    const bronzeColor = new THREE.Color(0x8a632a);

    let idx = 0;
    // Generate Left (-1) and Right (+1) Hemispheres
    [-1, 1].forEach((side) => {
      for (let i = 0; i < pointsPerHemisphere; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;

        // Organic brain lobe deformation equations
        const rBase = 1.35;
        const folds = 0.22 * Math.sin(5 * u) * Math.cos(6 * v) + 0.12 * Math.sin(9 * u);
        const r = rBase + folds;

        const x = side * (0.42 + r * Math.sin(u) * Math.cos(v) * 0.85);
        const y = r * Math.sin(u) * Math.sin(v) * 1.05;
        const z = r * Math.cos(u) * 1.25;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Color variation for biological / cryptographic depth
        const mix = Math.random();
        const col = mix > 0.7 ? brightColor : mix > 0.3 ? goldColor : bronzeColor;
        colors[idx * 3] = col.r;
        colors[idx * 3 + 1] = col.g;
        colors[idx * 3 + 2] = col.b;

        idx++;
      }
    });

    const brainGeo = new THREE.BufferGeometry();
    brainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    brainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const brainMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });

    const brainPoints = new THREE.Points(brainGeo, brainMat);
    brainGroup.add(brainPoints);

    // 4. Central Glowing Synaptic Core (Nucleus)
    const nucleusGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x18120a,
      emissive: 0xe5b364,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.9,
      wireframe: true
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    brainGroup.add(nucleus);

    // 5. Dual Orbital Cryptographic Rings
    const ringGeo1 = new THREE.TorusGeometry(2.35, 0.02, 16, 120);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe5b364,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x5a3f15,
      emissiveIntensity: 0.3
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = Math.PI / 3;
    brainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.85, 0.015, 16, 120);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    brainGroup.add(ring2);

    // 6. Floating Synaptic Light Pulses
    const pulseCount = 180;
    const pulsePositions = new Float32Array(pulseCount * 3);
    for (let i = 0; i < pulseCount * 3; i += 3) {
      pulsePositions[i] = (Math.random() - 0.5) * 10;
      pulsePositions[i + 1] = (Math.random() - 0.5) * 7;
      pulsePositions[i + 2] = (Math.random() - 0.5) * 7;
    }
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    const pulseMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0xffd985,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const pulses = new THREE.Points(pulseGeo, pulseMat);
    scene.add(pulses);

    // 7. Cursor Interaction Tracking
    let targetX = 0;
    let targetY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      targetX = (clientX - windowHalfX) * 0.0018;
      targetY = (clientY - windowHalfY) * 0.0018;

      cursorSpot.position.x = (clientX / window.innerWidth) * 8 - 4;
      cursorSpot.position.y = -(clientY / window.innerHeight) * 6 + 3;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    const onResize = () => {
      windowHalfX = window.innerWidth / 2;
      windowHalfY = window.innerHeight / 2;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // 8. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera slerp towards mouse
      camera.position.x += (targetX * 3.0 - camera.position.x) * 0.035;
      camera.position.y += (-targetY * 2.0 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);

      // Organic pulsating breathing of the neural brain
      const breath = 1.0 + Math.sin(elapsed * 1.8) * 0.04;
      brainPoints.scale.set(breath, breath, breath);

      // Rotate neural brain
      brainGroup.rotation.y = elapsed * 0.16;
      brainGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.08;

      // Rotate orbital rings
      ring1.rotation.z = elapsed * 0.22;
      ring2.rotation.x = elapsed * -0.18;

      // Animate ambient pulses
      pulses.rotation.y = elapsed * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      brainGeo.dispose();
      brainMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden"
    />
  );
};
