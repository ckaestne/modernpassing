# Beyond the Basics

todo

on socks, exchanging clubs, north wall 4 people, mini and micro patterns, civil war feed patterns


test
 

<nav class="tabs">
  <a>Tab 1</a>
  <a>Tab 2</a>
  <a class="active">Tab 3</a>
</nav>
text

<script>window.addEventListener("load",function(){(function(){    
   
   const tabs = [SVG('#tab1'), SVG('#tab2')]
   const figs = [SVG('#fig1'), SVG('#fig2')]

   function cl(){ 
      console.log('clicked', this)
      for (const t of tabs) if (t!==this) { t.removeClass('tab-active'); t.addClass('tab')}
      this.addClass('tab-active')  
      this.removeClass('tab')  
      const idx = tabs.indexOf(this)
      figs[idx].show()
      figs[1-idx].hide()
      
   }

   for (const t of tabs) t.on('click', cl)
   console.log('loaded')
})()})
</script>

<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   version="1.1"
   width="468"
   height="148"
   viewBox="0 0 468 148"
   id="svg60"
   sodipodi:docname="t.svg"
   inkscape:version="1.4 (1:1.4+202410161351+e7c3feb100)"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <sodipodi:namedview
     id="namedview60"
     pagecolor="#ffffff"
     bordercolor="#000000"
     borderopacity="0.25"
     inkscape:showpageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     inkscape:deskcolor="#d1d1d1"
     inkscape:zoom="2.7808334"
     inkscape:cx="39.916091"
     inkscape:cy="184.65687"
     inkscape:window-width="3840"
     inkscape:window-height="2083"
     inkscape:window-x="0"
     inkscape:window-y="0"
     inkscape:window-maximized="1"
     inkscape:current-layer="svg60" />
     <g id="tab1" class="tab-active">
  <rect x=0 y=0 width=40 height=10 id="tab1"  />
  <text id="text1" x="20" dominant-baseline="central" text-anchor="middle" font-size="8" y="5">Aidan</text>
   <line id='line1' x1="0" y1="10" x2="40" y2="10"  stroke-width="2"/> 
</g> 
  <g id="tab2" class="tab" >
  <rect x=40 y=0 width=40 height=10 id="tab1"  />
  <text id="text1" x="60" dominant-baseline="central" text-anchor="middle" font-size="8" y="5">Local</text>
   <line id='line2' x1="40" y1="10" x2="80" y2="10" stroke-width="2"/> 
  </g>
  <rect
     style="fill:#ffccaa"
     id="fig1"
     width="468"
     height="138"
     x="0"
     y="11" stroke-width=0 />
  <rect
     style="fill:lightblue"
     id="fig2"
     width="468"
     height="138"
     x="0"
     y="11" stroke-width=0 />
  </svg>
