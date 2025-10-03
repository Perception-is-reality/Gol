/* =========================
   GLOBAL VE BAŞLANGIÇ
   ========================= */

const mainContent = document.getElementById('main-content');
let currentContent = '';
let displayEl = null; // hesap makinesi ekran referansı
let currentSearchQuery = ''; // Aramayı modüle taşımak için

// Başlangıçta çalıştırılacak fonksiyon
function initApp(){
    loadSettingsFromStorage();
    attachEventListeners(); // Tüm onclick/onload işlevleri buraya taşındı.
    loadContent('home');
}

function attachEventListeners(){
    // Header ve Navigasyon
    document.getElementById('menuBtn').addEventListener('click', toggleMenu);
    document.getElementById('overlay').addEventListener('click', toggleMenu);
    document.getElementById('logoHomeLink').addEventListener('click', () => loadContent('home'));
    
    // Arama: Enter tuşu
    const searchInput = document.getElementById('searchInput');
    if(searchInput){
        searchInput.addEventListener('keypress', (e)=>{
            if(e.key === 'Enter') handleSearch(searchInput.value.trim());
        });
    }

    // ESC ile menüyü kapat
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') { closeMenuIfOpen(); } });

    // Navigasyon Linkleri (data-content kullananlar)
    // Footer ve Nav'daki tekrarlı tanımlamalar temizlendi, sadece data-content odaklı listener kaldı.
    document.querySelectorAll('nav a[data-content], footer a[data-content]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadContent(link.dataset.content);
            closeMenuIfOpen();
        });
    });

    // Footer/Diğer statik linkler
    document.getElementById("petitionLink")?.addEventListener("click", (e) => { e.preventDefault(); alert('Dilekçe modülü yakında'); closeMenuIfOpen(); });
    document.getElementById("helpLink")?.addEventListener("click", (e) => { e.preventDefault(); openModal('Yardım', 'Yardım sayfası yakında hizmete girecektir.'); closeMenuIfOpen(); });
    // openModal çağrılarının atanması footer HTML'inde inline olarak bırakıldı.
}

function openModal(title, message){
    // Basit bir modal/alert uygulaması (gerçek bir modal olmadığı için alert kullanıldı)
    alert(`${title}:\n${message}`);
}
                
function toggleMenu(){
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');
    menu.classList.toggle('show');
    overlay.classList.toggle('show');
}

function closeMenuIfOpen(){
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');
    if(menu.classList.contains('show')) { menu.classList.remove('show'); overlay.classList.remove('show'); }
}

/* =========================
   ARAMA İŞLEYİCİ (Güncellendi: Sorgu Taşımalı)
   ========================= */
function handleSearch(query){
    if(!query) return;
    const q = query.toLowerCase();
    currentSearchQuery = query; // Sorguyu sakla

    if(q.includes('hesap') || q.includes('calculator') || q.includes('calc')) loadContent('calculator');
    else if(q.includes('not') || q.includes('notes')) loadContent('notes');
    else if(q.includes('ayar') || q.includes('settings')) loadContent('settings');
    else if(q.includes('masal') || q.includes('story') || q.includes('taslak')) loadContent('masal');
    else if(q.includes('araç') || q.includes('tools') || q.includes('arac')) loadContent('tools');
    else alert(`"${query}" için bir sonuç bulunamadı. Deneyin: hesap, notlar, ayarlar, masal, araçlar`);
    
    document.getElementById('searchInput').value = '';
}

/* =========================
   SAYFA YAPILARI & ROUTING
   ========================= */

