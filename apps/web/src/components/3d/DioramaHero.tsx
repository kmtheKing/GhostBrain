import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const DioramaHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060608, 0.045);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1a150e, 1.2);
    scene.add(ambientLight);

    const cursorSpot = new THREE.SpotLight(0xffe099, 4.0);
    cursorSpot.position.set(2, 3, 6);
    cursorSpot.angle = Math.PI / 4;
    cursorSpot.penumbra = 0.8;
    scene.add(cursorSpot);

    const rimLight = new THREE.DirectionalLight(0xe5b364, 2.2);
    rimLight.position.set(-6, 5, -4);
    scene.add(rimLight);

    // 3. BRAIN ROOT GROUP (Positioned on the right side on desktop so it doesn't collide with text)
    const brainGroup = new THREE.Group();
    const isDesktop = window.innerWidth >= 1024;
    brainGroup.position.set(isDesktop ? 2.4 : 0, isDesktop ? 0.2 : 1.2, 0);
    scene.add(brainGroup);

    // 4. ANATOMICAL 3D NEURAL BRAIN (Two distinct left/right hemispheres)
    const pointsPerLobe = 550;
    const totalPoints = pointsPerLobe * 2;
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);

    const goldColor = new THREE.Color(0xe5b364);
    const brightColor = new THREE.Color(0xfff5dd);
    const bronzeColor = new THREE.Color(0x996d2d);

    let idx = 0;
    // Generate Left (-1) and Right (+1) Hemispheres with distinct fissure gap
    [-1, 1].forEach((side) => {
      for (let i = 0; i < pointsPerLobe; i++) {
        const u = Math.random() * Math.PI;
        const v = Math.random() * Math.PI * 2;

        // Biological brain folding & cortical convolutions
        const rBase = 1.25;
        const folds = 0.22 * Math.sin(5 * u) * Math.cos(6 * v) + 0.14 * Math.sin(8 * u);
        const r = rBase + folds;

        // Fissure gap separation: side * 0.35 + lobe curvature
        const x = side * (0.35 + r * Math.sin(u) * Math.cos(v) * 0.82);
        const y = r * Math.sin(u) * Math.sin(v) * 1.05;
        const z = r * Math.cos(u) * 1.2;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        const mix = Math.random();
        const col = mix > 0.65 ? brightColor : mix > 0.25 ? goldColor : bronzeColor;
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
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const brainPoints = new THREE.Points(brainGeo, brainMat);
    brainGroup.add(brainPoints);

    // 5. Neural Fiber Synapse Lines (Connecting points like biological axons)
    const lineIndices: number[] = [];
    for (let i = 0; i < totalPoints; i += 4) {
      for (let j = i + 1; j < Math.min(i + 8, totalPoints); j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.65) {
          lineIndices.push(i, j);
        }
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    linesGeo.setIndex(lineIndices);
    const linesMat = new THREE.LineBasicMaterial({
      color: 0x8a632a,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const neuralAxons = new THREE.LineSegments(linesGeo, linesMat);
    brainGroup.add(neuralAxons);

    // 6. Slim Elegant Gyroscopic Halos
    const ringGeo1 = new THREE.TorusGeometry(2.1, 0.015, 16, 120);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe5b364,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x4a3411,
      emissiveIntensity: 0.25
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = Math.PI / 3;
    brainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.5, 0.012, 16, 120);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    brainGroup.add(ring2);

    // 7. Ambient Floating Stardust (Across entire background)
    const dustCount = 180;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 14;
      dustPositions[i + 1] = (Math.random() - 0.5) * 10;
      dustPositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0xe5b364,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // 8. Cursor Interaction
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
      targetX = (clientX - windowHalfX) * 0.0015;
      targetY = (clientY - windowHalfY) * 0.0015;

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

      const desktopNow = window.innerWidth >= 1024;
      brainGroup.position.set(desktopNow ? 2.4 : 0, desktopNow ? 0.2 : 1.2, 0);
    };
    window.addEventListener('resize', onResize);

    // 9. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera tilt
      camera.position.x += (targetX * 2.0 - camera.position.x) * 0.03;
      camera.position.y += (-targetY * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Organic neural breathing
      const breath = 1.0 + Math.sin(elapsed * 1.5) * 0.035;
      brainPoints.scale.set(breath, breath, breath);
      neuralAxons.scale.set(breath, breath, breath);

      // Rotate neural brain
      brainGroup.rotation.y = elapsed * 0.14;
      brainGroup.rotation.x = Math.sin(elapsed * 0.3) * 0.06;

      // Rotate gyroscopic halos
      ring1.rotation.z = elapsed * 0.18;
      ring2.rotation.x = elapsed * -0.14;

      // Animate ambient dust
      dust.rotation.y = elapsed * 0.03;

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
      linesGeo.dispose();
      linesMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden opacity-85"
    />
  );
};
