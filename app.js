 /******************************
 * Tiện ích & Layer dữ liệu   *
 ******************************/
const DB = {
  read:(k, d=[])=>{ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
  write:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  genId:()=>`id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
}
const nowISO = ()=> new Date().toISOString()

const state = {
  user:null,
  otpCache:null, // {phone, code, expireAt}
}

// Seed danh mục, ports, demo listings
const DEFAULT_PORTS = [
  'Cảng Hòn Rớ (Khánh Hòa)',
  'Cảng Cát Lở (Bà Rịa - Vũng Tàu)',
  'Cảng Kỳ Hà (Quảng Nam)',
  'Cảng Thọ Quang (Đà Nẵng)',
  'Cảng Gành Hào (Bạc Liêu)'
]

function seedOnce(){
  if(!localStorage.getItem('seed_v1')){
    const species=[
      {id:DB.genId(),name:'Cá ngừ đại dương'},
      {id:DB.genId(),name:'Tôm sú'},
      {id:DB.genId(),name:'Mực ống'}
    ]
    DB.write('species',species)
    DB.write('ports',DEFAULT_PORTS)

    // Tạo 1 ngư dân demo + listing mẫu
    const users=[{id:DB.genId(),phone:'0911001100',role:'fisherman'},{id:DB.genId(),phone:'0909009900',role:'buyer'}]
    DB.write('users',users)

    const boats=[{id:DB.genId(),userId:users[0].id,name:'Bình Minh 01',code:'BV-12345'}]
    DB.write('boats',boats)

    const listings=[{
      id:DB.genId(), sellerId:users[0].id, boatId:boats[0].id,
      port:'Cảng Hòn Rớ (Khánh Hòa)', eta:new Date(Date.now()+36e5*12).toISOString(),
      speciesId:species[0].id, quantity:800, price:120000,
      image:null, createdAt:nowISO()
    }]
    DB.write('listings',listings)
    DB.write('orders',[])

    localStorage.setItem('seed_v1','1')
  }
}
seedOnce()

/******************************
 * Auth: SĐT + OTP (mô phỏng) *
 ******************************/
function sendOTP(phone){
  if(!/^0\d{9,10}$/.test(phone)) throw new Error('SĐT không hợp lệ')
  // Mô phỏng gọi SMS Gateway ở đây
  const code='123456' // PROD: tạo random, lưu kèm expire 2 phút
  state.otpCache={phone,code,expireAt:Date.now()+2*60*1000}
  toast(`Đã gửi OTP tới ${maskPhone(phone)} (demo: <b>${code}</b>)`)
}
function verifyOTP(phone, code, chosenRole){
  if(!state.otpCache || state.otpCache.phone!==phone) throw new Error('Chưa gửi OTP')
  if(Date.now()>state.otpCache.expireAt) throw new Error('OTP đã hết hạn')
  if(code!==state.otpCache.code) throw new Error('OTP sai')
  // Đăng nhập / đăng ký
  const users=DB.read('users')
  let user=users.find(u=>u.phone===phone)
  if(!user){ user={id:DB.genId(),phone,role:chosenRole}; users.push(user); DB.write('users',users) }
  state.user=user
  DB.write('session',{userId:user.id})
  toast('Đăng nhập thành công')
  navigate('#/market')
  renderNav()
  renderActivePage()
}
function getCurrentUser(){
  if(state.user) return state.user
  const session=DB.read('session',null)
  if(session){ const u=DB.read('users').find(x=>x.id===session.userId); state.user=u||null }
  return state.user
}
function logout(){ DB.write('session',null); state.user=null; renderNav(); navigate('#/login') }

const maskPhone = p => p.replace(/(\d{3})\d+(\d{2})/, '$1******$2')

/*****************
 * Router đơn giản
 *****************/
const PAGES=['#/login','#/market','#/listing','#/admin/species','#/fisher/boats','#/fisher/listings','#/fisher/orders','#/orders']
function navigate(hash){ location.hash=hash }
window.addEventListener('hashchange', renderActivePage)

/*****************
 * UI helpers
 *****************/
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild }
function fmtMoney(v){ return (v||0).toLocaleString('vi-VN') }
function fmtDate(dt){ try{ return new Date(dt).toLocaleString('vi-VN') }catch{ return dt } }
function toast(msg){ const n=el(`<div style="position:fixed;bottom:20px;right:20px;background:#0a1328;border:1px solid var(--border);padding:12px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:50">${msg}</div>`); document.body.appendChild(n); setTimeout(()=>n.remove(),2500) }

/*****************
 * Navbar
 *****************/
function renderNav(){
  const nav=document.getElementById('navMenu');
  nav.innerHTML=''
  const u=getCurrentUser()
  const add=(text,hash,primary=false)=>{
    const b=el(`<button class="btn${primary?' primary':''}" data-nav="${hash}">${text}</button>`)
    b.onclick=()=>navigate(hash)
    if(location.hash===hash) b.setAttribute('aria-current','page')
    nav.appendChild(b)
  }
  add('Chợ', '#/market', true)
  if(u?.role==='admin') add('Danh mục loài', '#/admin/species')
  if(u?.role==='fisherman'){
    add('Tàu', '#/fisher/boats')
    add('Đăng bán', '#/fisher/listings')
    add('Đơn hàng', '#/fisher/orders')
  }
  if(u?.role==='buyer') add('Đơn của tôi', '#/orders')

  nav.appendChild(el('<span style="flex:1"></span>'))
  if(u){
    nav.appendChild(el(`<span class="badge">${u.role==='buyer'?'Người mua':u.role==='fisherman'?'Ngư dân':'Admin'} • ${u.phone}</span>`))
    const out=el('<button class="btn" id="btnLogout">Đăng xuất</button>'); out.onclick=logout; nav.appendChild(out)
  }else{
    add('Đăng nhập', '#/login')
  }
}

/*****************
 * Trang: Login
 *****************/
function bindLogin(){
  const phoneEl=document.getElementById('loginPhone')
  const otpEl=document.getElementById('loginOTP')
  document.getElementById('btnSendOTP').onclick=()=>{
    try{ sendOTP(phoneEl.value.trim()) }catch(e){ toast(e.message) }
  }
  document.getElementById('btnVerifyOTP').onclick=()=>{
    const role=document.querySelector('input[name="role"]:checked').value
    try{ verifyOTP(phoneEl.value.trim(), otpEl.value.trim(), role) }catch(e){ toast(e.message) }
  }
}

/*****************
 * Trang: Market
 *****************/
function renderMarket(){
  const grid=document.getElementById('marketGrid')
  const listings=DB.read('listings')
  const species=DB.read('species')
  const users=DB.read('users')

  // Filters
  const portSel=document.getElementById('filterPort')
  const spSel=document.getElementById('filterSpecies')
  // populate filter options once
  portSel.innerHTML='<option value="">Tất cả cảng</option>'
  const ports = Array.from(new Set([...(DB.read('ports')||[]), ...listings.map(l=>l.port)]))
  ports.forEach(p=> portSel.appendChild(el(`<option>${p}</option>`)))
  spSel.innerHTML='<option value="">Tất cả loài</option>'
  species.forEach(s=> spSel.appendChild(el(`<option value="${s.id}">${s.name}</option>`)))

  const applyFilter=()=>{
    const p=portSel.value; const s=spSel.value
    const filtered=listings.filter(l=> (p?l.port===p:true) && (s?l.speciesId===s:true) )
    drawCards(filtered)
  }
  document.getElementById('btnClearFilters').onclick=()=>{ portSel.value=''; spSel.value=''; applyFilter() }
  portSel.onchange=applyFilter; spSel.onchange=applyFilter

  function drawCards(rows){
    grid.innerHTML=''
    if(rows.length===0){ grid.appendChild(el('<div class="muted">Không có tin phù hợp.</div>')); return }
    rows.sort((a,b)=> new Date(a.eta)-new Date(b.eta))
    rows.forEach(l=>{
      const sp=species.find(x=>x.id===l.speciesId)?.name||'—'
      const seller=users.find(u=>u.id===l.sellerId)
      const card=el(`<div class="card">
        <div class="heading"><h2>${sp}</h2><span class="pill">ETA ${fmtDate(l.eta)}</span></div>
        ${l.image? `<img src="${l.image}" alt="${sp}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;border:1px solid var(--border);margin-bottom:10px">`:''}
        <div class="muted">Cảng: <b>${l.port}</b></div>
        <div class="muted">Sản lượng: <b>${fmtMoney(l.quantity)} kg</b> • Giá: <b>${fmtMoney(l.price)} đ/kg</b></div>
        <div class="divider"></div>
        <div class="right">
          <span class="badge">Tàu: ${getBoatName(l.boatId)}</span>
          <span class="badge">Bởi: ${seller?maskPhone(seller.phone):'—'}</span>
          <button class="btn primary" data-view="${l.id}">Xem chi tiết</button>
        </div>
      </div>`)
      card.querySelector('[data-view]')?.addEventListener('click',()=> navigate(`#/listing?id=${l.id}`))
      grid.appendChild(card)
    })
  }
  applyFilter()
}