function loadContent(name){
    // Tekrarlı yüklemeyi engelleyen koşul kaldırıldı. Her zaman yeniden yükle.
    currentContent = name;
    mainContent.innerHTML = ''; // temizle

    if(name === 'home'){
        mainContent.innerHTML = getHomeHTML();
        return;
    }

    if(name === 'tools'){
        mainContent.innerHTML = getToolsHTML();
        attachToolCardListeners();
        return;
    }

    if(name === 'settings'){
        mainContent.innerHTML = getSettingsHTML();
        attachSettingsListeners();
        return;
    }

    if(name === 'notes'){
        mainContent.innerHTML = getNotesHTML();
        attachNotesListeners();
        
        // Arama sorgusunu notlara taşı
        const noteSearchEl = document.getElementById('noteSearch');
        if(currentSearchQuery && noteSearchEl){
            noteSearchEl.value = currentSearchQuery;
            currentSearchQuery = ''; // Sorguyu tüket
        }
        renderNotes(); // Notları yükle ve arama yaptıysa filtrele
        return;
    }

    if(name === 'calculator'){
        mainContent.innerHTML = '<div class="calculator-wrapper card">' + getCalculatorHTML() + '</div>'; // Calculator'ı .card içine almak için wrapper değiştirildi
        // initialize after DOM placed
        setTimeout(()=> initializeCalculator(), 50);
        return;
    }

    if(name === 'masal'){
        mainContent.innerHTML = getMasalHTML();
        attachMasalListeners();
        return;
    }

    // fallback
    mainContent.innerHTML = '<div style="max-width:900px;margin:0 auto;">Sayfa bulunamadı.</div>';
}

/* ---------- HTML Bölümleri ---------- */

function getHomeHTML(){
    return `
    <div class="home-announcements card">
        <h2>📢 Duyurular & Güncellemeler</h2>
        <div class="announcements-grid">
            <div class="announcement-card card">
                <h3>🚀 Yeni Özellik</h3>
                <p>Bilimsel Hesap Makinesi güncellendi. Artık Ohm Kanunu ve birim dönüştürücü de mevcut.</p>
                <span class="date">01.10.2025</span>
            </div>

            <div class="announcement-card card">
                <h3>🗣️ Sesli Okuma Eklendi</h3>
                <p>Masal üretici modülüne, ürettiğiniz masalları sesli okuma (TTS) özelliği eklendi.</p>
                <span class="date">01.10.2025</span>
            </div>

            <div class="announcement-card card">
                <h3>📝 Notlarım Güncelleme</h3>
                <p>Artık notlarınızı kaydedebilir, arayabilir ve düzenleyebilirsiniz. Performans iyileştirmeleri yapıldı.</p>
                <span class="date">26.09.2025</span>
            </div>
        </div>
    </div>
    `;
}

function getToolsHTML(){
    return `
    <div class="tools-container card">
        <div class="tool-card card" data-tool="calculator">🔢<br><strong>Hesap Makinesi</strong></div>
        <div class="tool-card card" data-tool="masal">✍️<br><strong>Metin Taslağı</strong></div>
        <div class="tool-card card" data-tool="notes">📝<br><strong>Notlarım</strong></div>
        <div class="tool-card card" data-tool="settings">⚙️<br><strong>Ayarlar</strong></div>
        <div class="tool-card card" data-tool="petition">📄<br><strong>Dilekçe Yaz</strong></div>
    </div>
    `;
}

function attachToolCardListeners(){
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.dataset.tool;
            if(tool === 'petition') alert('Dilekçe modülü yakında');
            else loadContent(tool);
        });
    });
}

function getSettingsHTML(){
    const savedLang = localStorage.getItem('language') || 'tr';
    const savedFont = localStorage.getItem('fontSize') || 'normal';
    const dark = localStorage.getItem('darkMode') === 'true';
    return `
    <div class="settings-container card">
        <h3>Ayarlar</h3>

        <div class="settings-item">
            <label>Karanlık Mod</label>
            <button id="toggleDarkModeBtn">${dark ? 'Karanlık Modu Kapat' : 'Karanlık Moda Geç'}</button>
        </div>

        <div class="settings-item">
            <label>Dil</label>
            <select id="languageSelect">
                <option value="tr" ${savedLang==='tr'?'selected':''}>Türkçe</option>
                <option value="en" ${savedLang==='en'?'selected':''}>English</option>
            </select>
        </div>

        <div class="settings-item">
            <label>Yazı Boyutu</label>
            <select id="fontSizeSelect">
                <option value="small" ${savedFont==='small'?'selected':''}>Küçük</option>
                <option value="normal" ${savedFont==='normal'?'selected':''}>Normal</option>
                <option value="large" ${savedFont==='large'?'selected':''}>Büyük</option>
            </select>
        </div>
    </div>
    `;
}

