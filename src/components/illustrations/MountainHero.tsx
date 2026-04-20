"use client";

const dispatch = (action: string) =>
  window.dispatchEvent(new CustomEvent("bird-action", { detail: { action } }));

export function MountainHero() {
  return (
    <svg
      viewBox="0 0 1200 440"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        {/* ── Filters ─────────────────────────────────────────── */}
        <filter id="farBlur"><feGaussianBlur stdDeviation="2.5" /></filter>
        <filter id="haze" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="rockTex" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65 0.45" numOctaves="4" seed="12" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="snowGlow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="godRayBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="mistBlur" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="cloudAmbient" x="-30%" y="-50%" width="160%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cloudDrop" x="-20%" y="-20%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="cloudGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="cirrusFx" x="-10%" y="-100%" width="120%" height="300%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        {/* ── Mountain gradients ──────────────────────────────── */}
        {/* Main peak: light rocky-blue at tip → deep slate at base */}
        <linearGradient id="heroGrad" x1="0.42" y1="0" x2="0.58" y2="1">
          <stop offset="0%"   stopColor="#b4cad8" />
          <stop offset="28%"  stopColor="#7e9eb5" />
          <stop offset="58%"  stopColor="#4e7088" />
          <stop offset="100%" stopColor="#2c4858" />
        </linearGradient>
        <linearGradient id="leftFlankGrad" x1="0.35" y1="0" x2="0.65" y2="1">
          <stop offset="0%"   stopColor="#a8c0d0" />
          <stop offset="48%"  stopColor="#5a7a90" />
          <stop offset="100%" stopColor="#2e4a5c" />
        </linearGradient>
        <linearGradient id="farRangeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#90b0cc" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#608095" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="midRangeGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor="#8aa8be" />
          <stop offset="100%" stopColor="#3a5870" />
        </linearGradient>
        <linearGradient id="nearRidgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2e4e3c" />
          <stop offset="100%" stopColor="#182c22" />
        </linearGradient>
        <linearGradient id="snowGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="55%"  stopColor="#deeaf2" />
          <stop offset="100%" stopColor="#b8ccd8" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a5830" />
          <stop offset="100%" stopColor="#14281a" />
        </linearGradient>

        {/* ── God ray / atmosphere ────────────────────────────── */}
        <radialGradient id="godRayGrad" cx="940" cy="78" r="520" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffe870" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffe870" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffdf60" stopOpacity="0.45" />
          <stop offset="45%"  stopColor="#ffb040" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ff8020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe08a" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#ffb03a" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="glowHorizon" cx="50%" cy="85%" r="62%">
          <stop offset="0%"   stopColor="#f8c040" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#e08820" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c8dce8" stopOpacity="0.50" />
          <stop offset="100%" stopColor="#c8dce8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mist2Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#d8e8f0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d8e8f0" stopOpacity="0" />
        </linearGradient>

        {/* ── Cloud gradients ─────────────────────────────────── */}
        <linearGradient id="cloudBodyGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="45%"  stopColor="#f2f7fc" />
          <stop offset="100%" stopColor="#c4d8ea" stopOpacity="0.52" />
        </linearGradient>
        <linearGradient id="cloudTopGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8f0f8" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="cloudShadowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7a98b0" stopOpacity="0" />
          <stop offset="100%" stopColor="#7a98b0" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="cloudGoldenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f8e880" stopOpacity="0" />
          <stop offset="100%" stopColor="#f0c050" stopOpacity="0.30" />
        </linearGradient>
        <radialGradient id="cloudSunGlow" cx="65%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#ffe870" stopOpacity="0.45" />
          <stop offset="60%"  stopColor="#ffca40" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ff9820" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="horizonCloudGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fce8b0" stopOpacity="0.65" />
          <stop offset="60%"  stopColor="#f8c860" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e8a030" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ━━━ 1. ATMOSPHERIC BASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ellipse cx="600" cy="408" rx="740" ry="220" fill="url(#glowHorizon)" />

      {/* ━━━ 2. GOD RAYS — volumetric light from sun ━━━━━━━━━━━━ */}
      <g filter="url(#godRayBlur)" opacity="0.11">
        <path d="M 940 78 L 840 440 L 862 440 Z"  fill="url(#godRayGrad)" />
        <path d="M 940 78 L 760 440 L 780 440 Z"  fill="url(#godRayGrad)" />
        <path d="M 940 78 L 684 440 L 700 440 Z"  fill="url(#godRayGrad)" />
        <path d="M 940 78 L 600 440 L 614 440 Z"  fill="url(#godRayGrad)" />
        <path d="M 940 78 L 980 440 L 994 440 Z"  fill="url(#godRayGrad)" />
        <path d="M 940 78 L 1054 440 L 1068 440 Z" fill="url(#godRayGrad)" />
        <path d="M 940 78 L 1130 440 L 1146 440 Z" fill="url(#godRayGrad)" />
        <path d="M 940 78 L 500 440 L 514 440 Z"  fill="url(#godRayGrad)" />
      </g>

      {/* ━━━ 3. SUN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <g
        style={{ cursor: "pointer" }}
        onMouseEnter={() => dispatch("sunglare")}
        onMouseLeave={() => dispatch("idle")}
      >
        <circle cx="940" cy="78" r="150" fill="url(#sunHalo)" />
        <circle cx="940" cy="78" r="40"  fill="url(#sunGrad)" opacity="0.94" />
        <circle cx="940" cy="78" r="31"  fill="#fffad0" opacity="0.84" />
        <g stroke="#ffe880" strokeOpacity="0.42" strokeLinecap="round">
          {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => {
            const a = deg * Math.PI / 180;
            const r1 = (n: number) => Math.round(n * 100) / 100;
            return <line key={deg}
              x1={r1(940 + Math.cos(a)*46)} y1={r1(78 + Math.sin(a)*46)}
              x2={r1(940 + Math.cos(a)*76)} y2={r1(78 + Math.sin(a)*76)}
              strokeWidth="2.5" />;
          })}
        </g>
        {/* Lens flares */}
        <circle cx="940" cy="78" r="5" fill="white" opacity="0.70" />
        <ellipse cx="898" cy="93" rx="9" ry="3.5" fill="#ffe080" opacity="0.22" transform="rotate(-20 898 93)" />
        <ellipse cx="854" cy="108" rx="7" ry="2.5" fill="#ffe080" opacity="0.16" transform="rotate(-22 854 108)" />
      </g>

      {/* ━━━ 4. GHOST / ULTRA-DISTANT PEAKS ━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 298 C 70 282 145 270 230 268 C 305 266 380 272 460 274 C 540 276 618 268 696 262 C 770 256 845 254 924 258 C 1000 262 1075 270 1154 276 C 1180 278 1196 280 1210 282 L 1210 440 L -10 440 Z"
        fill="#b4c8d8" opacity="0.20" filter="url(#farBlur)"
      />

      {/* ━━━ 5. FAR MOUNTAIN RANGE — atmospheric blue-purple ━━━━ */}
      {/* Multi-peak complex path — 6 peaks spanning full width */}
      <path
        d="M -10 305
          C 35 290 65 278 95 268 L 118 260
          C 130 250 142 238 154 226 L 166 216
          C 178 206 190 200 200 200 L 208 208
          C 218 220 230 234 244 250 L 256 265
          C 272 278 292 290 312 295 L 334 284
          C 348 270 360 256 374 242 L 386 228
          C 398 214 412 200 426 190 L 440 182
          C 452 178 463 176 472 178 L 480 182
          C 492 190 504 204 518 220 L 530 238
          C 546 256 562 270 580 280 L 600 270
          C 614 256 626 242 640 228 L 653 214
          C 667 198 683 182 699 172 L 715 164
          C 729 158 742 158 755 164 L 762 170
          C 774 180 786 196 798 214 L 810 232
          C 822 250 836 266 854 276 L 874 266
          C 888 252 900 238 914 224 L 928 210
          C 942 196 956 183 971 175 L 984 170
          C 997 168 1010 170 1022 176 L 1030 184
          C 1042 196 1054 212 1068 226 L 1082 240
          C 1096 256 1114 268 1134 274 L 1155 264
          C 1168 252 1180 238 1194 226
          L 1210 218 L 1210 440 L -10 440 Z"
        fill="url(#farRangeGrad)"
        opacity="0.72"
        filter="url(#farBlur)"
      />

      {/* ━━━ 6. ATMOSPHERIC MIST BAND 1 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 248 C 200 240 400 238 600 240 C 800 242 1000 244 1210 248 L 1210 275 C 1000 272 800 270 600 268 C 400 266 200 268 -10 272 Z"
        fill="url(#mistGrad)" filter="url(#mistBlur)"
      />

      {/* ━━━ 7. MID-RANGE RIDGELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 348
          C 35 332 75 316 118 300
          L 124 294 C 138 282 152 268 168 255
          L 175 262 C 190 274 205 286 225 294
          C 250 302 275 302 300 296
          L 306 288 C 320 274 335 260 350 248
          L 357 256 C 372 268 388 280 406 288
          C 430 298 455 300 478 294
          L 484 285 C 498 270 512 255 527 244
          L 535 252 C 549 264 563 278 580 286
          C 602 296 626 298 650 290
          L 658 280 C 672 264 686 248 701 236
          L 710 245 C 724 258 740 270 758 278
          C 782 288 808 290 834 282
          L 842 272 C 856 256 870 240 886 228
          L 896 238 C 910 252 926 264 944 272
          C 970 282 997 284 1024 276
          L 1032 265 C 1046 248 1060 232 1078 220
          L 1088 230 C 1102 244 1118 258 1138 266
          C 1162 276 1188 278 1210 272
          L 1210 440 L -10 440 Z"
        fill="url(#midRangeGrad)"
        opacity="0.75"
        filter="url(#haze)"
      />

      {/* ━━━ 8. ATMOSPHERIC MIST BAND 2 ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 300 C 200 293 400 290 600 292 C 800 294 1000 296 1210 300 L 1210 324 C 1000 320 800 318 600 316 C 400 314 200 316 -10 320 Z"
        fill="url(#mist2Grad)" filter="url(#mistBlur)"
      />

      {/* ━━━ 9. LEFT FLANKING MOUNTAIN ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 440 L -10 418
          C 22 404 54 388 86 370
          C 118 352 146 330 172 308
          C 196 286 218 264 238 242
          L 244 248 C 256 234 268 220 282 207
          L 288 215 C 300 202 314 190 328 180
          L 336 188 C 348 176 362 166 376 160
          C 390 154 404 156 418 166
          C 432 176 444 192 456 210
          C 466 226 476 244 488 258
          L 494 266 C 484 274 475 282 466 292
          L 454 300"
        fill="url(#leftFlankGrad)"
        filter="url(#rockTex)"
      />
      {/* Left flank light face */}
      <path
        d="M 376 160 C 390 154 404 156 418 166 C 432 176 444 192 456 210 C 444 196 430 184 416 175 C 402 166 388 162 374 164 Z"
        fill="#8ab0c8" opacity="0.40"
      />

      {/* ━━━ 10. HERO MOUNTAIN — main central peak ━━━━━━━━━━━━━━ */}
      {/* One continuous complex path: left base → summit → right base */}
      <path
        d="M 454 300
          C 466 284 480 268 494 252
          L 488 260 C 500 244 514 228 528 214
          L 522 222 C 534 206 548 190 563 176
          L 557 184 C 570 168 584 152 600 136
          L 593 145 C 607 128 621 112 637 96
          L 630 105 C 644 88 659 72 675 56
          L 668 65 C 682 48 696 32 710 16
          L 703 24 C 713 10 720 1 704 3
          [SUMMIT‑APPROX (704,3)]
          C 715 12 724 24 734 38
          L 727 47 C 741 63 756 81 770 98
          L 762 107 C 778 124 794 141 810 156
          L 802 165 C 818 180 834 194 851 206
          L 843 215 C 858 228 874 238 892 244
          C 910 250 928 248 945 240
          L 952 232 C 966 220 979 206 994 196
          L 1000 192 C 1013 186 1026 184 1038 188
          [SEC‑SUMMIT‑APPROX]
          C 1050 194 1062 206 1075 220
          L 1068 228 C 1082 242 1098 254 1116 262
          C 1140 270 1168 272 1196 268
          L 1210 266 L 1210 440 L -10 440 Z"
        fill="url(#heroGrad)"
        filter="url(#rockTex)"
      />

      {/* ── Shadow face (left / steep side of hero) ──────────── */}
      <path
        d="M 704 3 C 696 22 686 42 675 56 C 659 72 644 88 630 105 C 607 128 593 145 600 136 C 584 152 570 168 557 184 C 548 190 534 206 522 222 C 510 236 498 250 488 260 C 476 272 466 284 454 300 C 440 314 425 326 410 336 C 396 312 384 288 373 265 C 395 242 418 218 442 196 C 466 174 490 150 514 125 C 536 102 560 78 584 56 C 605 36 626 18 646 6 C 665 -6 685 -6 704 3 Z"
        fill="#162432" opacity="0.36"
      />
      {/* Right face highlight (sun-lit) */}
      <path
        d="M 704 3 C 716 12 728 26 740 42 C 754 62 768 84 782 104 C 794 122 806 140 818 156 C 830 172 842 186 854 198 C 836 184 818 166 800 144 C 782 122 762 96 744 68 C 728 44 714 24 704 3 Z"
        fill="#90b4cc" opacity="0.26"
      />

      {/* ── Rocky strata lines ────────────────────────────────── */}
      <g stroke="#3a5060" strokeOpacity="0.20" strokeLinecap="round" strokeWidth="1.1">
        <path d="M 572 178 C 598 162 624 150 652 142 C 678 134 704 130 726 134 C 748 138 768 148 786 162" />
        <path d="M 585 210 C 612 194 640 180 666 172 C 692 164 717 160 740 164 C 762 168 784 180 802 194" />
        <path d="M 598 242 C 625 226 653 212 679 204 C 706 196 730 192 754 196 C 778 200 800 212 820 228" />
        <path d="M 612 272 C 640 256 666 244 692 236 C 718 228 742 226 768 230 C 792 234 816 248 836 262" />
      </g>

      {/* ── Snow cap — main summit ─────────────────────────────── */}
      {/* Primary cap */}
      <path
        d="M 668 54 C 682 40 695 26 704 12 C 714 24 726 40 738 56 C 723 42 708 32 695 26 C 684 34 676 44 668 54 Z"
        fill="url(#snowGrad)" filter="url(#snowGlow)"
      />
      {/* Snow specular */}
      <path d="M 698 14 C 708 9 718 10 726 16 C 718 18 710 20 703 22 Z" fill="white" opacity="0.94" />
      {/* Secondary snow patch — left shoulder */}
      <path d="M 640 98 C 646 87 655 78 665 74 C 660 86 652 96 642 108 Z" fill="#daeaf4" opacity="0.82" />
      {/* Snow patch — right shoulder notch */}
      <path d="M 795 100 C 800 90 808 84 816 86 C 814 98 806 108 796 114 Z" fill="#daeaf4" opacity="0.78" />
      {/* High snow streaks in crevices */}
      <path d="M 632 118 C 637 112 643 108 648 110 C 645 117 640 122 634 124 Z" fill="white" opacity="0.72" />
      <path d="M 760 122 C 765 116 770 112 776 114 C 773 121 768 126 762 128 Z" fill="white" opacity="0.68" />

      {/* ━━━ 11. NEAR DARK RIDGELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 440 L -10 398
          C 28 390 66 382 104 374
          L 112 366 C 124 356 136 348 150 344
          L 156 352 C 168 360 182 368 198 372
          C 220 378 245 378 268 370
          L 276 360 C 290 348 304 338 320 334
          L 328 342 C 342 352 358 360 376 364
          C 400 370 426 370 450 362
          L 458 352 C 472 340 486 330 502 326
          L 510 334 C 524 344 540 354 560 358
          C 584 364 610 362 634 352
          L 644 342 C 658 330 672 318 688 314
          L 698 322 C 712 332 728 344 748 350
          C 774 358 802 358 828 348
          L 838 338 C 852 324 866 312 882 308
          L 892 316 C 906 328 922 340 942 346
          C 968 354 996 354 1022 344
          L 1032 332 C 1046 318 1060 306 1078 302
          L 1088 312 C 1102 326 1120 338 1140 344
          C 1166 352 1192 352 1210 344
          L 1210 440 Z"
        fill="url(#nearRidgeGrad)"
      />

      {/* ━━━ 12. GROUND ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 440 L -10 400
          C 30 394 70 390 112 388 C 152 386 190 386 228 388
          C 268 390 306 394 344 398 C 382 402 420 405 460 406
          C 500 407 538 406 578 404 C 618 402 656 398 694 396
          C 732 394 768 394 806 396 C 844 398 882 404 920 408
          C 958 412 996 414 1034 414 C 1072 414 1110 412 1148 410
          C 1172 408 1192 406 1210 404 L 1210 440 Z"
        fill="url(#groundGrad)"
      />

      {/* ━━━ 13. FOREST SILHOUETTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Dense pine forest — organic varied silhouette */}
      <g fill="#162e1c" opacity="0.97">
        {/* Left dense forest — varied tree sizes */}
        {([
          [14,396,-46,18,2], [38,397,-52,20,2], [58,396,-44,17,2], [78,397,-50,19,2],
          [100,396,-58,22,2],[120,397,-48,19,2],[140,396,-54,21,2],[160,397,-48,18,2],
          [178,396,-42,17,2],[196,397,-50,20,2],[214,396,-44,17,2],[232,397,-56,22,2],
        ] as [number,number,number,number,number][]).map(([x,y,h,w]) => (
          <g key={x} transform={`translate(${x},${y})`}>
            <polygon points={`0,${h} ${-w*0.55},${h*0.40} ${w*0.55},${h*0.40}`} />
            <polygon points={`0,${h*0.65} ${-w*0.65},${h*0.10} ${w*0.65},${h*0.10}`} />
            <polygon points={`0,${h*0.38} ${-w*0.72},${-h*0.14} ${w*0.72},${-h*0.14}`} />
            <rect x={-w*0.16} y="0" width={w*0.32} height={-h*0.14} />
          </g>
        ))}
        {/* Right forest */}
        {([
          [958,402,-40,16,2],[978,401,-48,19,2],[998,402,-44,17,2],[1018,401,-52,20,2],
          [1038,402,-46,18,2],[1058,401,-50,20,2],[1078,402,-42,16,2],[1098,401,-48,18,2],
          [1118,402,-54,21,2],[1138,401,-44,17,2],[1158,402,-50,19,2],[1178,401,-44,17,2],
        ] as [number,number,number,number,number][]).map(([x,y,h,w]) => (
          <g key={x} transform={`translate(${x},${y})`}>
            <polygon points={`0,${h} ${-w*0.55},${h*0.40} ${w*0.55},${h*0.40}`} />
            <polygon points={`0,${h*0.65} ${-w*0.65},${h*0.10} ${w*0.65},${h*0.10}`} />
            <polygon points={`0,${h*0.38} ${-w*0.72},${-h*0.14} ${w*0.72},${-h*0.14}`} />
            <rect x={-w*0.16} y="0" width={w*0.32} height={-h*0.14} />
          </g>
        ))}
        {/* Mid-scene scattered trees */}
        {([
          [265,395,-36,14],[288,394,-42,16],[318,395,-38,15],[345,394,-44,17],
          [368,395,-36,14],[395,394,-40,16],[418,395,-44,17],[445,394,-36,14],
          [470,395,-40,16],[494,394,-38,15],[518,395,-44,17],[542,394,-36,14],
          [564,395,-42,16],[590,394,-38,15],[618,395,-44,17],[645,394,-36,14],
          [672,395,-40,16],[698,394,-42,16],[726,395,-36,14],[754,394,-44,17],
          [782,395,-38,15],[810,394,-42,16],[838,395,-40,16],[864,394,-36,14],
          [890,395,-44,17],[916,394,-38,15],[940,395,-42,16],
        ] as [number,number,number,number][]).map(([x,y,h,w]) => (
          <g key={x} transform={`translate(${x},${y})`}>
            <polygon points={`0,${h} ${-w*0.55},${h*0.38} ${w*0.55},${h*0.38}`} />
            <polygon points={`0,${h*0.62} ${-w*0.65},${h*0.08} ${w*0.65},${h*0.08}`} />
            <polygon points={`0,${h*0.35} ${-w*0.70},${-h*0.16} ${w*0.70},${-h*0.16}`} />
            <rect x={-w*0.15} y="0" width={w*0.30} height={-h*0.16} />
          </g>
        ))}
      </g>

      {/* ━━━ 14. GROUND MIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M -10 440 L -10 402 C 100 396 200 393 350 392 C 500 391 650 391 800 392 C 950 393 1100 396 1210 400 L 1210 440 Z"
        fill="#223c28" opacity="0.55"
      />

      {/* ━━━ 15. TRAIL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <path
        d="M 1104 432 C 1082 409 1058 384 1032 356 C 1006 328 978 300 950 272 C 922 244 896 214 870 184 C 844 154 820 126 798 100 C 776 74 758 52 743 32 C 735 19 727 10 720 5"
        fill="none" stroke="white" strokeWidth="2.8" strokeOpacity="0.72"
        strokeDasharray="10 7" strokeLinecap="round"
      />
      {/* Trail waypoints */}
      {([{cx:1066,cy:395},{cx:1008,cy:336},{cx:950,cy:274},{cx:882,cy:206},{cx:830,cy:148}] as {cx:number,cy:number}[]).map((p,i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r={7.5} fill="#ff9020" opacity="0.88" />
          <circle cx={p.cx} cy={p.cy} r={4}   fill="white"   opacity="0.97" />
        </g>
      ))}
      {/* Base camp marker */}
      <rect x="1079" y="416" width="54" height="24" rx="4" fill="#1a1a2e" opacity="0.82" />
      <text x="1106" y="433" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ff9020">B.C.</text>

      {/* Summit flag */}
      <g
        style={{ cursor: "pointer" }}
        onMouseEnter={() => dispatch("celebrate")}
        onMouseLeave={() => dispatch("idle")}
      >
        <circle cx="720" cy="-4" r="32" fill="transparent" />
        <line x1="720" y1="5" x2="720" y2="-23" stroke="white" strokeWidth="2.5" strokeOpacity="0.94" strokeLinecap="round" />
        <path d="M 720 -23 L 750 -13 L 720 -3 Z" fill="#ff5020" opacity="0.95" />
        <text x="754" y="-9" fontSize="11" fill="white" fillOpacity="0.92" fontWeight="bold">山頂</text>
      </g>

      {/* ━━━ 16. HIKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <g transform="translate(948, 258)">
        <ellipse cx="1" cy="35" rx="9" ry="3" fill="#000" opacity="0.22" />
        <line x1="0" y1="22" x2="-7" y2="36" stroke="#c87030" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="22" x2="8"  y2="35" stroke="#c87030" strokeWidth="3" strokeLinecap="round" />
        <path d="M -4 8 L 4 8 L 3 22 L -3 22 Z" fill="#2060c0" />
        <rect x="3" y="8" width="9" height="13" rx="2" fill="#8b4513" />
        <rect x="4" y="9" width="7" height="2" rx="1" fill="#a0522d" opacity="0.7" />
        <line x1="-4" y1="12" x2="-14" y2="20" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="-14" y1="20" x2="-18" y2="35" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4"  y1="12" x2="10"  y2="18" stroke="#2060c0" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="0"  y1="8"  x2="0"   y2="3"  stroke="#d4956a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="-3" r="7.5" fill="#d4956a" />
        <path d="M -8 -6 L 8 -6 L 6 -12 L -6 -12 Z" fill="#8b4513" />
        <path d="M -9 -6 L 9 -6" stroke="#8b4513" strokeWidth="2" strokeLinecap="round" />
        <circle cx="2" cy="-3.5" r="1.2" fill="#3a2010" />
      </g>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 17. CLOUDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Cirrus wisps */}
      <g>
        <path d="M 190 28 C 240 21 305 19 368 17 C 415 15 460 19 502 23" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.18" filter="url(#cirrusFx)" />
        <path d="M 190 28 C 240 21 305 19 368 17 C 415 15 460 19 502 23" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 238 40 C 278 34 320 33 362 30 C 395 28 425 30 452 34" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.15" filter="url(#cirrusFx)" />
        <path d="M 238 40 C 278 34 320 33 362 30 C 395 28 425 30 452 34" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.42" />
        <path d="M 582 16 C 612 11 648 13 678 10" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.15" filter="url(#cirrusFx)" />
        <path d="M 582 16 C 612 11 648 13 678 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.40" />
        <path d="M 755 22 C 805 15 858 17 908 13" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.18" filter="url(#cirrusFx)" />
        <path d="M 755 22 C 805 15 858 17 908 13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.52" />
      </g>

      {/* Cloud A — large left cumulus */}
      <g>
        <ellipse cx="152" cy="80" rx="90" ry="34" fill="white" opacity="0.06" filter="url(#cloudGlow)" />
        <ellipse cx="157" cy="100" rx="74" ry="12" fill="#8098b0" opacity="0.18" filter="url(#cloudDrop)" />
        <ellipse cx="152" cy="82" rx="68" ry="22" fill="url(#cloudBodyGrad)" />
        <ellipse cx="110" cy="85" rx="44" ry="21" fill="url(#cloudBodyGrad)" />
        <ellipse cx="196" cy="84" rx="48" ry="20" fill="url(#cloudBodyGrad)" />
        <ellipse cx="136" cy="69" rx="38" ry="26" fill="url(#cloudBodyGrad)" />
        <ellipse cx="167" cy="65" rx="34" ry="28" fill="url(#cloudBodyGrad)" />
        <ellipse cx="112" cy="74" rx="30" ry="22" fill="url(#cloudBodyGrad)" />
        <ellipse cx="196" cy="72" rx="30" ry="21" fill="url(#cloudBodyGrad)" />
        <ellipse cx="138" cy="58" rx="28" ry="22" fill="url(#cloudTopGrad)" opacity="0.92" />
        <ellipse cx="168" cy="54" rx="26" ry="24" fill="url(#cloudTopGrad)" opacity="0.90" />
        <ellipse cx="114" cy="64" rx="22" ry="19" fill="url(#cloudTopGrad)" opacity="0.85" />
        <ellipse cx="162" cy="47" rx="15" ry="12" fill="white" opacity="0.97" />
        <ellipse cx="135" cy="51" rx="11" ry="9"  fill="white" opacity="0.90" />
        <ellipse cx="152" cy="95" rx="62" ry="13" fill="url(#cloudGoldenGrad)" />
        <ellipse cx="152" cy="96" rx="60" ry="11" fill="url(#cloudShadowGrad)" />
      </g>

      {/* Cloud B — near sun, backlit golden */}
      <g>
        <ellipse cx="1042" cy="56" rx="105" ry="40" fill="url(#cloudSunGlow)" filter="url(#cloudGlow)" />
        <ellipse cx="1046" cy="82" rx="76" ry="11" fill="#8098b0" opacity="0.16" filter="url(#cloudDrop)" />
        <ellipse cx="1042" cy="64" rx="72" ry="22" fill="url(#cloudBodyGrad)" />
        <ellipse cx="998"  cy="67" rx="46" ry="21" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1088" cy="66" rx="50" ry="20" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1024" cy="51" rx="36" ry="27" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1058" cy="47" rx="32" ry="30" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1000" cy="56" rx="28" ry="23" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1086" cy="54" rx="28" ry="22" fill="url(#cloudBodyGrad)" />
        <ellipse cx="1025" cy="42" rx="26" ry="22" fill="url(#cloudTopGrad)" opacity="0.90" />
        <ellipse cx="1058" cy="38" rx="24" ry="24" fill="url(#cloudTopGrad)" opacity="0.88" />
        <ellipse cx="1052" cy="31" rx="15" ry="12" fill="white" opacity="0.97" />
        <ellipse cx="1075" cy="54" rx="42" ry="24" fill="#ffe870" opacity="0.14" />
        <ellipse cx="1042" cy="76" rx="68" ry="12" fill="url(#cloudGoldenGrad)" />
        <ellipse cx="1042" cy="78" rx="66" ry="10" fill="url(#cloudShadowGrad)" />
      </g>

      {/* Cloud C — mid-sky */}
      <g transform="translate(524, 55)">
        <ellipse cx="2"  cy="30" rx="58" ry="10" fill="#8098b0" opacity="0.16" filter="url(#cloudDrop)" />
        <ellipse cx="0"  cy="10" rx="56" ry="19" fill="url(#cloudBodyGrad)" />
        <ellipse cx="-36" cy="13" rx="36" ry="17" fill="url(#cloudBodyGrad)" />
        <ellipse cx="38" cy="13" rx="40" ry="16" fill="url(#cloudBodyGrad)" />
        <ellipse cx="-10" cy="-2" rx="32" ry="22" fill="url(#cloudBodyGrad)" />
        <ellipse cx="15" cy="-6" rx="28" ry="24" fill="url(#cloudBodyGrad)" />
        <ellipse cx="-8" cy="-14" rx="22" ry="18" fill="url(#cloudTopGrad)" opacity="0.90" />
        <ellipse cx="16" cy="-18" rx="20" ry="20" fill="url(#cloudTopGrad)" opacity="0.88" />
        <ellipse cx="10" cy="-26" rx="13" ry="11" fill="white" opacity="0.96" />
        <ellipse cx="2"  cy="22" rx="52" ry="11" fill="url(#cloudGoldenGrad)" />
        <ellipse cx="2"  cy="24" rx="50" ry="9"  fill="url(#cloudShadowGrad)" />
      </g>

      {/* Cloud D — small accent, upper center */}
      <g transform="translate(340, 42)">
        <ellipse cx="0"  cy="14" rx="38" ry="7"  fill="#8098b0" opacity="0.14" filter="url(#cloudDrop)" />
        <ellipse cx="0"  cy="6"  rx="38" ry="14" fill="url(#cloudBodyGrad)" />
        <ellipse cx="-22" cy="8" rx="24" ry="13" fill="url(#cloudBodyGrad)" />
        <ellipse cx="24" cy="9"  rx="26" ry="12" fill="url(#cloudBodyGrad)" />
        <ellipse cx="-5" cy="-5" rx="22" ry="16" fill="url(#cloudBodyGrad)" />
        <ellipse cx="14" cy="-9" rx="18" ry="17" fill="url(#cloudTopGrad)" opacity="0.88" />
        <ellipse cx="8"  cy="-18" rx="10" ry="8" fill="white" opacity="0.94" />
        <ellipse cx="0"  cy="18" rx="34" ry="7"  fill="url(#cloudShadowGrad)" />
      </g>

      {/* Warm horizon cloud band */}
      <path
        d="M -10 216 C 60 208 150 204 260 207 C 360 210 460 218 570 218 C 680 218 780 212 880 208 C 960 205 1040 208 1120 213 C 1160 216 1190 216 1210 214 L 1210 248 C 1100 242 950 238 800 240 C 650 242 500 242 350 240 C 200 238 80 238 -10 240 Z"
        fill="url(#horizonCloudGrad)" filter="url(#cloudDrop)"
      />

      {/* ━━━ 18. BIRDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <g fill="none" stroke="#0d1117" strokeOpacity="0.42" strokeLinecap="round" strokeWidth="2">
        <path d="M 370 102 Q 377 96 384 99 Q 380 95 386 96 Q 393 90 401 93" />
        <path d="M 416 118 Q 423 112 431 115 Q 427 111 433 112 Q 440 106 448 109" />
        <path d="M 388 132 Q 394 127 400 130 Q 396 126 402 127 Q 408 122 414 125" strokeWidth="1.8" strokeOpacity="0.38" />
      </g>
    </svg>
  );
}