function getBoatName(id){ return DB.read('boats').find(b=>b.id===id)?.name||'—' }

/*****************
 * Trang: Listing Detail + Đặt hàng
 *****************/
function renderListingDetail(){
  const q=new URLSearchParams(location.hash.split('?')[1]||'')
  const id=q.get('id')
  const wrap=document.getElementById('page-listing-detail')
  const l=DB.read('listings').find(x=>x.id===id)
  if(!l){ wrap.classList.add('card'); wrap.innerHTML='<div class="muted">Không tìm thấy tin.</div>'; return }
  const sp=DB.read('species').find(s=>s.id===l.speciesId)
  const seller=DB.read('users').find(u=>u.id===l.sellerId)

  wrap.innerHTML=`
    <div class="heading"><h1>${sp?.name||'—'}</h1><span class="pill">ETA ${fmtDate(l.eta)}</span></div>
    <div class="grid grid-2">
      <div>
        ${l.image? `<img src="${l.image}" alt="${sp?.name}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;border:1px solid var(--border);">`: '<div class="muted">(Không có ảnh)</div>'}
      </div>
      <div>
        <div class="field inline"><span class="tag">Cảng</span> <b>${l.port}</b></div>
        <div class="field inline"><span class="tag">Tàu</span> <b>${getBoatName(l.boatId)}</b></div>
        <div class="field inline"><span class="tag">Sản lượng</span> <b>${fmtMoney(l.quantity)} kg</b></div>
        <div class="field inline"><span class="tag">Giá</span> <b>${fmtMoney(l.price)} đ/kg</b></div>
        <div class="field inline"><span class="tag">Ngư dân</span> ${seller?maskPhone(seller.phone):'—'}</div>
        <div class="divider"></div>
        <div class="field"><label>Số lượng muốn đặt (kg)</label><input id="orderQty" type="number" min="1" placeholder="VD: 100"></div>
        <div class="toolbar">
          <button class="btn primary" id="btnPlaceOrder">Đặt hàng</button>
          <button class="btn" id="btnBackMarket">Về chợ</button>
        </div>
        <div class="help">Cần đăng nhập vai trò <b>Người mua</b> để đặt hàng.</div>
      </div>
    </div>
  `
  document.getElementById('btnBackMarket').onclick=()=>navigate('#/market')
  document.getElementById('btnPlaceOrder').onclick=()=>{
    const u=getCurrentUser()
    if(!u){ toast('Vui lòng đăng nhập'); navigate('#/login'); return }
    if(u.role!=='buyer'){ toast('Chỉ tài khoản Người mua mới được đặt hàng'); return }
    const qty=parseInt(document.getElementById('orderQty').value||'0',10)
    if(!qty || qty<=0){ toast('Nhập số lượng hợp lệ'); return }
    // Tạo order
    const orders=DB.read('orders')
    orders.push({ id:DB.genId(), listingId:l.id, buyerId=u.id, quantity:qty, status:'pending', createdAt:nowISO() })
    DB.write('orders',orders)
    toast('Đã gửi đơn hàng (pending)')
    navigate('#/orders')
  }
}