function attachSettingsListeners(){
    document.getElementById('toggleDarkModeBtn')?.addEventListener('click', toggleDarkMode);
    document.getElementById('languageSelect')?.addEventListener('change', (e) => changeLanguage(e.target.value));
    document.getElementById('fontSizeSelect')?.addEventListener('change', (e) => changeFontSize(e.target.value));
}

function getNotesHTML(){
    return `
    <div class="notes-container card">
        <h3>📝 Notlarım</h3>
        <input id="noteTitle" class="note-input" placeholder="Not başlığı (opsiyonel)">
        <textarea id="noteContent" class="note-input" placeholder="Not içeriğini yaz..." rows="5"></textarea>
        <div style="display:flex; gap:10px; align-items:center;">
            <button class="note-btn" id="addNoteBtn">Ekle</button>
            <input id="noteSearch" class="note-input" placeholder="Notlarda ara..." style="flex:1;">
        </div>
        <div id="noteList" class="note-list"></div>
    </div>
    `;
}

function attachNotesListeners(){
    document.getElementById('addNoteBtn')?.addEventListener('click', addNote);
    document.getElementById('noteSearch')?.addEventListener('input', renderNotes);
}

/* ---------- Masal (Story) (Güncellendi)---------- */
function getMasalHTML(){
    return `
    <div class="masal-container card">
        <h3>✨ Metin Taslağı Oluşturucu</h3>
        <p style="font-size:0.9em; color:var(--muted);">Basit hikaye taslakları oluşturur ve sesli okuma özelliğini kullanır.</p>
        <div class="form-row" style="margin-bottom:10px;">
            <input id="masalKahraman" class="masal-input" placeholder="Kahraman (örn: Minik Ayı)">
            <input id="masalYer" class="masal-input" placeholder="Yer (örn: Orman)">
        </div>
        <div class="form-row" style="margin-bottom:10px;">
            <input id="masalKonu" class="masal-input" placeholder="Konu (örn: Dostluk)">
            <input id="masalDuygu" class="masal-input" placeholder="Duygu (örn: Neşeli)">
        </div>
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px; flex-wrap:wrap;">
            <select id="masalYas" class="masal-input" style="width:140px;">
                <option value="2-3">2-3 Yaş</option>
                <option value="3-4">3-4 Yaş</option>
                <option value="5-6">5-6 Yaş</option>
                <option value="okul-oncesi" selected>Okul Öncesi</option>
            </select>
            <button class="masal-btn" id="masalUretBtn" style="background:#ff69b4;">📝 Taslak Oluştur</button>
            <button id="okuMasalBtn" style="background:#2563EB; color:white; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">🗣️ Oku</button>
            <div id="masalSpinner" class="spinner"></div>
        </div>
        <div id="masalSonuc" class="masal-result">Oluşturulan taslak burada belirecek...</div>
        <div style="margin-top:12px;">
            <button id="saveMasalToNotesBtn">Masalı Notlarıma Kaydet</button>
        </div>
    </div>
    `;
}

function attachMasalListeners(){
    document.getElementById('masalUretBtn')?.addEventListener('click', uretMasal);
    document.getElementById('okuMasalBtn')?.addEventListener('click', okuMasal);
    document.getElementById('saveMasalToNotesBtn')?.addEventListener('click', saveMasalToNotes);
}

