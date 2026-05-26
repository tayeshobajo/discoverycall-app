"use strict";(()=>{var re,f,Me,gt,O,Pe,Re,Oe,ce,Z,B,Ue,pe,ue,de,yt,ee={},te=[],bt=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,V=Array.isArray;function R(e,t){for(var n in t)e[n]=t[n];return e}function he(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function H(e,t,n){var r,o,i,s={};for(i in t)i=="key"?r=t[i]:i=="ref"?o=t[i]:s[i]=t[i];if(arguments.length>2&&(s.children=arguments.length>3?re.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(i in e.defaultProps)s[i]===void 0&&(s[i]=e.defaultProps[i]);return Q(e,s,r,o,null)}function Q(e,t,n,r,o){var i={type:e,props:t,key:n,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:o??++Me,__i:-1,__u:0};return o==null&&f.vnode!=null&&f.vnode(i),i}function P(e){return e.children}function M(e,t){this.props=e,this.context=t}function z(e,t){if(t==null)return e.__?z(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?z(e):null}function xt(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,r=[],o=[],i=R({},t);i.__v=t.__v+1,f.vnode&&f.vnode(i),me(e.__P,i,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,r,n??z(t),!!(32&t.__u),o),i.__v=t.__v,i.__.__k[i.__i]=i,Le(r,i,o),t.__e=t.__=null,i.__e!=n&&Ae(i)}}function Ae(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Ae(e)}function De(e){(!e.__d&&(e.__d=!0)&&O.push(e)&&!ne.__r++||Pe!=f.debounceRendering)&&((Pe=f.debounceRendering)||Re)(ne)}function ne(){try{for(var e,t=1;O.length;)O.length>t&&O.sort(Oe),e=O.shift(),t=O.length,xt(e)}finally{O.length=ne.__r=0}}function Fe(e,t,n,r,o,i,s,l,c,_,d){var a,h,u,y,k,w,v,m=r&&r.__k||te,g=t.length;for(c=wt(n,t,m,c,g),a=0;a<g;a++)(u=n.__k[a])!=null&&(h=u.__i!=-1&&m[u.__i]||ee,u.__i=a,w=me(e,u,h,o,i,s,l,c,_,d),y=u.__e,u.ref&&h.ref!=u.ref&&(h.ref&&ve(h.ref,null,u),d.push(u.ref,u.__c||y,u)),k==null&&y!=null&&(k=y),(v=!!(4&u.__u))||h.__k===u.__k?(c=He(u,c,e,v),v&&h.__e&&(h.__e=null)):typeof u.type=="function"&&w!==void 0?c=w:y&&(c=y.nextSibling),u.__u&=-7);return n.__e=k,c}function wt(e,t,n,r,o){var i,s,l,c,_,d=n.length,a=d,h=0;for(e.__k=new Array(o),i=0;i<o;i++)(s=t[i])!=null&&typeof s!="boolean"&&typeof s!="function"?(typeof s=="string"||typeof s=="number"||typeof s=="bigint"||s.constructor==String?s=e.__k[i]=Q(null,s,null,null,null):V(s)?s=e.__k[i]=Q(P,{children:s},null,null,null):s.constructor===void 0&&s.__b>0?s=e.__k[i]=Q(s.type,s.props,s.key,s.ref?s.ref:null,s.__v):e.__k[i]=s,c=i+h,s.__=e,s.__b=e.__b+1,l=null,(_=s.__i=kt(s,n,c,a))!=-1&&(a--,(l=n[_])&&(l.__u|=2)),l==null||l.__v==null?(_==-1&&(o>d?h--:o<d&&h++),typeof s.type!="function"&&(s.__u|=4)):_!=c&&(_==c-1?h--:_==c+1?h++:(_>c?h--:h++,s.__u|=4))):e.__k[i]=null;if(a)for(i=0;i<d;i++)(l=n[i])!=null&&(2&l.__u)==0&&(l.__e==r&&(r=z(l)),ze(l,l));return r}function He(e,t,n,r){var o,i;if(typeof e.type=="function"){for(o=e.__k,i=0;o&&i<o.length;i++)o[i]&&(o[i].__=e,t=He(o[i],t,n,r));return t}e.__e!=t&&(r&&(t&&e.type&&!t.parentNode&&(t=z(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function j(e,t){return t=t||[],e==null||typeof e=="boolean"||(V(e)?e.some(function(n){j(n,t)}):t.push(e)),t}function kt(e,t,n,r){var o,i,s,l=e.key,c=e.type,_=t[n],d=_!=null&&(2&_.__u)==0;if(_===null&&l==null||d&&l==_.key&&c==_.type)return n;if(r>(d?1:0)){for(o=n-1,i=n+1;o>=0||i<t.length;)if((_=t[s=o>=0?o--:i++])!=null&&(2&_.__u)==0&&l==_.key&&c==_.type)return s}return-1}function Ie(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||bt.test(t)?n:n+"px"}function X(e,t,n,r,o){var i,s;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof r=="string"&&(e.style.cssText=r=""),r)for(t in r)n&&t in n||Ie(e.style,t,"");if(n)for(t in n)r&&n[t]==r[t]||Ie(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")i=t!=(t=t.replace(Ue,"$1")),s=t.toLowerCase(),t=s in e||t=="onFocusOut"||t=="onFocusIn"?s.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+i]=n,n?r?n[B]=r[B]:(n[B]=pe,e.addEventListener(t,i?de:ue,i)):e.removeEventListener(t,i?de:ue,i);else{if(o=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function Te(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t[Z]==null)t[Z]=pe++;else if(t[Z]<n[B])return;return n(f.event?f.event(t):t)}}}function me(e,t,n,r,o,i,s,l,c,_){var d,a,h,u,y,k,w,v,m,g,S,D,G,A,E,N=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(c=!!(32&n.__u),i=[l=t.__e=n.__e]),(d=f.__b)&&d(t);e:if(typeof N=="function")try{if(v=t.props,m=N.prototype&&N.prototype.render,g=(d=N.contextType)&&r[d.__c],S=d?g?g.props.value:d.__:r,n.__c?w=(a=t.__c=n.__c).__=a.__E:(m?t.__c=a=new N(v,S):(t.__c=a=new M(v,S),a.constructor=N,a.render=St),g&&g.sub(a),a.state||(a.state={}),a.__n=r,h=a.__d=!0,a.__h=[],a._sb=[]),m&&a.__s==null&&(a.__s=a.state),m&&N.getDerivedStateFromProps!=null&&(a.__s==a.state&&(a.__s=R({},a.__s)),R(a.__s,N.getDerivedStateFromProps(v,a.__s))),u=a.props,y=a.state,a.__v=t,h)m&&N.getDerivedStateFromProps==null&&a.componentWillMount!=null&&a.componentWillMount(),m&&a.componentDidMount!=null&&a.__h.push(a.componentDidMount);else{if(m&&N.getDerivedStateFromProps==null&&v!==u&&a.componentWillReceiveProps!=null&&a.componentWillReceiveProps(v,S),t.__v==n.__v||!a.__e&&a.shouldComponentUpdate!=null&&a.shouldComponentUpdate(v,a.__s,S)===!1){t.__v!=n.__v&&(a.props=v,a.state=a.__s,a.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(I){I&&(I.__=t)}),te.push.apply(a.__h,a._sb),a._sb=[],a.__h.length&&s.push(a);break e}a.componentWillUpdate!=null&&a.componentWillUpdate(v,a.__s,S),m&&a.componentDidUpdate!=null&&a.__h.push(function(){a.componentDidUpdate(u,y,k)})}if(a.context=S,a.props=v,a.__P=e,a.__e=!1,D=f.__r,G=0,m)a.state=a.__s,a.__d=!1,D&&D(t),d=a.render(a.props,a.state,a.context),te.push.apply(a.__h,a._sb),a._sb=[];else do a.__d=!1,D&&D(t),d=a.render(a.props,a.state,a.context),a.state=a.__s;while(a.__d&&++G<25);a.state=a.__s,a.getChildContext!=null&&(r=R(R({},r),a.getChildContext())),m&&!h&&a.getSnapshotBeforeUpdate!=null&&(k=a.getSnapshotBeforeUpdate(u,y)),A=d!=null&&d.type===P&&d.key==null?We(d.props.children):d,l=Fe(e,V(A)?A:[A],t,n,r,o,i,s,l,c,_),a.base=t.__e,t.__u&=-161,a.__h.length&&s.push(a),w&&(a.__E=a.__=null)}catch(I){if(t.__v=null,c||i!=null)if(I.then){for(t.__u|=c?160:128;l&&l.nodeType==8&&l.nextSibling;)l=l.nextSibling;i[i.indexOf(l)]=null,t.__e=l}else{for(E=i.length;E--;)he(i[E]);fe(t)}else t.__e=n.__e,t.__k=n.__k,I.then||fe(t);f.__e(I,t,n)}else i==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):l=t.__e=Ct(n.__e,t,n,r,o,i,s,c,_);return(d=f.diffed)&&d(t),128&t.__u?void 0:l}function fe(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(fe))}function Le(e,t,n){for(var r=0;r<n.length;r++)ve(n[r],n[++r],n[++r]);f.__c&&f.__c(t,e),e.some(function(o){try{e=o.__h,o.__h=[],e.some(function(i){i.call(o)})}catch(i){f.__e(i,o.__v)}})}function We(e){return typeof e!="object"||e==null||e.__b>0?e:V(e)?e.map(We):e.constructor!==void 0?null:R({},e)}function Ct(e,t,n,r,o,i,s,l,c){var _,d,a,h,u,y,k,w=n.props||ee,v=t.props,m=t.type;if(m=="svg"?o="http://www.w3.org/2000/svg":m=="math"?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),i!=null){for(_=0;_<i.length;_++)if((u=i[_])&&"setAttribute"in u==!!m&&(m?u.localName==m:u.nodeType==3)){e=u,i[_]=null;break}}if(e==null){if(m==null)return document.createTextNode(v);e=document.createElementNS(o,m,v.is&&v),l&&(f.__m&&f.__m(t,i),l=!1),i=null}if(m==null)w===v||l&&e.data==v||(e.data=v);else{if(i=m=="textarea"&&v.defaultValue!=null?null:i&&re.call(e.childNodes),!l&&i!=null)for(w={},_=0;_<e.attributes.length;_++)w[(u=e.attributes[_]).name]=u.value;for(_ in w)u=w[_],_=="dangerouslySetInnerHTML"?a=u:_=="children"||_ in v||_=="value"&&"defaultValue"in v||_=="checked"&&"defaultChecked"in v||X(e,_,null,u,o);for(_ in v)u=v[_],_=="children"?h=u:_=="dangerouslySetInnerHTML"?d=u:_=="value"?y=u:_=="checked"?k=u:l&&typeof u!="function"||w[_]===u||X(e,_,u,w[_],o);if(d)l||a&&(d.__html==a.__html||d.__html==e.innerHTML)||(e.innerHTML=d.__html),t.__k=[];else if(a&&(e.innerHTML=""),Fe(t.type=="template"?e.content:e,V(h)?h:[h],t,n,r,m=="foreignObject"?"http://www.w3.org/1999/xhtml":o,i,s,i?i[0]:n.__k&&z(n,0),l,c),i!=null)for(_=i.length;_--;)he(i[_]);l&&m!="textarea"||(_="value",m=="progress"&&y==null?e.removeAttribute("value"):y!=null&&(y!==e[_]||m=="progress"&&!y||m=="option"&&y!=w[_])&&X(e,_,y,w[_],o),_="checked",k!=null&&k!=e[_]&&X(e,_,k,w[_],o))}return e}function ve(e,t,n){try{if(typeof e=="function"){var r=typeof e.__u=="function";r&&e.__u(),r&&t==null||(e.__u=e(t))}else e.current=t}catch(o){f.__e(o,n)}}function ze(e,t,n){var r,o;if(f.unmount&&f.unmount(e),(r=e.ref)&&(r.current&&r.current!=e.__e||ve(r,null,t)),(r=e.__c)!=null){if(r.componentWillUnmount)try{r.componentWillUnmount()}catch(i){f.__e(i,t)}r.base=r.__P=null}if(r=e.__k)for(o=0;o<r.length;o++)r[o]&&ze(r[o],t,n||typeof e.type!="function");n||he(e.__e),e.__c=e.__=e.__e=void 0}function St(e,t,n){return this.constructor(e,n)}function ge(e,t,n){var r,o,i,s;t==document&&(t=document.documentElement),f.__&&f.__(e,t),o=(r=typeof n=="function")?null:n&&n.__k||t.__k,i=[],s=[],me(t,e=(!r&&n||t).__k=H(P,null,[e]),o||ee,ee,t.namespaceURI,!r&&n?[n]:o?null:t.firstChild?re.call(t.childNodes):null,i,!r&&n?n:o?o.__e:t.firstChild,r,s),Le(i,e,s)}re=te.slice,f={__e:function(e,t,n,r){for(var o,i,s;t=t.__;)if((o=t.__c)&&!o.__)try{if((i=o.constructor)&&i.getDerivedStateFromError!=null&&(o.setState(i.getDerivedStateFromError(e)),s=o.__d),o.componentDidCatch!=null&&(o.componentDidCatch(e,r||{}),s=o.__d),s)return o.__E=o}catch(l){e=l}throw e}},Me=0,gt=function(e){return e!=null&&e.constructor===void 0},M.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=R({},this.state),typeof e=="function"&&(e=e(R({},n),this.props)),e&&R(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),De(this))},M.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),De(this))},M.prototype.render=P,O=[],Re=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,Oe=function(e,t){return e.__v.__b-t.__v.__b},ne.__r=0,ce=Math.random().toString(8),Z="__d"+ce,B="__a"+ce,Ue=/(PointerCapture)$|Capture$/i,pe=0,ue=Te(!1),de=Te(!0),yt=0;var K,b,ye,$e,Y=0,Ge=[],x=f,Be=x.__b,Ve=x.__r,je=x.diffed,Ke=x.__c,Ye=x.unmount,qe=x.__;function xe(e,t){x.__h&&x.__h(b,e,Y||t),Y=0;var n=b.__H||(b.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function L(e){return Y=1,Xe(Qe,e)}function Xe(e,t,n){var r=xe(K++,2);if(r.t=e,!r.__c&&(r.__=[n?n(t):Qe(void 0,t),function(l){var c=r.__N?r.__N[0]:r.__[0],_=r.t(c,l);c!==_&&(r.__N=[_,r.__[1]],r.__c.setState({}))}],r.__c=b,!b.__f)){var o=function(l,c,_){if(!r.__c.__H)return!0;var d=r.__c.__H.__.filter(function(h){return h.__c});if(d.every(function(h){return!h.__N}))return!i||i.call(this,l,c,_);var a=r.__c.props!==l;return d.some(function(h){if(h.__N){var u=h.__[0];h.__=h.__N,h.__N=void 0,u!==h.__[0]&&(a=!0)}}),i&&i.call(this,l,c,_)||a};b.__f=!0;var i=b.shouldComponentUpdate,s=b.componentWillUpdate;b.componentWillUpdate=function(l,c,_){if(this.__e){var d=i;i=void 0,o(l,c,_),i=d}s&&s.call(this,l,c,_)},b.shouldComponentUpdate=o}return r.__N||r.__}function U(e,t){var n=xe(K++,3);!x.__s&&Ze(n.__H,t)&&(n.__=e,n.u=t,b.__H.__h.push(n))}function $(e){return Y=5,we(function(){return{current:e}},[])}function we(e,t){var n=xe(K++,7);return Ze(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function W(e,t){return Y=8,we(function(){return e},t)}function Et(){for(var e;e=Ge.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(oe),t.__h.some(be),t.__h=[]}catch(n){t.__h=[],x.__e(n,e.__v)}}}x.__b=function(e){b=null,Be&&Be(e)},x.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),qe&&qe(e,t)},x.__r=function(e){Ve&&Ve(e),K=0;var t=(b=e.__c).__H;t&&(ye===b?(t.__h=[],b.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(oe),t.__h.some(be),t.__h=[],K=0)),ye=b},x.diffed=function(e){je&&je(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Ge.push(t)!==1&&$e===x.requestAnimationFrame||(($e=x.requestAnimationFrame)||Nt)(Et)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),ye=b=null},x.__c=function(e,t){t.some(function(n){try{n.__h.some(oe),n.__h=n.__h.filter(function(r){return!r.__||be(r)})}catch(r){t.some(function(o){o.__h&&(o.__h=[])}),t=[],x.__e(r,n.__v)}}),Ke&&Ke(e,t)},x.unmount=function(e){Ye&&Ye(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(r){try{oe(r)}catch(o){t=o}}),n.__H=void 0,t&&x.__e(t,n.__v))};var Je=typeof requestAnimationFrame=="function";function Nt(e){var t,n=function(){clearTimeout(r),Je&&cancelAnimationFrame(t),setTimeout(e)},r=setTimeout(n,35);Je&&(t=requestAnimationFrame(n))}function oe(e){var t=b,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),b=t}function be(e){var t=b;e.__c=e.__(),b=t}function Ze(e,t){return!e||e.length!==t.length||t.some(function(n,r){return n!==e[r]})}function Qe(e,t){return typeof t=="function"?t(e):t}function It(e,t){for(var n in t)e[n]=t[n];return e}function et(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var r in t)if(r!=="__source"&&e[r]!==t[r])return!0;return!1}function tt(e,t){this.props=e,this.context=t}(tt.prototype=new M).isPureReactComponent=!0,tt.prototype.shouldComponentUpdate=function(e,t){return et(this.props,e)||et(this.state,t)};var nt=f.__b;f.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),nt&&nt(e)};var tn=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.forward_ref")||3911;var Tt=f.__e;f.__e=function(e,t,n,r){if(e.then){for(var o,i=t;i=i.__;)if((o=i.__c)&&o.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k),o.__c(e,t)}Tt(e,t,n,r)};var rt=f.unmount;function lt(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(r){typeof r.__c=="function"&&r.__c()}),e.__c.__H=null),(e=It({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c.__e=!0,e.__c=null),e.__k=e.__k&&e.__k.map(function(r){return lt(r,t,n)})),e}function ct(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(r){return ct(r,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function ke(){this.__u=0,this.o=null,this.__b=null}function ut(e){var t=e.__&&e.__.__c;return t&&t.__a&&t.__a(e)}function ie(){this.i=null,this.l=null}f.unmount=function(e){var t=e.__c;t&&(t.__z=!0),t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),rt&&rt(e)},(ke.prototype=new M).__c=function(e,t){var n=t.__c,r=this;r.o==null&&(r.o=[]),r.o.push(n);var o=ut(r.__v),i=!1,s=function(){i||r.__z||(i=!0,n.__R=null,o?o(c):c())};n.__R=s;var l=n.__P;n.__P=null;var c=function(){if(!--r.__u){if(r.state.__a){var _=r.state.__a;r.__v.__k[0]=ct(_,_.__c.__P,_.__c.__O)}var d;for(r.setState({__a:r.__b=null});d=r.o.pop();)d.__P=l,d.forceUpdate()}};r.__u++||32&t.__u||r.setState({__a:r.__b=r.__v.__k[0]}),e.then(s,s)},ke.prototype.componentWillUnmount=function(){this.o=[]},ke.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),r=this.__v.__k[0].__c;this.__v.__k[0]=lt(this.__b,n,r.__O=r.__P)}this.__b=null}var o=t.__a&&H(P,null,e.fallback);return o&&(o.__u&=-33),[H(P,null,t.__a?null:e.children),o]};var ot=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};(ie.prototype=new M).__a=function(e){var t=this,n=ut(t.__v),r=t.l.get(e);return r[0]++,function(o){var i=function(){t.props.revealOrder?(r.push(o),ot(t,e,r)):o()};n?n(i):i()}},ie.prototype.render=function(e){this.i=null,this.l=new Map;var t=j(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},ie.prototype.componentDidUpdate=ie.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){ot(e,n,t)})};var Mt=typeof Symbol<"u"&&Symbol.for&&Symbol.for("react.element")||60103,Rt=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,Ot=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,Ut=/[A-Z0-9]/g,At=typeof document<"u",Ft=function(e){return(typeof Symbol<"u"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};M.prototype.isReactComponent=!0,["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(M.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var it=f.event;f.event=function(e){return it&&(e=it(e)),e.persist=function(){},e.isPropagationStopped=function(){return this.cancelBubble},e.isDefaultPrevented=function(){return this.defaultPrevented},e.nativeEvent=e};var dt,Ht={configurable:!0,get:function(){return this.class}},at=f.vnode;f.vnode=function(e){typeof e.type=="string"&&(function(t){var n=t.props,r=t.type,o={},i=r.indexOf("-")==-1;for(var s in n){var l=n[s];if(!(s==="value"&&"defaultValue"in n&&l==null||At&&s==="children"&&r==="noscript"||s==="class"||s==="className")){var c=s.toLowerCase();s==="defaultValue"&&"value"in n&&n.value==null?s="value":s==="download"&&l===!0?l="":c==="translate"&&l==="no"?l=!1:c[0]==="o"&&c[1]==="n"?c==="ondoubleclick"?s="ondblclick":c!=="onchange"||r!=="input"&&r!=="textarea"||Ft(n.type)?c==="onfocus"?s="onfocusin":c==="onblur"?s="onfocusout":Ot.test(s)&&(s=c):c=s="oninput":i&&Rt.test(s)?s=s.replace(Ut,"-$&").toLowerCase():l===null&&(l=void 0),c==="oninput"&&o[s=c]&&(s="oninputCapture"),o[s]=l}}r=="select"&&(o.multiple&&Array.isArray(o.value)&&(o.value=j(n.children).forEach(function(_){_.props.selected=o.value.indexOf(_.props.value)!=-1})),o.defaultValue!=null&&(o.value=j(n.children).forEach(function(_){_.props.selected=o.multiple?o.defaultValue.indexOf(_.props.value)!=-1:o.defaultValue==_.props.value}))),n.class&&!n.className?(o.class=n.class,Object.defineProperty(o,"className",Ht)):n.className&&(o.class=o.className=n.className),t.props=o})(e),e.$$typeof=Mt,at&&at(e)};var st=f.__r;f.__r=function(e){st&&st(e),dt=e.__c};var _t=f.diffed;f.diffed=function(e){_t&&_t(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value),dt=null};var Lt=0;function p(e,t,n,r,o,i){t||(t={});var s,l,c=t;if("ref"in c)for(l in c={},t)l=="ref"?s=t[l]:c[l]=t[l];var _={type:e,props:c,key:n,ref:s,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--Lt,__i:-1,__u:0,__source:o,__self:i};if(typeof e=="function"&&(s=e.defaultProps))for(l in s)c[l]===void 0&&(c[l]=s[l]);return f.vnode&&f.vnode(_),_}var Ce=window.__DC_APP__||"https://app.discoverycall.ai",J=window.__DC_TOKEN__||"",se=window.__DC_SESSION__||"",ae=window.__DC_CONFIG__||{},ht=`dc_conv_${J}`,q=localStorage.getItem(ht)||"";function ft(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}var Wt=`
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

  .dc-panel {
    position: fixed;
    bottom: 96px;
    right: 20px;
    width: 380px;
    max-width: calc(100vw - 32px);
    height: 560px;
    max-height: calc(100vh - 120px);
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    z-index: 2147483639;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }

  .dc-panel.left {
    right: auto;
    left: 20px;
  }

  .dc-panel.hidden {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
    pointer-events: none;
  }

  .dc-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
    background: var(--dc-primary, #1783F1);
  }

  .dc-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: white;
    flex-shrink: 0;
    overflow: hidden;
  }

  .dc-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .dc-header-info { flex: 1; min-width: 0; }

  .dc-header-name {
    font-size: 15px;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dc-header-status {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dc-status-dot {
    width: 6px;
    height: 6px;
    background: #4ade80;
    border-radius: 50%;
  }

  .dc-close-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.8);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: background 0.15s;
  }

  .dc-close-btn:hover { background: rgba(255,255,255,0.15); }

  .dc-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }

  .dc-messages::-webkit-scrollbar { width: 4px; }
  .dc-messages::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }

  .dc-message {
    display: flex;
    gap: 8px;
    animation: dc-msg-in 0.2s ease;
  }

  @keyframes dc-msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dc-message.user { flex-direction: row-reverse; }

  .dc-bubble {
    max-width: 78%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .dc-message.agent .dc-bubble {
    background: #f4f4f5;
    color: #18181b;
    border-bottom-left-radius: 4px;
  }

  .dc-message.user .dc-bubble {
    background: var(--dc-primary, #1783F1);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .dc-message.system .dc-bubble {
    background: #fef9c3;
    color: #713f12;
    font-size: 13px;
    max-width: 90%;
    text-align: center;
    margin: 0 auto;
    border-radius: 10px;
  }

  .dc-typing {
    display: flex;
    gap: 4px;
    padding: 12px 14px;
    background: #f4f4f5;
    border-radius: 16px;
    border-bottom-left-radius: 4px;
    width: fit-content;
  }

  .dc-typing span {
    width: 6px;
    height: 6px;
    background: #a0a0a0;
    border-radius: 50%;
    animation: dc-bounce 1.2s ease infinite;
  }

  .dc-typing span:nth-child(2) { animation-delay: 0.2s; }
  .dc-typing span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dc-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }

  .dc-greeting {
    text-align: center;
    padding: 24px 20px 8px;
  }

  .dc-greeting-title {
    font-size: 20px;
    font-weight: 700;
    color: #18181b;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .dc-greeting-sub {
    font-size: 14px;
    color: #71717a;
    line-height: 1.5;
  }

  .dc-input-area {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-shrink: 0;
    background: #fff;
  }

  .dc-input {
    flex: 1;
    border: 1.5px solid #e4e4e7;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    min-height: 42px;
    max-height: 120px;
    outline: none;
    color: #18181b;
    background: #fafafa;
    transition: border-color 0.15s;
    line-height: 1.4;
  }

  .dc-input:focus {
    border-color: var(--dc-primary, #1783F1);
    background: #fff;
  }

  .dc-input::placeholder { color: #a1a1aa; }

  .dc-send-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--dc-primary, #1783F1);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s, transform 0.1s;
  }

  .dc-send-btn:hover { opacity: 0.88; }
  .dc-send-btn:active { transform: scale(0.93); }
  .dc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .dc-branding {
    text-align: center;
    padding: 6px;
    font-size: 11px;
    color: #a1a1aa;
  }

  .dc-branding a {
    color: #a1a1aa;
    text-decoration: none;
  }

  .dc-branding a:hover { color: #71717a; }

  /* Mobile full-screen */
  @media (max-width: 440px) {
    .dc-panel {
      bottom: 0;
      right: 0;
      left: 0;
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
`;function zt({config:e,onClose:t}){let[n,r]=L([]),[o,i]=L(""),[s,l]=L(!1),[c,_]=L(!1),d=$(null),a=$(null),h=$(q),u=$(null),y=W(()=>{d.current?.scrollIntoView({behavior:"smooth"})},[]);U(()=>{y()},[n,y]),U(()=>{setTimeout(()=>a.current?.focus(),100)},[]);let k=W(async()=>{let g=o.trim();if(!g||s)return;i(""),l(!0);let S={id:ft(),role:"user",content:g,timestamp:new Date};r(E=>[...E,S]);let D=ft(),G={id:D,role:"agent",content:"",streaming:!0,timestamp:new Date};r(E=>[...E,G]),_(!0),u.current?.abort();let A=new AbortController;u.current=A;try{let E=await fetch(`${Ce}/api/widget/chat`,{method:"POST",headers:{"Content-Type":"application/json","X-Embed-Token":J,"X-Session-Id":se,"X-Source-Page":window.location.href},body:JSON.stringify({message:g,sessionId:se}),signal:A.signal});if(!E.ok||!E.body)throw new Error(`HTTP ${E.status}`);let N=E.body.getReader(),I=new TextDecoder,_e="",le="";for(;;){let{done:mt,value:vt}=await N.read();if(mt)break;_e+=I.decode(vt,{stream:!0});let Se=_e.split(`
`);_e=Se.pop()||"";for(let Ee of Se){if(!Ee.startsWith("data: "))continue;let Ne=Ee.slice(6).trim();if(Ne)try{let T=JSON.parse(Ne);T.type==="token"&&T.content?(le+=T.content,r(F=>F.map(C=>C.id===D?{...C,content:le}:C))):T.type==="done"?(T.conversationId&&(h.current=T.conversationId,q=T.conversationId,localStorage.setItem(ht,T.conversationId)),r(F=>F.map(C=>C.id===D?{...C,streaming:!1}:C))):T.type==="error"?r(F=>F.map(C=>C.id===D?{...C,content:T.message||"I'm having trouble responding. Please try again.",streaming:!1}:C)):T.type==="unavailable"&&r(F=>F.map(C=>C.id===D?{...C,content:le||"This agent is currently unavailable.",streaming:!1,role:"system"}:C))}catch{}}}}catch(E){if(E.name==="AbortError")return;r(N=>N.map(I=>I.id===D?{...I,content:"Connection interrupted. Please try again.",streaming:!1}:I))}finally{l(!1),_(!1)}},[o,s]),w=W(g=>{g.key==="Enter"&&!g.shiftKey&&(g.preventDefault(),k())},[k]),v=W(g=>{let S=g.target;i(S.value),S.style.height="auto",S.style.height=`${Math.min(S.scrollHeight,120)}px`},[]),m=e.buttonPosition==="bottom-left";return p("div",{class:`dc-panel ${m?"left":""}`,children:[p("div",{class:"dc-header",children:[p("div",{class:"dc-avatar",children:e.avatarUrl?p("img",{src:e.avatarUrl,alt:""}):p("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"white","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:p("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})})}),p("div",{class:"dc-header-info",children:[p("div",{class:"dc-header-name",children:e.displayName}),p("div",{class:"dc-header-status",children:[p("span",{class:"dc-status-dot"}),"Online"]})]}),p("button",{class:"dc-close-btn",onClick:t,"aria-label":"Close chat",children:p("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round",children:[p("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),p("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]}),p("div",{class:"dc-messages",children:[n.length===0&&p("div",{class:"dc-greeting",children:[p("div",{class:"dc-greeting-title",children:e.greetingTitle}),e.greetingMessage&&p("div",{class:"dc-greeting-sub",children:e.greetingMessage})]}),n.map(g=>p("div",{class:`dc-message ${g.role}`,children:p("div",{class:"dc-bubble",children:[g.content||(g.streaming?"":"\u2026"),g.streaming&&!g.content&&p("div",{class:"dc-typing",children:[p("span",{}),p("span",{}),p("span",{})]})]})},g.id)),c&&n[n.length-1]?.role==="agent"&&n[n.length-1]?.streaming&&!n[n.length-1]?.content&&p("div",{class:"dc-message agent",children:p("div",{class:"dc-typing",children:[p("span",{}),p("span",{}),p("span",{})]})}),p("div",{ref:d})]}),p("div",{class:"dc-input-area",children:[p("textarea",{ref:a,class:"dc-input",placeholder:"Type a message...",value:o,onInput:v,onKeyDown:w,rows:1,disabled:s}),p("button",{class:"dc-send-btn",onClick:k,disabled:!o.trim()||s,"aria-label":"Send message",children:p("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"white","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round",children:[p("line",{x1:"22",y1:"2",x2:"11",y2:"13"}),p("polygon",{points:"22 2 15 22 11 13 2 9 22 2"})]})})]}),e.showBranding&&p("div",{class:"dc-branding",children:["Powered by ",p("a",{href:"https://discoverycall.ai",target:"_blank",rel:"noopener",children:"DiscoveryCall"})]})]})}function $t({config:e}){let[t,n]=L(!1),r=W(()=>{n(!1);let o=JSON.stringify({sessionId:se,embedToken:J,conversationId:q,reason:"close"});navigator.sendBeacon&&navigator.sendBeacon(`${Ce}/api/widget/close`,o)},[]);return U(()=>{let o=i=>{i.key==="Escape"&&t&&r()};return window.addEventListener("keydown",o),()=>window.removeEventListener("keydown",o)},[t,r]),U(()=>{let o=()=>{if(!q)return;let i=JSON.stringify({sessionId:se,embedToken:J,conversationId:q,reason:"unload"});navigator.sendBeacon?.(`${Ce}/api/widget/close`,i)};return window.addEventListener("pagehide",o),()=>window.removeEventListener("pagehide",o)},[]),U(()=>{let o=document.getElementById("dc-chat-panel");o&&(o.__toggle=()=>n(i=>!i))}),U(()=>{n(!0)},[]),p(P,{children:t&&p(zt,{config:e,onClose:r})})}function pt(){if(!ae||!J){console.warn("[DiscoveryCall] Widget config not found");return}let e=document.createElement("div");e.id="dc-chat-panel",e.setAttribute("data-dc","1"),document.body.appendChild(e);let t=e.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=Wt.replace(/var\(--dc-primary, #1783F1\)/g,`var(--dc-primary, ${ae.themeColor||"#1783F1"})`),t.appendChild(n);let r=document.createElement("div");r.style.setProperty("--dc-primary",ae.themeColor||"#1783F1"),t.appendChild(r),ge(H($t,{config:ae}),r)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",pt):pt();})();