/*****************
 * Admin: Species
 *****************/
function renderSpecies(){
  const table=document.getElementById('speciesTable')
  const list=DB.read('species')
  document.getElementById('speciesCount').innerText=`${list.length} loài`
  table.innerHTML=''
  list.forEach(sp=>{
    const tr=el(`<tr>
      <td>${sp.name}</td>
      <td>
        <div class="right">
          <button class="btn" data-edit="${sp.id}">Sửa</button>
          <button class="btn danger" data-del="${sp.id}">Xoá</button>
        </div>
      </td>
    </tr>`)
    tr.querySelector('[data-edit]')?.addEventListener('click',()=>{
      document.getElementById('spName').value=sp.name
      document.getElementById('btnAddSpecies').dataset.editing=sp.id
    })
    tr.querySelector('[data-del]')?.addEventListener('click',()=>{
      const ok=confirm('Xoá loài này?'); if(!ok) return
      const remain=list.filter(x=>x.id!==sp.id); DB.write('species',remain); renderSpecies(); renderMarket();
    })
    table.appendChild(tr)
  })

  document.getElementById('btnAddSpecies').onclick=()=>{
    const name=document.getElementById('spName').value.trim()
    if(!name){ toast('Nhập tên loài'); return }
    const editing=document.getElementById('btnAddSpecies').dataset.editing
    let arr=DB.read('species')
    if(editing){ arr=arr.map(s=> s.id===editing? {...s,name}: s); delete document.getElementById('btnAddSpecies').dataset.editing; }
    else{ arr.push({id:DB.genId(),name}) }
    DB.write('species',arr); document.getElementById('spName').value=''; renderSpecies(); renderMarket();
  }
  document.getElementById('btnResetSpecies').onclick=()=>{ document.getElementById('spName').value=''; delete document.getElementById('btnAddSpecies').dataset.editing }
}

