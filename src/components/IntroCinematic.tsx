import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Play, Film, Database, Sparkles, Orbit } from 'lucide-react';
import { Movie } from '../types';

interface IntroCinematicProps {
  movies: Movie[];
  onComplete: () => void;
}

// Map genres to futuristic/classic symbolic icons for orbiting rendering
const GENRE_SYMBOLS: Record<string, string> = {
  'Action': '⚔️',
  'Adventure': '🧭',
  'Animation': '🎨',
  'Comedy': '🎭',
  'Crime': '🕵️',
  'Documentary': '📹',
  'Drama': '🎭',
  'Family': '🏠',
  'Fantasy': '🦄',
  'History': '⏳',
  'Horror': '👻',
  'Music': '🎵',
  'Mystery': '🔍',
  'Romance': '💖',
  'Sci-Fi': '🛸',
  'Thriller': '⚡',
  'War': '🛡️',
  'Western': '🤠'
};

export default function IntroCinematic({ movies, onComplete }: IntroCinematicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  
  const [hasEntered, setHasEntered] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [subtitle, setSubtitle] = useState('Syncing celestial catalog coords...');
  const [isSkipped, setIsSkipped] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  const isSkippedRef = useRef(false);

  // References for Three.js cleanup and animation tracking
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const posterGroupsRef = useRef<THREE.Group[]>([]);
  const gravityParticlesRef = useRef<THREE.Points | null>(null);
  const blackHoleMeshRef = useRef<THREE.Mesh | null>(null);
  const accretionMeshRef = useRef<THREE.Mesh | null>(null);
  const lensingDiskRef = useRef<THREE.Mesh | null>(null);

  // Dynamic parameters for GSAP to manipulate
  const paramsRef = useRef({
    orbitSpeed: 0.1,             // Global speed of orbit
    vortexPull: 0.0,             // Gravitational pull rate (0 = none, high = sucking in)
    accretionDiskIntensity: 0.5,  // Intensity of the glowing accretion light
    blackHoleScale: 0.8,         // Visual size of the black hole
    particleSpeed: 0.4,          // Speed of orbiting dust particles
    lensDistortion: 0.02,        // Gravitational lensing sweep
    transitionFlash: 0.0,        // Singularity bright explosion flash
    textReveal: 0.0,             // Logo opacity
    textScale: 0.8,              // Logo scale
    flyInFactor: 1.0,            // Transition from fly-in state to orbital state
  });

  const handleSkip = () => {
    if (isSkipped) return;
    setIsSkipped(true);
    
    // Quick immediate warp timeline
    gsap.to(paramsRef.current, {
      transitionFlash: 1.0,
      orbitSpeed: 10.0,
      blackHoleScale: 8.0,
      vortexPull: 5.0,
      accretionDiskIntensity: 6.0,
      duration: 0.6,
      ease: 'power3.in',
      onComplete: () => {
        gsap.to(paramsRef.current, {
          textReveal: 1.0,
          textScale: 1.0,
          duration: 0.8,
          ease: 'power2.out'
        });
        
        gsap.to(paramsRef.current, {
          transitionFlash: 0.0,
          delay: 0.4,
          duration: 0.6,
          onComplete: () => {
            setTimeout(() => {
              cleanupAndFinish();
            }, 800);
          }
        });
      }
    });
  };

  const cleanupAndFinish = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    try {
      rendererRef.current?.dispose();
    } catch (e) {
      console.warn('Renderer cleanup error:', e);
    }
    onComplete();
  };

  // Subtitle timeline ticks
  useEffect(() => {
    const subtitleTicks = [
      { time: 600, text: 'Opening event horizon gateway...' },
      { time: 1800, text: 'Posters materializing from deep space corners...' },
      { time: 3200, text: 'Cinematic visual clusters entering high orbit...' },
      { time: 5000, text: 'WARNING: Black hole gravitational pull threshold reached.' },
      { time: 6800, text: 'Spiraling movie catalog details into the accretion disk...' },
      { time: 8200, text: 'Singularity imminent. Critical mass collapse initiated.' },
      { time: 9500, text: 'Sucking titles, ratings, and memories into the horizon...' },
      { time: 11000, text: 'SINGULARITY COLLAPSE: RECONFIGURING GALAXY COORDS...' }
    ];

    const timeouts = subtitleTicks.map(tick => {
      return setTimeout(() => {
        setSubtitle(tick.text);
      }, tick.time);
    });

    const progressTimeline = gsap.to({}, {
      duration: 3.2,
      onUpdate: function() {
        setLoadingProgress(Math.floor(this.progress() * 100));
      }
    });

    return () => {
      timeouts.forEach(t => clearTimeout(t));
      progressTimeline.kill();
    };
  }, []);

  // ThreeJS Sandbox
  useEffect(() => {
    if (!containerRef.current) return;

    // Capture mouse coordinate parallax offset
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010103);
    scene.fog = new THREE.FogExp2(0x010104, 0.012);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Start zoomed out to see flying elements
    camera.position.set(0, 8, 38);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false,
        powerPreference: 'high-performance'
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      console.error('WebGL failed:', e);
      setInitFailed(true);
      return;
    }

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Central core gravity light source (orange accretion warmth)
    const corePointLight = new THREE.PointLight(0xff7722, 10, 150, 0.5);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    // Dynamic blue outer halo light
    const outerHaloPointLight = new THREE.PointLight(0x00aaff, 6, 120, 0.8);
    outerHaloPointLight.position.set(0, 2, -5);
    scene.add(outerHaloPointLight);

    // 5. ACCRETION PARTICLE CLOUD (Starfield whirlpool with relativity simulation)
    const particleCount = 6500;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);
    const particleHeights = new Float32Array(particleCount);

    const coreColor = new THREE.Color(0xff5500); // Super-hot orange center
    const diskColor = new THREE.Color(0xffaa22); // Solar yellow disk
    const edgeColor = new THREE.Color(0x1188ff); // Cosmic blue margin

    for (let i = 0; i < particleCount; i++) {
      // Swirling distribution
      const r = Math.pow(Math.random(), 1.5) * 45 + 0.8;
      const angle = Math.random() * Math.PI * 2;
      // Disk thickness drops off further away
      const height = (Math.random() - 0.5) * (1.8 / (r * 0.12 + 1));

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      positions[i * 3] = x;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = z;

      // Color maps to general relativity temperature (orange core -> yellow -> blue edge)
      const colorPct = Math.min(r / 35, 1.0);
      const lerpedColor = coreColor.clone();
      
      if (colorPct < 0.3) {
        lerpedColor.lerp(diskColor, colorPct / 0.3);
      } else {
        lerpedColor.copy(diskColor).lerp(edgeColor, (colorPct - 0.3) / 0.7);
      }

      // Sparkly white accents
      if (Math.random() > 0.97) {
        lerpedColor.setHex(0xffffff);
      }

      colors[i * 3] = lerpedColor.r;
      colors[i * 3 + 1] = lerpedColor.g;
      colors[i * 3 + 2] = lerpedColor.b;

      particleRadii[i] = r;
      particleAngles[i] = angle;
      particleHeights[i] = height;
      particleSpeeds[i] = (2.2 / (r + 0.8)) * (0.9 + Math.random() * 0.4);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circle texture code
    const createPointsTexture = () => {
      const size = 16;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grd.addColorStop(0.3, 'rgba(255, 180, 80, 0.7)');
        grd.addColorStop(0.7, 'rgba(200, 40, 0, 0.2)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.18,
      map: createPointsTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starPoints = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(starPoints);
    gravityParticlesRef.current = starPoints;

    // 6. EVENT HORIZON (Jet black sphere)
    const bhGeom = new THREE.SphereGeometry(2.2, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHoleMesh = new THREE.Mesh(bhGeom, bhMat);
    scene.add(blackHoleMesh);
    blackHoleMeshRef.current = blackHoleMesh;

    // 7. PHOTON SPHERE & GRAVITATIONAL LENSING RINGS
    // Relativistic light ring wrapping under/over the event horizon
    const lensingGeom = new THREE.RingGeometry(2.35, 3.8, 64);
    const lensingMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const lensingDisk = new THREE.Mesh(lensingGeom, lensingMat);
    lensingDisk.rotation.x = Math.PI / 2.15; // Slanted light warp ring
    scene.add(lensingDisk);
    lensingDiskRef.current = lensingDisk;

    // Secondary accretion halo ring for depth
    const ringGeom = new THREE.TorusGeometry(3.2, 0.5, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff8811,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const accretionRing = new THREE.Mesh(ringGeom, ringMat);
    accretionRing.rotation.x = Math.PI / 2;
    scene.add(accretionRing);
    accretionMeshRef.current = accretionRing;

    // 8. COMPILE AND RENDER POSTERS FROM ALL DIRECTIONS!
    const postersPool = movies.slice(0, 16);
    const poolCount = postersPool.length;

    postersPool.forEach((movie, idx) => {
      const posterGroup = new THREE.Group();

      // Poster Plate
      const plateGeom = new THREE.PlaneGeometry(2.5, 3.75);
      const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(movie.poster)}`;
      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin('anonymous');

      let plateMat = new THREE.MeshStandardMaterial({
        color: 0x181822,
        roughness: 0.1,
        metalness: 0.8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0 // starts hidden, fades in on load
      });

      textureLoader.load(
        proxiedUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          plateMat.map = tex;
          plateMat.color.setHex(0xffffff);
          plateMat.needsUpdate = true;
          gsap.to(plateMat, { opacity: 1.0, duration: 1.0 });
        },
        undefined,
        () => {
          // Fallback textured canvas
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 384;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#070914';
            ctx.fillRect(0, 0, 256, 384);
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 10;
            ctx.strokeRect(5, 5, 246, 374);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(movie.title.substring(0, 20), 128, 160);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 24px system-ui, sans-serif';
            ctx.fillText(`★ ${movie.rating}`, 128, 260);
          }
          plateMat.map = new THREE.CanvasTexture(canvas);
          plateMat.color.setHex(0xffffff);
          plateMat.needsUpdate = true;
          gsap.to(plateMat, { opacity: 1.0, duration: 0.8 });
        }
      );

      const plateMesh = new THREE.Mesh(plateGeom, plateMat);
      plateMesh.name = 'movie_plate';
      posterGroup.add(plateMesh);

      // Glowing border frame
      const edges = new THREE.EdgesGeometry(plateGeom);
      const edgeColor = idx % 2 === 0 ? 0xff6600 : 0x00ccff;
      const borderLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.9 })
      );
      borderLine.position.z = 0.02;
      posterGroup.add(borderLine);

      // --- CREATE FLOATING TEXT TAG (TITLE, STARS, GENRE ICON) AS CANVAS TEXTURE SPIRALED Sprites ---
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 320;
      tagCanvas.height = 100;
      const tCtx = tagCanvas.getContext('2d');
      if (tCtx) {
        // Rounded card look
        tCtx.fillStyle = 'rgba(10, 10, 20, 0.85)';
        tCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        tCtx.lineWidth = 2;
        
        // Draw rounded rectangle
        tCtx.beginPath();
        tCtx.roundRect(4, 4, 312, 92, 16);
        tCtx.fill();
        tCtx.stroke();
        
        // Title Text
        tCtx.fillStyle = '#ffffff';
        tCtx.font = 'bold 18px Inter, Helvetica, sans-serif';
        tCtx.textAlign = 'left';
        tCtx.fillText(movie.title.substring(0, 22), 16, 36);

        // Stars & rating
        tCtx.fillStyle = '#fbbf24';
        tCtx.font = 'bold 14px system-ui, sans-serif';
        const ratingVal = movie.rating || 8.0;
        tCtx.fillText(`★ ${ratingVal.toFixed(1)}`, 16, 70);

        // Symbol mapping
        const primaryGenre = movie.genres[0] || 'Drama';
        const genreSymbol = GENRE_SYMBOLS[primaryGenre] || '🎬';
        tCtx.fillStyle = '#a1a1aa';
        tCtx.font = '14px system-ui, sans-serif';
        tCtx.fillText(`${genreSymbol} ${primaryGenre}`, 100, 70);
      }

      const tagGeom = new THREE.PlaneGeometry(2.5, 0.78);
      const tagMat = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(tagCanvas),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const tagMesh = new THREE.Mesh(tagGeom, tagMat);
      // Place text just below the poster card
      tagMesh.position.y = -2.35;
      tagMesh.position.z = 0.05;
      posterGroup.add(tagMesh);

      // --- INITIALIZE POSITIONS EXTENSIVELY IN ALL DIRECTIONS ("COMING FROM EVERY SIDE") ---
      // Generate highly dispersed 3D spatial coordinate vectors
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      // Spawn at huge radial distance range (55 to 80 units away!)
      const spawnDistance = 60 + Math.random() * 25;
      
      const spawnX = spawnDistance * Math.sin(phi) * Math.cos(theta);
      const spawnY = spawnDistance * Math.cos(phi) + (Math.random() - 0.5) * 15;
      const spawnZ = spawnDistance * Math.sin(phi) * Math.sin(theta);

      posterGroup.position.set(spawnX, spawnY, spawnZ);
      posterGroup.lookAt(0, 0, 0);

      // Save operational velocities and phases on user data
      const orbitRadius = 15 + Math.random() * 5.5;
      posterGroup.userData = {
        spawnPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
        orbitRadius,
        theta,
        speed: 0.12 + Math.random() * 0.14,
        bobPhase: Math.random() * 200,
        bobSpeed: 1.2 + Math.random() * 1.5,
        bobAmt: 0.2 + Math.random() * 0.4,
        pulledIn: false,
        fadeSpeed: 0.6 + Math.random() * 0.6,
        title: movie.title
      };

      scene.add(posterGroup);
      posterGroupsRef.current.push(posterGroup);
    });

    // 9. COMPOSE DEEP COHERENT PRE-FAB TIMELINE (14s total)
    const masterTimeline = gsap.timeline({ onComplete: cleanupAndFinish });

    // Transition A: Fly-in coordinate morphing (0s to 4.5s)
    // Moving flyInFactor from 1 (fully spawn) to 0 (fully locked in orbit)
    masterTimeline.to(paramsRef.current, {
      flyInFactor: 0.0,
      orbitSpeed: 0.6,
      duration: 4.8,
      ease: 'power3.out'
    });

    // Transition B: Dynamic camera panoramic drift
    masterTimeline.fromTo(camera.position,
      { x: 0, y: 12, z: 58 },
      { x: 0, y: 4, z: 24, duration: 5.5, ease: 'power2.out' },
      0
    );

    // Transition C: Accelerated event horizon expansion & gravitational swirl activation
    masterTimeline.to(paramsRef.current, {
      orbitSpeed: 3.5,
      particleSpeed: 4.5,
      accretionDiskIntensity: 2.2,
      blackHoleScale: 2.4,
      duration: 4.5,
      ease: 'power1.inOut'
    }, 4.8); // Kicks in as fly-in stabilizes

    // Transition D: Mass Gravity vortex suction trigger (posters spiral to center core)
    masterTimeline.to(paramsRef.current, {
      orbitSpeed: 15.0,
      vortexPull: 8.0,
      particleSpeed: 20.0,
      blackHoleScale: 0.05, // compresses into a microscopic hot core point
      accretionDiskIntensity: 5.0,
      duration: 3.6,
      ease: 'power3.in',
      onStart: () => {
        posterGroupsRef.current.forEach(pg => {
          pg.userData.pulledIn = true;
          // Hyper relativistic warp spinning
          gsap.to(pg.rotation, {
            x: '+=6.0',
            y: '+=8.0',
            z: '+=4.0',
            duration: 3.2,
            ease: 'power2.in'
          });
        });
      }
    }, 9.3);

    // Transition E: Move camera straight down the Singularity throat
    masterTimeline.to(camera.position, {
      x: 0,
      y: 0,
      z: 0.6,
      duration: 2.2,
      ease: 'power3.in'
    }, 10.2);

    // Transition F: Full volumetric whiteout flash
    masterTimeline.to(paramsRef.current, {
      transitionFlash: 1.0,
      duration: 0.4,
      ease: 'power1.in'
    }, 12.0);

    // Transition G: Gravitational recovery - Logo shocking recoil!
    masterTimeline.to(paramsRef.current, {
      textReveal: 1.0,
      textScale: 1.0,
      duration: 0.8,
      ease: 'back.out(1.5)',
      onStart: () => {
        camera.position.set(0, 0, 14);
        camera.lookAt(0, 0, 0);
        // Clear 3D canvas immediately so logo is super prominent
        posterGroupsRef.current.forEach(pg => scene.remove(pg));
        scene.remove(starPoints);
        if (blackHoleMesh) scene.remove(blackHoleMesh);
        if (lensingDisk) scene.remove(lensingDisk);
        if (accretionRing) scene.remove(accretionRing);
      }
    }, 12.4);

    // Transition H: Disperse whiteout blur
    masterTimeline.to(paramsRef.current, {
      transitionFlash: 0.0,
      duration: 1.2,
      ease: 'power2.out'
    }, 12.7);

    // Transition I: Final brand logotypography scale out
    masterTimeline.to(paramsRef.current, {
      textReveal: 0.0,
      textScale: 1.6,
      duration: 1.2,
      ease: 'power3.inOut',
      delay: 1.6
    });

    // 10. DYNAMIC WEBGL RENDER FRAME EVALUATION LOOP
    const clock = new THREE.Clock();

    const animate = () => {
      if (isSkipped) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = clock.getElapsedTime();
      
      // Accretion Disk motion mapping
      if (accretionRing) {
        accretionRing.scale.setScalar(paramsRef.current.blackHoleScale * 1.2);
        accretionRing.rotation.z += paramsRef.current.particleSpeed * 0.015;
        // Pulse glow
        const wave = 0.5 + Math.sin(elapsed * 4) * 0.2;
        ringMat.opacity = wave * Math.min(paramsRef.current.accretionDiskIntensity, 1.0);
      }

      if (lensingDisk) {
        lensingDisk.scale.setScalar(paramsRef.current.blackHoleScale * 1.55);
        lensingDisk.rotation.z -= paramsRef.current.particleSpeed * 0.03;
        // Gravitational lensing flare pulse
        const pulse = 0.6 + Math.sin(elapsed * 12) * 0.15;
        lensingMat.opacity = pulse * Math.min(paramsRef.current.accretionDiskIntensity * 0.8, 1.0);
      }

      if (blackHoleMesh) {
        blackHoleMesh.scale.setScalar(paramsRef.current.blackHoleScale);
      }

      // ACCRETION SPIRAL ENGINE
      if (starPoints) {
        const posAttr = particleGeometry.attributes.position as THREE.BufferAttribute;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          let r = particleRadii[i];
          let angle = particleAngles[i];
          let height = particleHeights[i];

          // Compute hyper-velocity as orbital radius decreases
          const spinSpeed = paramsRef.current.particleSpeed * (4.0 / (r * 0.12 + 0.6));
          angle += spinSpeed * 0.003;
          particleAngles[i] = angle;

          // Drag particles inwards
          if (paramsRef.current.orbitSpeed > 1.0) {
            const dragForce = (0.35 / (r * 0.12 + 0.5)) * (paramsRef.current.orbitSpeed * 0.02);
            r = Math.max(r - dragForce, 0.2);
            particleRadii[i] = r;
            
            // Warp orbital twist representing curvature of space
            angle += (1.0 / (r + 0.05)) * 0.018;
            particleAngles[i] = angle;
          }

          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          posAttr.setXYZ(i, x, height, z);
        }
        posAttr.needsUpdate = true;
      }

      // POSTER RIG EVALUATIONS
      posterGroupsRef.current.forEach(pg => {
        const data = pg.userData;

        if (!data.pulledIn) {
          // --- Phase 1: Spaun fly-in & Orbital tracking alignment ---
          // Linearly interpolate between spawn coordinates and standard circular orbits
          data.theta += (data.speed * paramsRef.current.orbitSpeed) * 0.005;
          
          const circX = Math.cos(data.theta) * data.orbitRadius;
          const circZ = Math.sin(data.theta) * data.orbitRadius;
          const bobY = Math.sin(elapsed * data.bobSpeed + data.bobPhase) * data.bobAmt * 0.5;

          const targetPos = new THREE.Vector3(circX, bobY, circZ);
          
          // Interpolate
          pg.position.lerpVectors(data.spawnPos, targetPos, 1.0 - paramsRef.current.flyInFactor);
          pg.lookAt(0, 0, 0);

          // Tilt cards gently
          pg.rotation.z = Math.sin(elapsed * 0.4 + data.bobPhase) * 0.06;
        } else {
          // --- Phase 2: Relativistic Event Horizon spiral capture ---
          data.orbitRadius = Math.max(data.orbitRadius - (0.012 * paramsRef.current.vortexPull * data.fadeSpeed), 0.12);
          data.theta += (0.16 * paramsRef.current.orbitSpeed) * 0.12;

          const spiralY = pg.position.y - (0.015 * paramsRef.current.vortexPull);

          pg.position.set(
            Math.cos(data.theta) * data.orbitRadius,
            spiralY,
            Math.sin(data.theta) * data.orbitRadius
          );

          // Stretch along path (Motion Blur simulation) and scale down
          const mult = Math.min(data.orbitRadius / 5.5, 1.0);
          pg.scale.setScalar(mult);

          // Progressive edge warping
          const plateObj = pg.getObjectByName('movie_plate') as THREE.Mesh;
          if (plateObj) {
            const mat = plateObj.material as THREE.MeshStandardMaterial;
            if (mat) {
              const currentOpacity = Math.max(data.orbitRadius / 4.4 - 0.1, 0);
              mat.opacity = currentOpacity;
              if (currentOpacity <= 0) {
                pg.visible = false;
              }
            }
          }
        }
      });

      // Camera parallax
      if (paramsRef.current.orbitSpeed < 3.0) {
        const targetCamX = Math.sin(elapsed * 0.02) * 5 + (mouse.x * 12);
        const targetCamY = 4.0 + Math.sin(elapsed * 0.04) * 2 + (mouse.y * 8);
        const targetCamZ = 25 + (mouse.y * 3);
        
        camera.position.x += (targetCamX - camera.position.x) * 0.04;
        camera.position.y += (targetCamY - camera.position.y) * 0.04;
        camera.position.z += (targetCamZ - camera.position.z) * 0.04;
        camera.lookAt(0, 1, 0);
      }

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      try {
        masterTimeline.kill();
        renderer.dispose();
      } catch (e) {
        console.warn('Sandbox cleanup error:', e);
      }
    };
  }, [movies]);

  if (initFailed) {
    return (
      <div id="visual_fallback_gate" className="fixed inset-0 bg-[#020206] z-50 flex flex-col items-center justify-center font-sans select-none overflow-hidden text-white">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-amber-500/10 rounded-full blur-[140px] animate-pulse duration-4000" />
        <div className="relative z-10 text-center max-w-md px-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-red-650 rounded-full flex items-center justify-center p-0.5 animate-spin duration-10000 mb-6 shadow-2xl">
            <div className="w-full h-full bg-[#020206] rounded-full flex items-center justify-center">
              <Film className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <h1 className="text-4xl font-light tracking-wide mb-2 uppercase">CINE<span className="text-amber-500 font-bold">ORBIT</span></h1>
          <p className="text-zinc-500 text-[10px] tracking-widest uppercase mb-10">Movie Tracking Singularity</p>
          <div className="space-y-4 w-full text-left mb-12">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-orange-400 animate-pulse" />
              <div className="text-[11px] text-zinc-400 font-mono tracking-wider">HARVESTING DYNAMIC MOVIE CATALOGS...</div>
            </div>
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-cyan-500 h-full animate-[progress_3.5s_ease-out_forwards]" style={{ width: '100%' }}></div>
            </div>
          </div>
          <button
            onClick={cleanupAndFinish}
            id="start_fallback_dashboard"
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-zinc-100 to-zinc-200 text-black text-xs font-bold uppercase tracking-widest rounded-full hover:from-amber-400 hover:to-orange-500 transition-all duration-300 transform active:scale-95 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current text-black" />
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="cineorbit_cinematic_vessel" className="fixed inset-0 z-50 bg-[#010103] select-none overflow-hidden font-sans">
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Skip button layered clearly */}
      <button
        ref={skipBtnRef}
        id="skip_intro_btn"
        onClick={handleSkip}
        className="absolute bottom-8 right-8 z-30 px-6 py-3.5 bg-zinc-950/40 hover:bg-zinc-900/60 border border-zinc-800 rounded-full backdrop-blur-md transition-all duration-300 group flex items-center gap-2.5 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-xl"
      >
        <span className="text-[10px] font-mono font-medium tracking-[0.25em] uppercase text-zinc-300 group-hover:text-amber-400 transition-colors">Skip Intro</span>
        <Orbit className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-180 transition-transform duration-700" />
      </button>

      {/* Intro Loader overlay up to 100% loaded */}
      {loadingProgress < 100 && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between items-center bg-[#010103] p-12 text-white pointer-events-none transition-opacity duration-1000">
          <div className="flex flex-col items-center mt-24">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-spin" style={{ animationDuration: '16s' }} />
              <div className="absolute inset-2 rounded-full border-t border-r border-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-4 rounded-full border-b border-l border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-6 rounded-full bg-zinc-950 flex items-center justify-center">
                <Film className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
            <h2 className="text-xs font-semibold tracking-[0.5em] uppercase text-zinc-400">WARPING GRAPH CATALOG</h2>
            <div className="text-[9px] font-mono tracking-widest text-amber-500 uppercase mt-2">SYSTEM ACTIVE • GENERATING VORTEX</div>
          </div>

          <div className="flex flex-col items-center max-w-md w-full mb-12">
            <p className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 mb-4 text-center animate-pulse h-4">
              &gt; {subtitle}
            </p>
            <div className="w-full bg-zinc-900/50 h-1.5 rounded-full overflow-hidden border border-zinc-850 mb-2">
              <div 
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-400 h-full transition-all duration-100 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[8.5px] font-mono text-zinc-600 tracking-wider">
              <span>SINGULARITY PRE-LOAD</span>
              <span>{loadingProgress}% COMPLETE</span>
            </div>
          </div>
        </div>
      )}

      {/* Explosion/Singularity White Flash trigger overlay */}
      <div 
        className="absolute inset-0 z-40 bg-white pointer-events-none" 
        style={{ opacity: paramsRef.current.transitionFlash }} 
      />

      {/* 13s+ Solid metal shockwave collapse title reveal overlay */}
      <div 
        className="absolute inset-0 z-35 flex flex-col justify-center items-center pointer-events-none bg-black/10"
        style={{ 
          opacity: paramsRef.current.textReveal,
          transform: `scale(${paramsRef.current.textScale})`
        }}
      >
        <div className="text-center px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-500 p-[1.5px] shadow-2xl mb-6">
            <div className="w-full h-full bg-[#050508] rounded-[14px] flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-wider text-white uppercase font-sans">
            CINE<span className="text-amber-500 font-light italic">ORBIT</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-400 font-mono mt-4">
            The Movie Tracking Singularity
          </p>

          <div className="mt-14 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-[9px] font-mono text-emerald-450 tracking-widest uppercase">Transitioning to Command Dashboard...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