/* ---------- Calculator HTML ---------- */
function getCalculatorHTML(){
    // Tüm Hesap Makinesi HTML'i olduğu gibi bırakıldı.
    return `
    <div class="calc-container">
        <button class="close-btn" id="calcCloseBtn">X</button>
        <h2>Bilimsel Hesap Makinesi</h2>
        <input id="display" class="display" placeholder="0" readonly>
        <div class="buttons">
            <button class="clear-btn" data-calc-action="clear">C</button>
            <button class="operator" data-calc-value="(">(</button>
            <button class="operator" data-calc-value=")">)</button>
            <button class="operator" data-calc-action="percent">%</button>
            <button class="operator" data-calc-value="sqrt(")>√</button>
            <button class="operator" data-calc-value="/">/</button>

            <button data-calc-value="7">7</button>
            <button data-calc-value="8">8</button>
            <button data-calc-value="9">9</button>
            <button class="operator" data-calc-value="*">*</button>
            <button class="scientific" data-calc-value="^">x^y</button>
            <button class="scientific" data-calc-value="!">n!</button>

            <button data-calc-value="4">4</button>
            <button data-calc-value="5">5</button>
            <button data-calc-value="6">6</button>
            <button class="operator" data-calc-value="-">-</button>
            <button class="scientific" data-calc-value="sin(">sin</button>
            <button class="scientific" data-calc-value="cos(">cos</button>

            <button data-calc-value="1">1</button>
            <button data-calc-value="2">2</button>
            <button data-calc-value="3">3</button>
            <button class="operator" data-calc-value="+">+</button>
            <button class="scientific" data-calc-value="tan(">tan</button>
            <button class="scientific" data-calc-value="log10(">log</button>

            <button data-calc-value="0">0</button>
            <button data-calc-value=".">.</button>
            <button class="scientific" data-calc-value="PI">π</button>
            <button class="scientific" data-calc-value="E">e</button>
            <button class="operator" data-calc-action="evaluate" style="grid-column:span 2;">=</button>
            </div>

        <hr style="border-color:#555; margin:14px 0;">

        <h3 style="color:#fff; margin:0 0 8px 0;">Ohm Kanunu</h3>
        <select id="calculateFor" style="margin-bottom:8px;">
            <option value="V">Gerilim (V)</option>
            <option value="I">Akım (I)</option>
            <option value="R">Direnç (R)</option>
        </select>
        <div class="row ohm-inputs">
            <input type="number" id="value1" placeholder="Birinci değer">
            <input type="number" id="value2" placeholder="İkinci değer">
            <button id="calculateOhmBtn">Hesapla</button>
        </div>
        <div id="result" class="result"></div>

        <hr style="border-color:#555; margin:14px 0;">

        <h3 style="color:#fff; margin:0 0 8px 0;">Formüller</h3>
        <select id="formulaSelect">
            <option value="">Formül Seç</option>
            <option value="areaSquare">Kare Alanı a²</option>
            <option value="areaRectangle">Dikdörtgen a*b</option>
            <option value="areaCircle">Daire π r²</option>
            <option value="volumeCube">Küp a³</option>
            <option value="volumeCylinder">Silindir π r² h</option>
            <option value="kineticEnergy">Kinetik Enerji 0.5 m v²</option>
            <option value="potentialEnergy">Potansiyel Enerji m g h</option>
        </select>
        <div id="formulaInputs" style="margin-top:8px;"></div>
        <button id="calculateFormulaBtn" style="margin-top:8px;">Hesapla</button>
        <div id="formulaResult" class="result"></div>

        <hr style="border-color:#555; margin:14px 0;">

        <h3 style="color:#fff; margin:0 0 8px 0;">Birim Dönüştürücü</h3>
        <select id="unitType">
            <option value="">Birim Tipi</option>
            <option value="length">Uzunluk</option>
            <option value="weight">Ağırlık</option>
            <option value="temperature">Sıcaklık</option>
            <option value="volume">Hacim</option>
        </select>
        <div class="row" style="margin-top:8px;">
            <input type="number" id="unitValue" placeholder="Değer Girin">
            <select id="unitFrom"></select>
            <select id="unitTo"></select>
            <button id="convertUnitBtn">Dönüştür</button>
        </div>
        <div id="unitResult" class="result"></div>
    </div>
    `;
}

