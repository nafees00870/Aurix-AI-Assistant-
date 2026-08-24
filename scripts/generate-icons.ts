import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Master Vector SVG of the Aurix Branding Logo
const aurixSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="48%" r="60%">
      <stop offset="0%" stop-color="#051c24" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#020a0e" stop-opacity="0.95"/>
      <stop offset="85%" stop-color="#000000" stop-opacity="1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
    </radialGradient>

    <!-- Sphere 3D Core Gradient -->
    <radialGradient id="sphereCore" cx="42%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="18%" stop-color="#a5f3fc"/>
      <stop offset="42%" stop-color="#38bdf8"/>
      <stop offset="70%" stop-color="#0284c7"/>
      <stop offset="92%" stop-color="#0369a1"/>
      <stop offset="100%" stop-color="#082f49"/>
    </radialGradient>

    <!-- Atmosphere Aura -->
    <radialGradient id="auraGlow" cx="50%" cy="48%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#0284c7" stop-opacity="0.35"/>
      <stop offset="80%" stop-color="#082f49" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer Ring Gradient -->
    <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="35%" stop-color="#0284c7" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="#00f2fe" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.2"/>
    </linearGradient>

    <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="85%" stop-color="#38bdf8" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#0c4a6e" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Glow Filters -->
    <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" fill="url(#bgGlow)"/>

  <!-- Outer Protective Halo Circle -->
  <circle cx="256" cy="245" r="215" fill="none" stroke="url(#ringGrad1)" stroke-width="2.5" opacity="0.85" filter="url(#softGlow)"/>
  <circle cx="256" cy="245" r="217" fill="none" stroke="#e0f2fe" stroke-width="0.8" stroke-dasharray="14 380 6 30" opacity="0.9"/>

  <!-- Diffused Atmospheric Aura -->
  <circle cx="256" cy="245" r="145" fill="url(#auraGlow)"/>

  <!-- Orbital Ring 1 (Inclined Left-Right) -->
  <ellipse cx="256" cy="245" rx="180" ry="65" fill="none" stroke="url(#ringGrad1)" stroke-width="2" transform="rotate(-28 256 245)" opacity="0.8" filter="url(#softGlow)"/>

  <!-- Orbital Ring 2 (Inclined Right-Left) -->
  <ellipse cx="256" cy="245" rx="175" ry="62" fill="none" stroke="url(#ringGrad2)" stroke-width="2" transform="rotate(32 256 245)" opacity="0.85" filter="url(#softGlow)"/>

  <!-- Orbital Ring 3 (Near Horizontal) -->
  <ellipse cx="256" cy="245" rx="165" ry="50" fill="none" stroke="#7dd3fc" stroke-width="1.5" transform="rotate(4 256 245)" opacity="0.65"/>

  <!-- Central Ambient Outer Sphere (Atmosphere Ring) -->
  <circle cx="256" cy="245" r="92" fill="#0369a1" fill-opacity="0.25" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.65" filter="url(#softGlow)"/>

  <!-- Core Glowing 3D Sphere -->
  <circle cx="256" cy="245" r="76" fill="url(#sphereCore)" filter="url(#intenseGlow)"/>

  <!-- Sphere Specular Light Reflex -->
  <ellipse cx="236" cy="218" rx="28" ry="16" fill="#ffffff" fill-opacity="0.55" transform="rotate(-30 236 218)"/>
  <circle cx="240" cy="222" r="8" fill="#ffffff" fill-opacity="0.75"/>

  <!-- Quantum Star Nodes along the Orbital Trajectories -->
  <!-- Top Node -->
  <circle cx="190" cy="120" r="3.5" fill="#ffffff" filter="url(#softGlow)"/>
  <circle cx="190" cy="120" r="1.5" fill="#ffffff"/>

  <!-- Right Upper Node -->
  <circle cx="365" cy="138" r="4" fill="#ffffff" filter="url(#softGlow)"/>
  <circle cx="365" cy="138" r="1.8" fill="#ffffff"/>

  <!-- Left Lower Node -->
  <circle cx="128" cy="245" r="3" fill="#38bdf8" filter="url(#softGlow)"/>

  <!-- Right Lower Node -->
  <circle cx="395" cy="310" r="3.5" fill="#e0f2fe" filter="url(#softGlow)"/>

  <!-- Outer Ring Star Sparkle -->
  <circle cx="438" cy="140" r="2.5" fill="#38bdf8"/>
  <circle cx="82" cy="210" r="2.5" fill="#38bdf8"/>
  <circle cx="256" cy="460" r="3" fill="#38bdf8" filter="url(#softGlow)"/>
</svg>`;

async function generateAllIcons() {
  console.log('Generating Aurix branding icon assets...');

  // 1. Save Master SVG
  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, aurixSvg, 'utf-8');
  console.log('Created: favicon.svg');

  const svgBuffer = Buffer.from(aurixSvg);

  // 2. Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-maskable-192.png', size: 192 },
    { name: 'icon-maskable-512.png', size: 512 },
    { name: 'og-image.png', size: 512 },
  ];

  for (const item of sizes) {
    const outPath = path.join(publicDir, item.name);
    await sharp(svgBuffer)
      .resize(item.size, item.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Created: ${item.name} (${item.size}x${item.size})`);
  }

  // 3. Create favicon.ico using 32x32 PNG buffer
  const ico32Buffer = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();
  
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  console.log('Created: favicon.ico');

  // 4. Create Web App Manifest (site.webmanifest and manifest.json)
  const manifest = {
    name: 'Aurix AI',
    short_name: 'Aurix',
    description: 'Aurix is a real-time, voice-to-voice AI assistant created by Nafees Kiani.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(publicDir, 'manifest.json'), manifestJson, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), manifestJson, 'utf-8');
  console.log('Created: manifest.json & site.webmanifest');

  console.log('All Aurix icon branding assets created successfully!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
