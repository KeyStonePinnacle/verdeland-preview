const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#nav');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);nav.classList.toggle('open',open)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}});
// Use small web copies for cards/thumbnails and retain full frames in the lightbox.
function photoAttributes(home, index, sizes) {
 const src=home.images[index],detail=home.photoDetails?.[index];
 if(!src)return '';
 const alt=detail?.alt||`${home.title}, photograph ${index+1}`;
 const responsive=detail?` srcset="${encodeURI(detail.thumbnail)} ${detail.thumbnailWidth}w, ${encodeURI(src)} ${detail.width}w" sizes="${sizes}"`:'';
 return `src="${src}"${responsive} alt="${alt}" width="${detail?.width||1800}" height="${detail?.height||1200}"`;
}
// Collection covers have independent crops; gallery frames and order stay intact.
function coverAttributes(home, sizes) {
 const cover=home.cover;
 return cover?photoAttributes({title:home.title,images:[cover.src],photoDetails:[cover]},0,sizes):photoAttributes(home,0,sizes);
}
const grid=document.querySelector('#home-grid');
if(grid){
 const featuredIds=grid.dataset.featured?.split(/\s+/).filter(Boolean);
 const collection=featuredIds?featuredIds.map(id=>homes.find(h=>h.id===id)).filter(h=>h?.images.length):homes;
 const imageSizes=featuredIds?'(max-width: 850px) 100vw, 33vw':'(max-width: 600px) 100vw, 50vw';
 const count=document.querySelector('#home-count');
 function render(town){const list=collection.filter(h=>town==='all'||h.town===town);grid.innerHTML=list.map(h=>`<a class="home-card${h.cover?' home-card--cover':''}" href="${h.url}"><div class="photo">${h.images.length?`<img ${coverAttributes(h,imageSizes)} loading="lazy">`:'<div class="photo-pending">Property photography pending</div>'}<span>${h.label}</span></div><div class="card-bottom"><div><h3>${h.title}</h3><p>${h.town}, New York</p></div><span class="card-arrow" aria-hidden="true">↗</span></div></a>`).join('');if(count)count.textContent=`${list.length} ${list.length===1?'home':'homes'}`}
 render('all');document.querySelectorAll('[data-town]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-town]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b)});render(b.dataset.town)}));
 }
const pg=document.querySelector('#gallery-grid');
if(pg){
 const key=document.body.dataset.home||new URLSearchParams(location.search).get('home');const h=homes.find(h=>h.id===key)||homes[0];document.title=`${h.title} — VerdeLand Home Builders`;document.querySelector('#property-name').textContent=h.title;document.querySelector('#property-town').textContent=h.town.toUpperCase()+', NEW YORK';const hero=document.querySelector('#property-hero');
 if(h.images.length){hero.src=h.images[0];hero.alt=h.photoDetails?.[0]?.alt||'Exterior of '+h.title;const detail=h.photoDetails?.[0];if(detail){hero.srcset=`${encodeURI(detail.thumbnail)} ${detail.thumbnailWidth}w, ${encodeURI(h.images[0])} ${detail.width}w`;hero.sizes='100vw';hero.width=detail.width;hero.height=detail.height;}hero.fetchPriority='high';}else{hero.removeAttribute('src');hero.hidden=true;}
 document.querySelector('#photo-count').textContent=h.images.length?h.images.length+' photographs':'Photography pending';document.querySelector('.pill').textContent=h.label;document.querySelector('#property-description').textContent=h.description;
 const note=document.querySelector('[data-photo-note]');if(note)note.textContent=h.photoNote||'';
 let shown=0,index=0;const more=document.querySelector('#more-photos'),box=document.querySelector('#lightbox'),photo=document.querySelector('#lightbox-image');
 function display(){photo.src=h.images[index];photo.alt=h.photoDetails?.[index]?.alt||`${h.title}, photograph ${index+1}`;document.querySelector('#lightbox-count').textContent=`${index+1} / ${h.images.length}`}
 function addPhotos(){const end=Math.min(shown+6,h.images.length);for(let i=shown;i<end;i++){const b=document.createElement('button');b.setAttribute('aria-label',`View ${h.photoDetails?.[i]?.alt||'photograph '+(i+1)+' of '+h.title}`);b.innerHTML=`<img ${photoAttributes(h,i,'(max-width: 760px) 50vw, 400px')} loading="lazy"><span aria-hidden="true">＋</span>`;b.addEventListener('click',()=>{index=i;display();box.showModal()});pg.append(b)}shown=end;more.hidden=shown===h.images.length}
 addPhotos();more.addEventListener('click',addPhotos);box.querySelector('.close').addEventListener('click',()=>box.close());function move(n){if(!h.images.length)return;index=(index+n+h.images.length)%h.images.length;display()}document.querySelector('#prev-photo').addEventListener('click',()=>move(-1));document.querySelector('#next-photo').addEventListener('click',()=>move(1));box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key==='ArrowRight'){e.preventDefault();move(1)}});
}
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