/* =========================
   HESAP MAKİNESİ FONKSİYONLARI (Event Listener'lara adapte edildi)
   ========================= */

function initializeCalculator(){
    displayEl = document.getElementById('display');
    updateUnits();
    
    // Calculator event listeners
    document.getElementById('calcCloseBtn')?.addEventListener('click', () => loadContent('home'));
    
    // Sayı/Operatör Ekleme
    document.querySelectorAll('.calc-container button[data-calc-value]').forEach(btn => {
        btn.addEventListener('click', () => appendCalc(btn.dataset.calcValue));
    });
    
    // Aksiyon Butonları
    document.querySelectorAll('.calc-container button[data-calc-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.calcAction;
            if (action === 'clear') clearCalc();
            else if (action === 'percent') calculatePercentage();
            else if (action === 'evaluate') evaluateCalc();
        });
    });

    // Ohm, Formül, Birim
    document.getElementById('calculateOhmBtn')?.addEventListener('click', calculateOhm);
    document.getElementById('formulaSelect')?.addEventListener('change', selectFormula);
    document.getElementById('calculateFormulaBtn')?.addEventListener('click', calculateFormula);
    document.getElementById('unitType')?.addEventListener('change', updateUnits);
    document.getElementById('convertUnitBtn')?.addEventListener('click', convertUnit);
}


function appendCalc(val){
    if(!displayEl) return;
    if(displayEl.value.length > 500) return;
    displayEl.value += val;
}

function clearCalc(){
    if(!displayEl) return;
    displayEl.value = '';
}

