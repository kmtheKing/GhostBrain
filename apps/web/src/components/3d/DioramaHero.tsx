import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const DioramaHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060608, 0.035);

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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup (Motivated 3-Point with Cursor Spotlight)
    const ambientLight = new THREE.AmbientLight(0x1a1815, 1.2);
    scene.add(ambientLight);

    const cursorSpot = new THREE.SpotLight(0xffdf9e, 3.5);
    cursorSpot.position.set(0, 3, 6);
    cursorSpot.angle = Math.PI / 4;
    cursorSpot.penumbra = 0.8;
    scene.add(cursorSpot);

    const rimLight = new THREE.DirectionalLight(0xe5b364, 2.0);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x403525, 1.0);
    fillLight.position.set(5, -3, 2);
    scene.add(fillLight);

    // 3. Central Cryptographic Neural Vault (Icosahedron Crystal)
    const crystalGeo = new THREE.IcosahedronGeometry(1.6, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x14120e,
      roughness: 0.18,
      metalness: 0.92,
      emissive: 0x241a0b,
      emissiveIntensity: 0.35,
      wireframe: false,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    scene.add(crystal);

    // Wireframe Cage Layer
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xe5b364,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const wireCage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62, 0), wireMat);
    scene.add(wireCage);

    // 4. Dual Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(2.3, 0.025, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0xe5b364,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x6e4e1a,
      emissiveIntensity: 0.2
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.8, 0.018, 16, 100);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat1);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    scene.add(ring2);

    // 5. Floating Encrypted Data Nodes (Particles)
    const particleCount = 280;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 12;
      posArray[i + 1] = (Math.random() - 0.5) * 8;
      posArray[i + 2] = (Math.random() - 0.5) * 8;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0xe5b364,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Interaction & Mouse Tracking
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
      targetX = (clientX - windowHalfX) * 0.002;
      targetY = (clientY - windowHalfY) * 0.002;

      // Update cursor light position
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

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera slerp towards mouse
      camera.position.x += (targetX * 3.5 - camera.position.x) * 0.04;
      camera.position.y += (-targetY * 2.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Rotate vault crystal
      crystal.rotation.x = elapsed * 0.22;
      crystal.rotation.y = elapsed * 0.35;
      wireCage.rotation.x = elapsed * 0.22;
      wireCage.rotation.y = elapsed * 0.35;

      // Rotate orbital rings
      ring1.rotation.z = elapsed * 0.18;
      ring2.rotation.x = elapsed * -0.15;

      // Float particles
      particles.rotation.y = elapsed * 0.06;

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
      crystalGeo.dispose();
      crystalMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden"
    />
  );
};
