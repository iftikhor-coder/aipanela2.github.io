// ==========================================
// 1. SUPABASE INTEGRATSIYASI
// ==========================================
// SHU YERGA O'ZINGIZNING SUPABASE KALITLARINGIZNI QO'YING
const supabaseUrl = 'https://zazmjpbblmhxtuvsxpkv.supabase.co';
const supabaseKey = 'sb_publishable_NHR_h-RGmqChWD8g7kyR5g_Vh_e5L5d';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. MATRIX ORQA FON ANIMATSIYASI
// ==========================================
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン';
const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nums = '0123456789';
const alphabet = katakana + latin + nums;

const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    }
}
setInterval(drawMatrix, 30);

// ==========================================
// 3. XAVFSIZLIK VA LOGIN TIZIMI
// ==========================================
const ADMIN_PASSWORD = "hakker777"; // Buni xohlagan parolingizga o'zgartiring

function handleLogin(e) { if (e.key === 'Enter') checkPassword(); }

function checkPassword() {
    const input = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');
    
    if (input === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initSystem(); // Login o'tgach xarita va bazani ishga tushiramiz
    } else {
        errorMsg.innerText = "XATOLIK: PAROL NOTO'G'RI!";
        setTimeout(() => { errorMsg.innerText = ""; }, 2000);
    }
}

function logout() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
}

// ==========================================
// 4. RADAR XARITA VA JONLI LOGLAR (INIT)
// ==========================================
let map;
let markers = L.layerGroup(); // Nishonlar guruhi

async function initSystem() {
    // 1. Leaflet Qora Xaritani o'rnatish
    if (!map) {
        map = L.map('map').setView([41.2995, 69.2401], 4); // Dastlabki markaz (Toshkent/Osiyo)
        // Qop-qora (Dark Matter) xarita plitkalari
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: 'Radar System v2.0',
            maxZoom: 19
        }).addTo(map);
        markers.addTo(map);
    }

    // 2. Supabase'dan eski loglarni yuklab olish
    fetchInitialData();

    // 3. Supabase Realtime (Jonli kuzatuvni yoqish)
    subscribeToRealtime();
}

async function fetchInitialData() {
    const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Oxirgi 50 ta log

    if (error) {
        console.error("Bazadan yuklashda xato:", error);
        return;
    }
    
    document.getElementById('liveCount').innerText = data.length;
    data.forEach(log => {
        addLogToTable(log);
        plotOnRadar(log);
    });
}

function subscribeToRealtime() {
    supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, payload => {
            console.log('JONLI NISHON ANIQLANDI!', payload.new);
            
            // Statistikani yangilash
            const countEl = document.getElementById('liveCount');
            countEl.innerText = parseInt(countEl.innerText) + 1;

            // Xarita va Jadvalga qo'shish
            addLogToTable(payload.new);
            plotOnRadar(payload.new);
        })
        .subscribe();
}

// ==========================================
// YORDAMCHI FUNKSIYALAR
// ==========================================
function addLogToTable(log) {
    const tbody = document.getElementById('logsBody');
    const time = new Date(log.created_at).toLocaleTimeString();
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="color:#aaa;">${time}</td>
        <td style="color:#00cfff;">${log.ip || 'Yashirin'}</td>
        <td style="color:#fff;">${log.device || 'Noma\'lum Qurilma'}</td>
        <td style="color:#ff003c;">${log.city || 'Kenglik: '+log.lat.toFixed(2)}</td>
    `;
    // Yangi log eng tepaga tushishi uchun:
    tbody.insertBefore(row, tbody.firstChild); 
}

function plotOnRadar(log) {
    if (!log.lat || !log.lon) return; // Koordinata bo'lmasa xaritaga qo'yilmaydi

    // Qizil, yonib turadigan nishon efekti
    const radarIcon = L.divIcon({
        className: 'radar-marker',
        html: `<div style="width:15px; height:15px; background:red; border-radius:50%; box-shadow:0 0 10px red; animation: pulse 1s infinite;"></div>`,
        iconSize: [15, 15]
    });

    L.marker([log.lat, log.lon], { icon: radarIcon })
        .addTo(markers)
        .bindPopup(`
            <b style="color:red">NISHON: ${log.ip}</b><br>
            Qurilma: ${log.device}<br>
            Shahar: ${log.city}
        `);
    
    // Yangi nishon chiqqanda xarita markazini o'shanga buramiz
    map.flyTo([log.lat, log.lon], 10, { animate: true, duration: 2 });
}