/*****************
 * Fisher: Boats
 *****************/
function renderBoats(){
  const u=getCurrentUser(); if(!u){ navigate('#/login'); return }
  const table=document.getElementById('boatsTable')
  const all=DB.read('boats')
  const mine=all.filter(b=>b.userId===u.id)
  document.getElementById('boatsCount').innerText=`${mine.length} tàu`
  table.innerHTML=''
  mine.forEach(b=>{
    const tr=el(`<tr>
      <td>${b.name}</td>
      <td>${b.code}</td>
      <td>
        <div class="right">
          <button class="btn" data-edit="${b.id}">Sửa</button>
          <button class="btn danger" data-del="${b.id}">Xoá</button>
        </div>
      </td>
    </tr>`)
    tr.querySelector('[data-edit]').onclick=()=>{
      document.getElementById('boatName').value=b.name
      document.getElementById('boatCode').value=b.code
      document.getElementById('btnAddBoat').dataset.editing=b.id
    }
    tr.querySelector('[data-del]').onclick=()=>{
      const ok=confirm('Xoá tàu này?'); if(!ok) return
      DB.write('boats',all.filter(x=>x.id!==b.id)); renderBoats(); renderListingForm()
    }
    table.appendChild(tr)
  })

  document.getElementById('btnAddBoat').onclick=()=>{
    const name=document.getElementById('boatName').value.trim()
    const code=document.getElementById('boatCode').value.trim()
    if(!name||!code){ toast('Nhập đủ tên tàu & số hiệu'); return }
    let arr=DB.read('boats')
    const editing=document.getElementById('btnAddBoat').dataset.editing
    if(editing){ arr=arr.map(x=> x.id===editing? {...x,name,code}:x); delete document.getElementById('btnAddBoat').dataset.editing }
    else{ arr.push({id:DB.genId(),userId:u.id,name,code}) }
    DB.write('boats',arr); document.getElementById('boatName').value=''; document.getElementById('boatCode').value=''; renderBoats(); renderListingForm()
  }
}

