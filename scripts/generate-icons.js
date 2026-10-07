import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Vibrant Modern Blue -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <!-- Subtle Inner Shadow / Highlight -->
    <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.3" />
    </linearGradient>

    <!-- Pin Shadow -->
    <filter id="pinShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0369a1" flood-opacity="0.6" />
    </filter>

    <!-- Pin Inner Dot 3D Sphere Gradient -->
    <radialGradient id="sphereGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>

    <!-- Clip Path for the Rounded Squircle -->
    <clipPath id="squircleClip">
      <rect x="16" y="16" width="480" height="480" rx="125" ry="125" />
    </clipPath>
  </defs>

  <!-- Blue Squircle Container with 100% Transparent Corners -->
  <rect x="16" y="16" width="480" height="480" rx="125" ry="125" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="125" ry="125" fill="url(#innerGlow)" />

  <!-- Clipped Inner Road Grid & Details -->
  <g clip-path="url(#squircleClip)">
    <!-- Faint background blueprint lines -->
    <g stroke="rgba(255, 255, 255, 0.22)" stroke-width="7" stroke-linecap="round">
      <line x1="170" y1="30" x2="480" y2="340" />
      <line x1="280" y1="30" x2="495" y2="245" />
      <line x1="30" y1="360" x2="450" y2="360" />
      <line x1="340" y1="210" x2="480" y2="350" />
      <line x1="450" y1="230" x2="350" y2="330" />
    </g>

    <!-- Main Solid White Roads -->
    <g stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
      <!-- Diagonal road from top-left (center-ish) down to right -->
      <line x1="175" y1="80" x2="415" y2="320" />
      
      <!-- Long diagonal road crossing through center -->
      <line x1="90" y1="195" x2="315" y2="420" />
      
      <!-- Cross diagonal road 1 -->
      <line x1="260" y1="80" x2="80" y2="260" />
      
      <!-- Cross diagonal road 2 (connecting to bottom right) -->
      <line x1="245" y1="250" x2="415" y2="420" />
    </g>

    <!-- The Navigated Route (Dashed Path with Origin Ring) -->
    <!-- Origin Ring (Bottom Left) -->
    <circle cx="110" cy="385" r="18" fill="none" stroke="#ffffff" stroke-width="9" />
    <circle cx="110" cy="385" r="6" fill="#0284c7" />

    <!-- Dashed Route Line -->
    <path d="M 124 371 L 246 249 L 268 250 L 296 278 L 380 194"
          fill="none"
          stroke="#ffffff"
          stroke-width="12"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray="14 11" />

    <!-- Route corner indicators / joints -->
    <circle cx="246" cy="249" r="6" fill="#ffffff" />
    <circle cx="296" cy="278" r="6" fill="#ffffff" />

    <!-- Orange Map Pin (Top-Right) -->
    <g filter="url(#pinShadow)">
      <!-- Left (Shadowed) Half of Pin -->
      <path d="M 385 110 C 352 110 330 135 330 162 C 330 200 376 240 385 248 L 385 110 Z"
            fill="#ea580c" />
      
      <!-- Right (Bright) Half of Pin -->
      <path d="M 385 110 C 418 110 440 135 440 162 C 440 200 394 240 385 248 L 385 110 Z"
            fill="#f97316" />

      <!-- Center White Sphere/Dot -->
      <circle cx="385" cy="162" r="23" fill="url(#sphereGrad)" />
      <circle cx="385" cy="162" r="23" fill="none" stroke="#ffffff" stroke-width="2" />
    </g>
  </g>
</svg>`;

// Also a completely transparent version (roads + pin only, transparent bg)
const svgTransparentBg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Pin Shadow -->
    <filter id="pinShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.4" />
    </filter>

    <!-- Pin Inner Dot 3D Sphere Gradient -->
    <radialGradient id="sphereGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>
  </defs>

  <!-- Faint Blueprint Grid in blue/slate -->
  <g stroke="#38bdf8" stroke-opacity="0.5" stroke-width="7" stroke-linecap="round">
    <line x1="170" y1="30" x2="480" y2="340" />
    <line x1="280" y1="30" x2="495" y2="245" />
    <line x1="30" y1="360" x2="450" y2="360" />
    <line x1="340" y1="210" x2="480" y2="350" />
    <line x1="450" y1="230" x2="350" y2="330" />
  </g>

  <!-- Main Solid White/Blue Road Grid -->
  <g stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <line x1="175" y1="80" x2="415" y2="320" />
    <line x1="90" y1="195" x2="315" y2="420" />
    <line x1="260" y1="80" x2="80" y2="260" />
    <line x1="245" y1="250" x2="415" y2="420" />
  </g>

  <!-- Origin Ring -->
  <circle cx="110" cy="385" r="18" fill="none" stroke="#ffffff" stroke-width="9" />
  <circle cx="110" cy="385" r="6" fill="#0284c7" />

  <!-- Dashed Route Line -->
  <path d="M 124 371 L 246 249 L 268 250 L 296 278 L 380 194"
        fill="none"
        stroke="#ffffff"
        stroke-width="12"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="14 11" />

  <circle cx="246" cy="249" r="6" fill="#ffffff" />
  <circle cx="296" cy="278" r="6" fill="#ffffff" />

  <!-- Orange Map Pin -->
  <g filter="url(#pinShadow)">
    <path d="M 385 110 C 352 110 330 135 330 162 C 330 200 376 240 385 248 L 385 110 Z"
          fill="#ea580c" />
    <path d="M 385 110 C 418 110 440 135 440 162 C 440 200 394 240 385 248 L 385 110 Z"
          fill="#f97316" />
    <circle cx="385" cy="162" r="23" fill="url(#sphereGrad)" />
    <circle cx="385" cy="162" r="23" fill="none" stroke="#ffffff" stroke-width="2" />
  </g>
</svg>`;

// Write SVGs to public & assets
fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/app-icon.svg', svgContent);
fs.writeFileSync('public/icons/app-icon-transparent.svg', svgTransparentBg);
fs.writeFileSync('public/favicon.svg', svgContent);

console.log('SVGs created successfully!');