function evaluateCalc(){
    try{
        if(!displayEl) return;
        let expr = displayEl.value;
        expr = expr.replace(/\bln\(/g, 'log(');
        expr = expr.replace(/(\([^()]+\)|\d+)!/g, 'factorial($1)');
        expr = expr.replace(/%/g, '/100');
        const res = math.evaluate(expr);
        displayEl.value = (typeof res === 'number' || typeof res === 'string') ? res.toString() : JSON.stringify(res);
    }catch(err){
        displayEl.value = 'Hata';
    }
}

function calculatePercentage(){
    try{
        if(!displayEl) return;
        let expr = displayEl.value.replace(/%/g, '/100');
        expr = expr.replace(/(\([^()]+\)|\d+)!/g, 'factorial($1)');
        displayEl.value = math.evaluate(expr);
    }catch(e){
        displayEl.value = 'Hata';
    }
}

/* Ohm, Formüler, Unit converter - Değişmeden bırakıldı */

const units = {
    length:{ m:1, cm:0.01, km:1000, inch:0.0254, mile:1609.34 },
    weight:{ kg:1, g:0.001, lb:0.453592, ton:1000 },
    volume:{ L:1, mL:0.001, m3:1000, gallon:3.78541 }
};

function calculateOhm(){
    const calcFor = document.getElementById('calculateFor').value;
    const v1 = parseFloat(document.getElementById('value1').value);
    const v2 = parseFloat(document.getElementById('value2').value);
    const resEl = document.getElementById('result');
    if(isNaN(v1) || isNaN(v2)){ resEl.innerText = 'Lütfen geçerli değer girin!'; return; }
    let r;
    switch(calcFor){
        case 'V': r = v1 * v2; resEl.innerText = `Gerilim V = ${r.toFixed(4)} V`; break;
        case 'I': if(v2===0){ resEl.innerText='Direnç 0 olamaz!'; return;} r = v1 / v2; resEl.innerText = `Akım I = ${r.toFixed(4)} A`; break;
        case 'R': if(v2===0){ resEl.innerText='Akım 0 olamaz!'; return;} r = v1 / v2; resEl.innerText = `Direnç R = ${r.toFixed(4)} Ω`; break;
    }
}

function selectFormula(){
    const f = document.getElementById('formulaSelect').value;
    const container = document.getElementById('formulaInputs');
    container.innerHTML = '';
    switch(f){
        case 'areaSquare': container.innerHTML = '<input id="a" type="number" placeholder="Kenar a">'; break;
        case 'areaRectangle': container.innerHTML = '<input id="a" type="number" placeholder="Kenar a"><input id="b" type="number" placeholder="Kenar b">'; break;
        case 'areaCircle': container.innerHTML = '<input id="r" type="number" placeholder="Yarıçap r">'; break;
        case 'volumeCube': container.innerHTML = '<input id="a" type="number" placeholder="Kenar a">'; break;
        case 'volumeCylinder': container.innerHTML = '<input id="r" type="number" placeholder="Yarıçap r"><input id="h" type="number" placeholder="Yükseklik h">'; break;
        case 'kineticEnergy': container.innerHTML = '<input id="m" type="number" placeholder="Kütle m (kg)"><input id="v" type="number" placeholder="Hız v (m/s)">'; break;
        case 'potentialEnergy': container.innerHTML = '<input id="m" type="number" placeholder="Kütle m (kg)"><input id="h" type="number" placeholder="Yükseklik h (m)">'; break;
    }
}

function calculateFormula(){
    const f = document.getElementById('formulaSelect').value;
    const out = document.getElementById('formulaResult');
    const val = id => parseFloat(document.getElementById(id)?.value);
    let res;
    switch(f){
        case 'areaSquare': res = Math.pow(val('a'),2); break;
        case 'areaRectangle': res = val('a') * val('b'); break;
        case 'areaCircle': res = Math.PI * Math.pow(val('r'),2); break;
        case 'volumeCube': res = Math.pow(val('a'),3); break;
        case 'volumeCylinder': res = Math.PI * Math.pow(val('r'),2) * val('h'); break;
        case 'kineticEnergy': res = 0.5 * val('m') * Math.pow(val('v'),2); break;
        case 'potentialEnergy': res = val('m') * 9.81 * val('h'); break;
        default: out.innerText = 'Lütfen bir formül seçin.'; return;
    }
    if(isNaN(res)) out.innerText = 'Lütfen tüm değerleri girin.'; else out.innerText = 'Sonuç: ' + res.toFixed(4);
}

function updateUnits(){
    const type = document.getElementById('unitType').value;
    const from = document.getElementById('unitFrom');
    const to = document.getElementById('unitTo');
    if(!from || !to) return;
    from.innerHTML = ''; to.innerHTML = '';
    if(type === 'temperature'){
        ['C','F','K'].forEach(u => { from.innerHTML += `<option value="${u}">${u}</option>`; to.innerHTML += `<option value="${u}">${u}</option>`; });
        return;
    }
    if(units[type]){
        Object.keys(units[type]).forEach(u => { from.innerHTML += `<option value="${u}">${u}</option>`; to.innerHTML += `<option value="${u}">${u}</option>`; });
    }
}

function convertUnit(){
    const type = document.getElementById('unitType').value;
    let val = parseFloat(document.getElementById('unitValue').value);
    const from = document.getElementById('unitFrom').value;
    const to = document.getElementById('unitTo').value;
    const out = document.getElementById('unitResult');
    if(isNaN(val)){ out.innerText = 'Lütfen bir değer girin!'; return; }
    let result;
    if(type === 'temperature'){
        if(from==='C'){ result = to==='F'? val*9/5+32 : to==='K'? val+273.15 : val; }
        else if(from==='F'){ result = to==='C'? (val-32)*5/9 : to==='K'? (val-32)*5/9+273.15 : val; }
        else if(from==='K'){ result = to==='C'? val-273.15 : to==='F'? (val-273.15)*9/5+32 : val; }
    } else if(units[type]){
        result = val * units[type][from] / units[type][to];
    }
    if(result !== undefined) out.innerText = 'Sonuç: ' + result.toFixed(6);
    else out.innerText = 'Geçersiz seçim.';
}

/* =========================
   NOTLAR (ID-BAZLI + XSS KORUMALI)
   ========================= */

function escapeHTML(str){
    if(str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m];
    });
}