/*****************
 * Fisher: Listings
 *****************/
function renderListingForm(){
  const u=getCurrentUser(); if(!u) return
  const boatSel=document.getElementById('listingBoat')
  boatSel.innerHTML=''
  const boats=DB.read('boats').filter(b=>b.userId===u.id)
  boats.forEach(b=> boatSel.appendChild(el(`<option value="${b.id}">${b.name} (${b.code})</option>`)))

  const spSel=document.getElementById('listingSpecies')
  spSel.innerHTML=''; DB.read('species').forEach(s=> spSel.appendChild(el(`<option value="${s.id}">${s.name}</option>`)))

  const portList=document.getElementById('portList'); portList.innerHTML=''; (DB.read('ports')||DEFAULT_PORTS).forEach(p=> portList.appendChild(el(`<option value="${p}">`)))

  document.getElementById('btnCreateListing').onclick=async ()=>{
    const boatId=boatSel.value; const port=document.getElementById('listingPort').value.trim(); const eta=document.getElementById('listingETA').value
    const speciesId=spSel.value; const qty=parseInt(document.getElementById('listingQty').value||'0',10); const price=parseInt(document.getElementById('listingPrice').value||'0',10)
    if(!boatId||!port||!eta||!speciesId||qty<=0||price<=0){ toast('Nhập đầy đủ & hợp lệ'); return }
    let image=null
    const file=document.getElementById('listingImage').files[0]
    if(file){ image= await fileToDataURL(file) }
    const listings=DB.read('listings')
    listings.push({ id:DB.genId(), sellerId:u.id, boatId, port, eta:new Date(eta).toISOString(), speciesId, quantity:qty, price, image, createdAt:nowISO() })
    DB.write('listings',listings)
    // cập nhật list cảng
    const ports=Array.from(new Set([...(DB.read('ports')||[]), port])); DB.write('ports',ports)
    toast('Đã đăng tin!')
    renderYourListings(); renderMarket();
  }

  renderYourListings()
}

function fileToDataURL(file){
  return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file) })
}

function renderYourListings(){
  const u=getCurrentUser(); if(!u) return
  const tbody=document.getElementById('yourListingsTable')
  const species=DB.read('species')
  const orders=DB.read('orders')
  const all=DB.read('listings').filter(x=>x.sellerId===u.id)
  document.getElementById('yourListingsCount').innerText=`${all.length} tin`
  tbody.innerHTML=''
  all.forEach(l=>{
    const tr=el(`<tr>
      <td>${species.find(s=>s.id===l.speciesId)?.name||'—'}</td>
      <td>${l.port}</td>
      <td>${fmtDate(l.eta)}</td>
      <td>${fmtMoney(l.quantity)}</td>
      <td>${fmtMoney(l.price)}</td>
      <td>${orders.filter(o=>o.listingId===l.id).length}</td>
      <td><button class="btn danger" data-del="${l.id}">Xoá</button></td>
    </tr>`)
    tr.querySelector('[data-del]').onclick=()=>{
      const ok=confirm('Xoá tin này?'); if(!ok) return
      DB.write('listings', DB.read('listings').filter(x=>x.id!==l.id))
      DB.write('orders', DB.read('orders').filter(o=>o.listingId!==l.id))
      renderYourListings(); renderMarket(); renderSellerOrders();
    }
    tbody.appendChild(tr)
  })
}

/*****************
 * Fisher: Orders
 *****************/
