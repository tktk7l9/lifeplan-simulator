export function Hero3D() {
  return (
    <>
      <div
        id="hero3d"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
      />
      <script dangerouslySetInnerHTML={{ __html: `(function(){if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;function l(){var s=document.createElement('script');s.src='/three.min.js';s.onload=function(){var h=document.createElement('script');h.src='/hero3d.js';document.body.appendChild(h);};document.body.appendChild(s);}setTimeout(l,3000);})();` }} />
    </>
  );
}