function decodeHTML(str){
    if(!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

function addNote(){
    const tEl = document.getElementById('noteTitle');
    const cEl = document.getElementById('noteContent');
    if(!tEl || !cEl) return;

    const rawTitle = tEl.value.trim();
    const rawContent = cEl.value.trim();
    if(rawTitle === '' && rawContent === '') return;

    const title = escapeHTML(rawTitle);
    const content = escapeHTML(rawContent);

    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push({ id: Date.now(), title, content });
    localStorage.setItem('notes', JSON.stringify(notes));
    tEl.value = ''; cEl.value = '';
    renderNotes();
}

function renderNotes(){
    const listEl = document.getElementById('noteList');
    if(!listEl) return;
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const searchRaw = document.getElementById('noteSearch')?.value || '';
    const search = searchRaw.toLowerCase();

    const filtered = notes.filter(n => (n.title || '').toLowerCase().includes(search) || (n.content || '').toLowerCase().includes(search));
    if(filtered.length === 0){ listEl.innerHTML = '<div style="color:var(--muted)">Not bulunamadı.</div>'; return; }

    listEl.innerHTML = filtered.map(n => `
        <div class="note-item card">
            <div class="meta">
                <strong>${n.title || 'Başlıksız'}</strong>
                <div>${n.content}</div>
                <div style="margin-top:8px; font-size:12px; color:var(--muted);">${new Date(n.id).toLocaleString()}</div>
            </div>
            <div class="note-actions">
                <button data-note-id="${n.id}" data-action="edit">Düzenle</button>
                <button data-note-id="${n.id}" data-action="delete" style="background:transparent;color:var(--accent);border:none;font-size:18px;cursor:pointer;">🗑️</button>
            </div>
        </div>
    `).join('');
    
    // Düzenle/Sil butonlarına event listener ekle
    listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => editNotePrompt(parseInt(btn.dataset.noteId)));
    });
    listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteNote(parseInt(btn.dataset.noteId)));
    });
}

function deleteNote(id){
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem('notes', JSON.stringify(filtered));
    renderNotes();
}

function editNotePrompt(id){
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find(n => n.id === id);
    if(!note) return;
    
    const decodedTitle = decodeHTML(note.title);
    const decodedContent = decodeHTML(note.content);

    const newTitleRaw = prompt('Başlık (iptal için "İptal" veya Esc):', decodedTitle);
    if(newTitleRaw === null) return; 
    const newContentRaw = prompt('İçerik (iptal için Esc):', decodedContent);
    if(newContentRaw === null) return;

    note.title = escapeHTML(newTitleRaw.trim());
    note.content = escapeHTML(newContentRaw.trim());
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
}

/* =========================
   MASAL TASLAĞI (Güncellendi: Basit şablon)
   ========================= */

const yasKurallari = {
    "2-3": { kelimeSiniri:40, ek:'Kısa cümleler, bol tekrar ve sesler eklenmiştir.' },
    "3-4": { kelimeSiniri:70, ek:'Kısa cümleler, basit kelimeler ve öğretici unsurlar kullanılmıştır.' },
    "5-6": { kelimeSiniri:150, ek:'Biraz daha uzun cümleler, basit bir ahlaki ders içerir.' },
    "okul-oncesi": { kelimeSiniri:100, ek:'Sevimli ve sıcak bir hikaye tonu kullanılmıştır.' }
};

function setMasalLoading(isLoading){
    const s = document.getElementById('masalSpinner');
    const btn = document.getElementById('masalUretBtn');
    if(!s || !btn) return;
    if(isLoading){ s.style.display='block'; btn.disabled=true; btn.innerText='Oluşturuluyor...'; document.getElementById('masalSonuc').innerText=''; }
    else{ s.style.display='none'; btn.disabled=false; btn.innerText='📝 Taslak Oluştur'; }
}