function renderSellerOrders(){
  const u=getCurrentUser(); if(!u) return
  const tbody=document.getElementById('sellerOrdersTable')
  const species=DB.read('species')
  const listings=DB.read('listings').filter(l=>l.sellerId===u.id)
  const listingMap=Object.fromEntries(listings.map(l=> [l.id,l]))
  const orders=DB.read('orders').filter(o=> listingMap[o.listingId])
  document.getElementById('sellerOrdersCount').innerText=`${orders.length} đơn`
  tbody.innerHTML=''
  orders.forEach(o=>{
    const l=listingMap[o.listingId]; const spName=species.find(s=>s.id===l.speciesId)?.name
    const buyer=DB.read('users').find(u=>u.id===o.buyerId)
    const tr=el(`<tr>
      <td>${spName} • ${l.port} • ${fmtDate(l.eta)}</td>
      <td>${buyer?maskPhone(buyer.phone):'—'}</td>
      <td>${fmtMoney(o.quantity)} kg</td>
      <td><span class="pill ${o.status}">${o.status}</span></td>
      <td>
        <div class="right">
          <button class="btn success" data-ok="${o.id}">Xác nhận</button>
          <button class="btn warn" data-rej="${o.id}">Từ chối</button>
        </div>
      </td>
    </tr>`)
    tr.querySelector('[data-ok]').onclick=()=>{ changeOrderStatus(o.id,'confirmed') }
    tr.querySelector('[data-rej]').onclick=()=>{ changeOrderStatus(o.id,'rejected') }
    tbody.appendChild(tr)
  })
}
function changeOrderStatus(id, st){ const arr=DB.read('orders').map(o=> o.id===id? {...o,status:st}:o); DB.write('orders',arr); renderSellerOrders(); renderBuyerOrders() }

/*****************
 * Buyer: Orders
 *****************/
function renderBuyerOrders(){
  const u=getCurrentUser(); if(!u) return
  const tbody=document.getElementById('buyerOrdersTable')
  const orders=DB.read('orders').filter(o=>o.buyerId===u.id)
  const listingMap=Object.fromEntries(DB.read('listings').map(l=> [l.id,l]))
  const species=DB.read('species')
  document.getElementById('buyerOrdersCount').innerText=`${orders.length} đơn`
  tbody.innerHTML=''
  orders.forEach(o=>{
    const l=listingMap[o.listingId]
    const sp=species.find(s=>s.id===l.speciesId)
    const tr=el(`<tr>
      <td>${sp?.name} • ${l?.port} • ETA ${fmtDate(l?.eta)}</td>
      <td>${fmtMoney(o.quantity)} kg</td>
      <td>${fmtMoney((l?.price||0)*o.quantity)} đ</td>
      <td><span class="pill ${o.status}">${o.status}</span></td>
    </tr>`)
    tbody.appendChild(tr)
  })
}

/*****************
 * Kích hoạt trang
 *****************/
function show(id){ document.querySelectorAll('main section').forEach(s=> s.classList.add('hidden')); document.getElementById(id)?.classList.remove('hidden') }

function renderActivePage(){
  renderNav()
  const hash=location.hash||'#/market'
  const u=getCurrentUser()
  if(hash.startsWith('#/listing')){
    show('page-listing-detail'); renderListingDetail(); return
  }
  switch(hash){
    case '#/login': show('page-login'); bindLogin(); break
    case '#/admin/species':
      if(!u||u.role!=='admin'){ toast('Chỉ Admin được truy cập'); navigate('#/login'); return }
      show('page-admin-species'); renderSpecies(); break
    case '#/fisher/boats':
      if(!u||u.role!=='fisherman'){ toast('Chỉ Ngư dân được truy cập'); navigate('#/login'); return }
      show('page-fisher-boats'); renderBoats(); break
    case '#/fisher/listings':
      if(!u||u.role!=='fisherman'){ toast('Chỉ Ngư dân được truy cập'); navigate('#/login'); return }
      show('page-fisher-listings'); renderListingForm(); break
    case '#/fisher/orders':
      if(!u||u.role!=='fisherman'){ toast('Chỉ Ngư dân được truy cập'); navigate('#/login'); return }
      show('page-fisher-orders'); renderSellerOrders(); break
    case '#/orders':
      if(!u||u.role!=='buyer'){ toast('Chỉ Người mua được truy cập'); navigate('#/login'); return }
      show('page-buyer-orders'); renderBuyerOrders(); break
    case '#/market':
    default:
      show('page-market'); renderMarket(); break
  }
}

// init
renderActivePage()
