"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A lightweight, theme-aware 3D globe with a dotted surface and animated
 * trade-route arcs — evoking a global B2B sourcing network. Rendered behind the
 * hero content. Respects prefers-reduced-motion and cleans up on unmount.
 */
export function HeroGlobe({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const accent = new THREE.Color("#f43f5e"); // rose-500, on theme
    const accent2 = new THREE.Color("#6366f1"); // indigo

    const globe = new THREE.Group();
    scene.add(globe);

    const R = 1.9;

    // Wireframe shell
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 32),
      new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.08 }),
    );
    globe.add(shell);

    // Dotted surface (fibonacci sphere)
    const COUNT = 900;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      positions[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = R * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = R * Math.cos(phi);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dots = new THREE.Points(
      dotGeo,
      new THREE.PointsMaterial({ color: accent, size: 0.025, transparent: true, opacity: 0.5 }),
    );
    globe.add(dots);

    // Hub markers + arcs between them
    const hubs = [
      [0.9, 0.6, 1.5],
      [-1.6, 0.3, 0.9],
      [0.4, -1.3, 1.3],
      [1.5, 1.0, -0.6],
      [-0.8, -1.0, -1.4],
      [-0.2, 1.7, -0.4],
    ].map((p) => new THREE.Vector3(...p).normalize().multiplyScalar(R));

    const markerGeo = new THREE.SphereGeometry(0.045, 12, 12);
    hubs.forEach((h) => {
      const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: accent }));
      m.position.copy(h);
      globe.add(m);
    });

    const travellers: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; offset: number; speed: number }[] = [];
    for (let i = 0; i < hubs.length; i++) {
      const a = hubs[i];
      const b = hubs[(i + 2) % hubs.length];
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.55);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
        new THREE.LineBasicMaterial({ color: accent2, transparent: true, opacity: 0.35 }),
      );
      globe.add(arc);

      const t = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 10),
        new THREE.MeshBasicMaterial({ color: accent2 }),
      );
      globe.add(t);
      travellers.push({ mesh: t, curve, offset: Math.random(), speed: 0.12 + Math.random() * 0.12 });
    }

    globe.rotation.x = 0.4;

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const dt = clock.getDelta();
      if (!reduce) {
        globe.rotation.y += dt * 0.12;
        travellers.forEach((tr) => {
          tr.offset = (tr.offset + dt * tr.speed) % 1;
          tr.mesh.position.copy(tr.curve.getPoint(tr.offset));
        });
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      dotGeo.dispose();
      markerGeo.dispose();
      shell.geometry.dispose();
      (shell.material as THREE.Material).dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
