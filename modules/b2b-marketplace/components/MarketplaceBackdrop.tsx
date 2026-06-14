"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A full-viewport, GPU-driven WebGL backdrop that stays visible behind the
 * ENTIRE page: a wall of glowing nodes (an abstract "global trade network")
 * rippling toward the viewer, reacting to mouse parallax and scroll. One
 * renderer, capped DPR, pauses when hidden, static frame for reduced-motion.
 *
 * Renders its own opaque base color so the page root can stay transparent and
 * let the animation show through every section.
 */
export function MarketplaceBackdrop() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDark = document.documentElement.classList.contains("dark");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // ── A wall of nodes on the XY plane (facing the camera) ──
    const HALF_W = 34;
    const HALF_H = 24;
    const STEP = 0.92;
    const xs = Math.floor((HALF_W * 2) / STEP);
    const ys = Math.floor((HALF_H * 2) / STEP);
    const count = xs * ys;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);
    let i = 0;
    for (let gx = 0; gx < xs; gx++) {
      for (let gy = 0; gy < ys; gy++) {
        positions[i * 3] = -HALF_W + gx * STEP;
        positions[i * 3 + 1] = -HALF_H + gy * STEP;
        positions[i * 3 + 2] = 0;
        scales[i] = 0.5 + Math.random() * 1.7;
        seeds[i] = Math.random() * 6.283;
        i++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uOpacity: { value: isDark ? 1.0 : 0.6 },
      uColorA: { value: new THREE.Color("#6366f1") },
      uColorB: { value: new THREE.Color("#f43f5e") },
      uColorC: { value: new THREE.Color("#f59e0b") },
      uPixel: { value: Math.min(window.devicePixelRatio, 2) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        uniform float uPixel;
        attribute float aScale;
        attribute float aSeed;
        varying float vWave;
        varying float vGlow;
        void main() {
          vec3 pos = position;
          float w =
              sin(pos.x * 0.25 + uTime * 0.9 + aSeed) * 1.4
            + sin(pos.y * 0.3 + uTime * 0.7) * 1.2
            + sin((pos.x + pos.y) * 0.16 - uTime * 0.5 + uScroll * 3.0) * 1.0;
          pos.z += w;
          pos.x += sin(uTime * 0.3 + aSeed) * 0.18;
          // gentle mouse-driven swirl
          pos.x += uMouse.x * 1.2;
          pos.y += -uMouse.y * 1.2;
          vWave = w;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          float glow = 0.6 + 0.4 * sin(uTime * 1.5 + aSeed * 3.0);
          vGlow = glow;
          gl_PointSize = aScale * 16.0 * uPixel * glow * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform float uOpacity;
        varying float vWave;
        varying float vGlow;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          float t = clamp((vWave + 3.6) / 7.2, 0.0, 1.0);
          vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.6, t));
          col = mix(col, uColorC, smoothstep(0.65, 1.0, t));
          gl_FragColor = vec4(col, alpha * uOpacity * (0.35 + 0.65 * vGlow));
        }
      `,
    });

    const field = new THREE.Points(geo, material);
    field.rotation.x = -0.18;
    scene.add(field);

    const target = new THREE.Vector2(0, 0);
    let targetScroll = 0;

    const onMouse = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / max;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduce) {
        uniforms.uTime.value += dt;
        uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.05;
        uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.05;
        uniforms.uScroll.value += (targetScroll - uniforms.uScroll.value) * 0.05;
        field.rotation.z = uniforms.uScroll.value * 0.25;
      } else {
        uniforms.uTime.value = 2.0;
      }
      renderer.render(scene, camera);
    };
    render();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-background" aria-hidden="true">
      <div
        ref={mountRef}
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"
      />
    </div>
  );
}