function uretMasal(){
    const kahramanRaw = (document.getElementById('masalKahraman')?.value || '').trim();
    const yerRaw = (document.getElementById('masalYer')?.value || '').trim();
    const konuRaw = (document.getElementById('masalKonu')?.value || 'Dostluk').trim();
    const duyguRaw = (document.getElementById('masalDuygu')?.value || 'Neşeli').trim();
    const yas = document.getElementById('masalYas')?.value || 'okul-oncesi';
    const sonucEl = document.getElementById('masalSonuc');

    if(!kahramanRaw || !yerRaw){ sonucEl.innerText = 'Lütfen Kahraman ve Yer alanlarını doldurun.'; return; }

    setMasalLoading(true);
    const { ek } = yasKurallari[yas];

    // Geri dönüş metni güncellendi. Artık daha dürüst ve bilgilendirici.
    try{
        const taslakMetin = `
        **Hikaye Taslağı** (Yaş: ${yas})
        
        Bir zamanlar, **${yerRaw}** denilen güzel bir yerde, **${kahramanRaw}** adında ${duyguRaw} bir kahraman yaşarmış. 
        ${kahramanRaw}, bir gün ormanda dolaşırken kalbi kırık bir kuşa rastlamış.
        Hikaye, kahramanımızın kuşla olan etkileşimi üzerinden **${konuRaw}** temasını işler.
        ${ek} Cümleler ${duyguRaw} bir tonda ilerler.
        
        *(Bu bir yapay zeka tarafından oluşturulmuş tam metin değil, sadece bir taslaktır. Detaylar için notlarınızı kullanabilirsiniz.)*
        `;
        setTimeout(()=> {
            sonucEl.innerText = taslakMetin;
            setMasalLoading(false);
        }, 500);
    }catch(err){
        sonucEl.innerText = 'Taslak üretimi sırasında hata: ' + (err.message || err);
        setMasalLoading(false);
    }
}

function saveMasalToNotes(){
    const text = document.getElementById('masalSonuc')?.innerText || '';
    if(!text || text === 'Oluşturulan taslak burada belirecek...') { alert('Kaydetilecek bir taslak yok'); return; }
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push({ id: Date.now(), title: escapeHTML('Taslak - ' + new Date().toLocaleString()), content: escapeHTML(text) });
    localStorage.setItem('notes', JSON.stringify(notes));
    alert('Taslak Notlarınıza kaydedildi');
}

function okuMasal() {
    const text = document.getElementById('masalSonuc')?.innerText || '';
    if (!text || text === 'Oluşturulan taslak burada belirecek...') { 
        alert('Önce bir taslak oluşturmalısınız.'); 
        return; 
    }

    if ('speechSynthesis' in window) {
        if(window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9; 

        window.speechSynthesis.speak(utterance);
    } else {
        alert('Maalesef tarayıcınız sesli okuma özelliğini desteklemiyor.');
    }
}

/* =========================
   AYARLAR (localStorage)
   ========================= */

function toggleDarkMode(){
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    if(currentContent === 'settings') loadContent('settings');
}

function changeLanguage(lang){
    localStorage.setItem('language', lang);
    alert('Dil kaydedildi: ' + (lang === 'tr' ? 'Türkçe' : 'English'));
}

function changeFontSize(size){
    document.documentElement.classList.remove('small', 'normal', 'large');
    if(size === 'small') document.documentElement.classList.add('small');
    else if(size === 'normal') document.documentElement.classList.add('normal');
    else if(size === 'large') document.documentElement.classList.add('large');
    localStorage.setItem('fontSize', size);
}

function loadSettingsFromStorage(){
    if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');
    const font = localStorage.getItem('fontSize') || 'normal';
    changeFontSize(font);
}

/* =========================
   UYGULAMA BAŞLANGICI
   ========================= */

document.addEventListener('DOMContentLoaded', initApp);
