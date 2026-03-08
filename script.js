// ==========================================
// 1. SUPABASE INTEGRATSIYASI
// ==========================================
// SHU YERGA O'ZINGIZNING SUPABASE KALITLARINGIZNI QO'YING
const supabaseUrl = 'https://zazmjpbblmhxtuvsxpkv.supabase.co';
const supabaseKey = 'sb_publishable_NHR_h-RGmqChWD8g7kyR5g_Vh_e5L5d';

// O'zgaruvchi nomi 'supabaseClient' ga o'zgartirildi:
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// MATRIX EFFEKTI (Oldingidek)
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン';
const fontSize = 16; const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);
setInterval(() => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < drops.length; i++) {
        ctx.fillText(alphabet.charAt(Math.floor(Math.random() * alphabet.length)), i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    }
}, 30);

// ==========================================
// 3. XAVFSIZLIK VA LOGIN TIZIMI (Yangilangan)
// ==========================================
const ADMIN_PASSWORD = "hakker777"; 

// Sayt yangilanganda xotirani tekshirish
window.onload = () => {
    if (localStorage.getItem('radar_admin_auth') === 'true') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initSystem();
    }
};

function handleLogin(e) { if (e.key === 'Enter') checkPassword(); }

function checkPassword() {
    const input = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');
    
    if (input === ADMIN_PASSWORD) {
        localStorage.setItem('radar_admin_auth', 'true'); // Parolni xotiraga yozish
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initSystem(); 
    } else {
        errorMsg.innerText = "XATOLIK: PAROL NOTO'G'RI!";
        setTimeout(() => { errorMsg.innerText = ""; }, 2000);
    }
}

function logout() {
    localStorage.removeItem('radar_admin_auth'); // Xotiradan tozalash
    location.reload();
}

// TAB MENU LOGIKASI (Sahifalar o'rtasida o'tish)
function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    element.classList.add('active');
    
    if(tabId === 'tab-map' && map) {
        setTimeout(() => map.invalidateSize(), 100); // Xaritani to'g'ri chizish
    }
    if(tabId === 'tab-chat') document.getElementById('chatBadge').innerText = '0';
    if(tabId === 'tab-msg') document.getElementById('msgBadge').innerText = '0';
}

// XARITA VA BAZA INITALIZATSIYASI
let map; let markers = L.layerGroup();
async function initSystem() {
    initMap();
    fetchVisitors();
    fetchChats();
    fetchMessages();
    subscribeRealtime();
}

function initMap() {
    // 3 XIL XARITA LAYERLARI (Dark, Satellite, Hybrid)
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    const hybridMap = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'] });

    map = L.map('map', { layers: [darkMap] }).setView([41.3, 69.2], 3);
    
    // O'ng tepada xarita turini tanlash tugmasi
    const baseMaps = {
        "MATRIX DARK": darkMap,
        "SATELLITE (Real)": satelliteMap,
        "HYBRID (Ko'cha)": hybridMap
    };
    L.control.layers(baseMaps).addTo(map);
    markers.addTo(map);
}

// 1. QORA QUTI LOGLARI
async function fetchVisitors() {
    const { data } = await supabaseClient.from('visitors').select('*').order('created_at', { ascending: false });
    if(data) data.forEach(log => { addLogToTable(log); plotOnRadar(log); });
}

function addLogToTable(log) {
    const tbody = document.getElementById('logsBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="color:#aaa;">${new Date(log.created_at).toLocaleTimeString()}</td>
        <td style="color:#ff003c;">${log.ip || 'Yashirin'}</td>
        <td>${log.device || 'Noma\'lum'}</td>
        <td><button class="track-btn" onclick="focusDevice(${log.lat}, ${log.lon}, '${log.ip}')">KUZATISH 🎯</button></td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
}

function plotOnRadar(log) {
    if (!log.lat || !log.lon) return;
    const icon = L.divIcon({ className: 'radar-marker', html: `<div style="width:15px; height:15px; background:red; border-radius:50%; box-shadow:0 0 10px red; animation: pulse 1s infinite;"></div>` });
    L.marker([log.lat, log.lon], { icon: icon }).addTo(markers).bindPopup(`<b style="color:red">${log.ip}</b><br>${log.device}`);
}

// QURILMAGA ZOOM QILISH (Jadvaldan bosilganda)
window.focusDevice = function(lat, lon, ip) {
    switchTab('tab-map', document.querySelector('.nav-menu li:nth-child(1)'));
    map.flyTo([lat, lon], 16, { animate: true, duration: 2 });
}

// 2. CHAT KUZATUV
async function fetchChats() {
    const { data } = await supabaseClient.from('chat_logs').select('*').order('created_at', { ascending: true });
    if(data) data.forEach(addChatToUI);
}

function addChatToUI(chat) {
    const container = document.getElementById('chatContainer');
    let group = document.getElementById('chat-group-' + chat.ip);
    
    // Agar bu IP uchun guruh bo'lmasa, yangi yaratamiz
    if (!group) {
        group = document.createElement('div');
        group.className = 'chat-group';
        group.id = 'chat-group-' + chat.ip;
        group.innerHTML = `<div class="chat-ip">Intercepted IP: ${chat.ip}</div><div class="chat-messages"></div>`;
        container.insertBefore(group, container.firstChild);
    }
    
    const msgBox = group.querySelector('.chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${chat.sender === 'user' ? 'user-txt' : 'ai-txt'}`;
    bubble.innerText = chat.message;
    msgBox.appendChild(bubble);
}

// 3. XABARLAR (Murojaatlar)
async function fetchMessages() {
    const { data } = await supabaseClient.from('contact_messages').select('*').order('created_at', { ascending: false });
    if(data) data.forEach(addMessageToUI);
}

function addMessageToUI(msg) {
    const container = document.getElementById('msgContainer');
    const card = document.createElement('div');
    card.className = 'msg-card';
    card.innerHTML = `
        <div class="msg-title">Mavzu: ${msg.subject}</div>
        <div class="msg-sender">Kimdan: ${msg.name} (${msg.email}) | Vaqt: ${new Date(msg.created_at).toLocaleTimeString()}</div>
        <div class="msg-body">${msg.message}</div>
    `;
    card.onclick = () => card.classList.toggle('open');
    container.insertBefore(card, container.firstChild);
}

// SUPABASE REALTIME (JONLI KUZATUV BARCHA JADVALLAR UCHUN)
function subscribeRealtime() {
    supabaseClient.channel('custom-all-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, payload => {
            addLogToTable(payload.new); plotOnRadar(payload.new);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_logs' }, payload => {
            addChatToUI(payload.new);
            let badge = document.getElementById('chatBadge'); badge.innerText = parseInt(badge.innerText) + 1;
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, payload => {
            addMessageToUI(payload.new);
            let badge = document.getElementById('msgBadge'); badge.innerText = parseInt(badge.innerText) + 1;
        })
        .subscribe();
}
