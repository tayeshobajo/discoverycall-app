"use strict";(()=>{(function(){"use strict";let i=document.currentScript;if(!i)return;let n=i.getAttribute("data-token");if(!n||n.length!==64)return;let o=(i.getAttribute("data-app")||"https://app.discoverycall.ai").replace(/\/$/,""),_=`dc_session_${n}`,r=localStorage.getItem(_);r||(r=u(),localStorage.setItem(_,r));let d=!1,a=null;function u(){let t=new Uint8Array(16);return crypto.getRandomValues(t),Array.from(t,e=>e.toString(16).padStart(2,"0")).join("")}fetch(`${o}/api/widget/config/${n}`,{credentials:"omit",cache:"default"}).then(t=>t.ok?t.json():null).then(t=>{!t||!t.enabled||(a=p(t),document.body.appendChild(a),a.addEventListener("click",()=>{if(!d)g(t),d=!0;else{let e=document.getElementById("dc-chat-panel");e&&e.__toggle?.()}}))}).catch(()=>{});function p(t){let e=document.createElement("button");e.id="dc-widget-btn",e.setAttribute("aria-label","Open chat"),e.setAttribute("data-dc","1");let l={small:"48px",medium:"60px",large:"72px"}[t.buttonSize]||"60px",h={circle:"50%",pill:"999px",square:"12px"}[t.buttonShape]||"50%",m=(t.buttonPosition||"bottom-right")==="bottom-left";if(e.style.cssText=`
      position: fixed;
      ${m?"left: 20px":"right: 20px"};
      bottom: 20px;
      width: ${l};
      height: ${l};
      background: ${t.themeColor||"#1783F1"};
      border: none;
      border-radius: ${h};
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      z-index: 2147483640;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    `,e.innerHTML=t.logoUrl?`<img src="${t.logoUrl}" style="width:60%;height:60%;object-fit:contain;border-radius:4px" alt="" />`:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',e.addEventListener("mouseenter",()=>{e.style.transform="scale(1.08)",e.style.boxShadow="0 6px 24px rgba(0,0,0,0.22)"}),e.addEventListener("mouseleave",()=>{e.style.transform="",e.style.boxShadow="0 4px 16px rgba(0,0,0,0.18)"}),t.pulseAnimation){let c=document.createElement("style");c.textContent=`
        @keyframes dc-pulse {
          0% { box-shadow: 0 0 0 0 ${t.themeColor}60; }
          70% { box-shadow: 0 0 0 12px ${t.themeColor}00; }
          100% { box-shadow: 0 0 0 0 ${t.themeColor}00; }
        }
        #dc-widget-btn { animation: dc-pulse 2s ease-in-out 2s 3; }
      `,document.head.appendChild(c)}return e}function g(t){window.__DC_CONFIG__=t,window.__DC_TOKEN__=n,window.__DC_SESSION__=r,window.__DC_APP__=o;let e=document.createElement("script");e.src=`${o.replace("app.","embed.")}/chat.js`,e.async=!0,e.onerror=()=>{let s=document.createElement("script");s.src=`${o}/embed/chat.js`,s.async=!0,document.head.appendChild(s)},document.head.appendChild(e)}})();})();
