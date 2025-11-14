/* ==========================================================
   🌌 INSIGHTREADS — UYGULAMA ÇEKİRDEĞİ (CLEAN FULL CORE V3.0)
   Tam kapsüllenmiş, tekil ve modern sürüm
   ========================================================== */

const AppCore = (() => {

/* -------------------------
   🧱 STATE ve YARDIMCILAR (GÜNCEL VE GÜVENLİ)
-------------------------- */

/**
 * Güvenli localStorage erişimi.
 * JSON parse hataları veya erişim yasakları durumunda hata atmadan fallback döner.
 */
const safeStorage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      // JSON string'i ise parse etmeye çalış
      if (val && (val.startsWith("{") || val.startsWith("["))) {
        return JSON.parse(val);
      }
      return val !== null ? val : fallback;
    } catch (e) {
      console.warn("⚠️ localStorage erişilemedi:", e);
      return fallback;
    }
  },
  set(key, val) {
    try {
      const storeVal = typeof val === "object" ? JSON.stringify(val) : val;
      localStorage.setItem(key, storeVal);
    } catch (e) {
      console.warn("⚠️ localStorage yazılamadı:", e);
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
  clear() {
    try { localStorage.clear(); } catch {}
  }
};

/**
 * Global durum (AppCore genelinde erişilir)
 */
const state = {
  currentPage: safeStorage.get("lastPage", "home"),
  userTheme: safeStorage.get("userTheme", "auto"),
  username: safeStorage.get("username", "Anonim")
};

/**
 * HTML karakterlerini güvenli hale getirir (XSS önleme)
 */
const escapeHTML = (str = "") =>
  String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));

/**
 * Kullanıcıya mesaj göstermek için mini bildirim (toast)
 * @param {string} msg - Mesaj
 * @param {number} ms - Görünme süresi (ms)
 * @param {'default'|'success'|'error'} type - Görsel stili
 */
const showToast = (msg, ms = 2200, type = 'default') => {
  try {
    if (typeof document === "undefined") {
      console.log("TOAST:", msg);
      return;
    }
    const t = document.createElement("div");
    t.className = `toast-message ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);

    // CSS animasyonunun çalışması için zorla yeniden akış
    void t.offsetWidth;
    t.classList.add("show");

    // Çıkış animasyonu
    setTimeout(() => t.classList.remove("show"), ms);
    setTimeout(() => t.remove(), ms + 500);
  } catch (e) {
    console.warn("TOAST HATASI:", msg, e);
  }
};

/**
 * Yüksek frekansta tetiklenen olayları yavaşlatmak için debounce
 */
const debounce = (fn, wait = 200) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};
  /* -------------------------
     🌗 TEMA SİSTEMİ
  -------------------------- */
  const Theme = {
    _getBody() {
      if (typeof document === 'undefined') return null;
      return document.body || document.documentElement || null;
    },

    apply() {
      try {
        const body = Theme._getBody();
        if (!body) {
          if (typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', () => { setTimeout(() => Theme.apply(), 10); }, { once: true });
          }
          return;
        }

        const mode = state.userTheme;
        const hour = new Date().getHours();
        const isNight = hour >= 19 || hour < 8;

        body.classList.add("theme-transition");
        setTimeout(() => body.classList.remove("theme-transition"), 200);

        if (mode === "dark") body.classList.add("dark");
        else if (mode === "light") body.classList.remove("dark");
        else { body.classList.toggle("dark", isNight); }

        Theme.updateButton(mode);
      } catch (err) {
        console.warn("Theme.apply hatası:", err);
      }
    },

    updateButton(mode) {
      try {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById("manualThemeToggleBtn");
        if (!btn) return;
        const hour = new Date().getHours();
        const isNight = hour >= 19 || hour < 8;
        btn.textContent = (
          mode === "auto" ? (isNight ? "🌙 Otomatik (Gece)" : "☀️ Otomatik (Gündüz)") :
          mode === "dark" ? "🌙 Koyu Mod" : "☀️ Açık Mod"
        );
      } catch (err) {
        console.warn("Theme.updateButton hatası:", err);
      }
    },

    set(mode) {
      try {
        state.userTheme = mode;
        safeStorage.set("userTheme", mode);
        Theme.apply();
        showToast("Tema: " + mode);
      } catch (err) {
        console.warn("Theme.set hatası:", err);
      }
    },

    toggle() {
      try {
        const body = Theme._getBody();
        const current = state.userTheme;
        let next;
        if (current === "auto")
          next = (body && body.classList.contains("dark")) ? "light" : "dark";
        else if (current === "dark") next = "light";
        else next = "dark";
        Theme.set(next);
      } catch (err) {
        console.warn("Theme.toggle hatası:", err);
      }
    },
    
    setFontSize(size) {
      const body = Theme._getBody();
      if (!body) return;
      body.className = body.className.replace(/\s*font-size-\w+/g, '');
      body.classList.add(`font-size-${size}`);
      safeStorage.set("fontSize", size);
    }
  };

/* -------------------------
   📋 POST MANAGER (Safe)
-------------------------- */
const PostManager = {
  key: "insightPosts",

  load() {
  try {
    const data = safeStorage.get(this.key);
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("PostManager load error:", e);
    return [];
  }
},

  save(posts) {
    try {
      safeStorage.set(this.key, JSON.stringify(posts));
    } catch (e) {
      console.warn("PostManager save error:", e);
    }
  },

  add(post) {
    if (!post || typeof post !== "object") {
      console.error("Geçersiz post nesnesi:", post);
      showToast("Paylaşım eklenemedi, veri eksik.");
      return;
    }
    const posts = this.load();
    posts.unshift(post);
    this.save(posts);
    this.renderList();
  },

  delete(id) {
    this.save(this.load().filter(p => p.id !== id));
    this.renderList();
    showToast("Paylaşım silindi.");
  },

  renderList() {
    const listContainer = document.getElementById("postList");
    if (!listContainer) return;

    const posts = this.load();
    listContainer.innerHTML = posts.length
      ? posts.map(p => `
        <div class="card-mini" data-id="${p.id}">
          <b>${escapeHTML(p.title || '(Başlıksız)')}</b>
          <p style="font-size:0.9em;">${escapeHTML(p.content)}</p>
          ${p.image ? `<img src="${p.image}" style="max-width:100%; border-radius:4px; margin-top:10px;">` : ''}
          <div class="meta muted" style="font-size:0.8em; margin-top:8px;">
            📅 ${new Date(p.date).toLocaleDateString()}
            <button data-id="${p.id}" class="btn-small delPost" style="margin-left:8px">Sil</button>
          </div>
        </div>`).join("")
      : "<p class='muted'>Henüz paylaşım yok.</p>";

    document.querySelectorAll(".delPost").forEach(btn =>
      btn.onclick = e => { this.delete(Number(e.target.dataset.id)); }
    );
  }
};

window.addEventListener("DOMContentLoaded", () => {
  PostManager.renderList();
});

/* -------------------------
     📝 NOTE MANAGER (V10 Safe)
  -------------------------- */
const NoteManager = {
  load() {
    try {
      const raw = safeStorage.get("notes", "[]");
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch (e) {
      console.warn("⚠️ Notlar çözümlenemedi, sıfırlanıyor.", e);
      safeStorage.set("notes", "[]");
      return [];
    }
  },

  save(notes) {
    try {
      safeStorage.set("notes", JSON.stringify(notes));
    } catch (e) {
      console.error("❌ Not kaydedilemedi:", e);
    }
  },

  add(title, content) {
    const notes = this.load();
    const newNote = {
      id: Date.now(),
      title: title || "(Başlıksız)",
      content: content || "",
      date: new Date().toISOString()
    };
    notes.push(newNote);
    this.save(notes);
    this.renderList();
    showToast("📝 Not kaydedildi!", "success");
  },

  delete(id) {
    const notes = this.load().filter(n => String(n.id) !== String(id));
    this.save(notes);
    this.renderList();
    showToast("🗑️ Not silindi!");
  },

  renderList() {
    const listContainer = document.getElementById("notesList");
    if (!listContainer) return;

    const notes = this.load().slice().reverse();

    if (notes.length === 0) {
      listContainer.innerHTML = "<p class='muted'>Henüz not yok.</p>";
      return;
    }

    listContainer.innerHTML = notes.map(n => `
      <div class="card-mini fade-in">
        <b>${escapeHTML(n.title || '(Başlıksız)')}</b>
        <p style="white-space:pre-wrap;">${escapeHTML(n.content)}</p>
        <small class="muted">${new Date(n.date).toLocaleString()}</small>
        <button data-id="${n.id}" class="btn-small delNote">Sil</button>
      </div>
    `).join("");

    document.querySelectorAll(".delNote").forEach(btn =>
      btn.onclick = e => this.delete(e.target.dataset.id)
    );
  }
};



/* =================================================================
   🧮 HESAP MAKİNESİ MODÜLÜ (GÜNCEL ve KULLANICI-DOSTU BAC)
   ----------------------------------------------------------------- */
const Calculator = {
  // (UNITS ve BAC_CONSTANTS senin eski tanımlarınla aynı kalmalı; aşağıya tekrar ekledim)
  UNITS: {
    length: { base: 'meter', meter: "Metre (m)", kilometer: "Kilometre (km)", mile: "Mil", foot: "Fit" },
    weight: { base: 'kilogram', kilogram: "Kilogram (kg)", gram: "Gram (g)", pound: "Pound (lb)", ounce: "Ons (oz)" },
    temp: { base: 'celsius', celsius: "Celsius (°C)", fahrenheit: "Fahrenheit (°F)", kelvin: "Kelvin (K)" },
    volume: { base: 'liter', liter: "Litre (L)", milliliter: "Mililitre (mL)", gallon: "Galon (US)", cubicMeter: "Metreküp (m³)" },
    area: { base: 'squareMeter', squareMeter: "Metrekare (m²)", squareKilometer: "Kilometrekare", acre: "Dönüm", hectare: "Hektar" },
    speed: { base: 'kph', kph: "km/h", mph: "mil/h", mps: "m/s" },
    bac: { }
  },

  BAC_CONSTANTS: {
    PROMILLE_TO_MG_DL: 100,
    PROMILLE_TO_MMOL_L: 21.705,
    METABOLISM_RATE_PROMILLE_PER_HOUR: 0.15
  },

  basicState: { currentInput: '0', prevValue: null, operator: null, waitingForSecondOperand: false },

  /* -------------------------
     Temel hesaplama (math.js fallback)
  ------------------------- */
  calculateBasic(expression) {
    try {
      let safeExp = String(expression)
        .replace(/([0-9.]+)!/g, 'factorial($1)')
        .replace(/√/g, 'sqrt')
        .replace(/ln/g, 'log')
        .replace(/log/g, 'log10')
        .replace(/π/g, 'pi')
        .replace(/e/g, 'E')
        .replace(/×/g, '*');
      const result = window.math?.evaluate ? window.math.evaluate(safeExp) : eval(safeExp);
      if (typeof result === 'number') return result.toFixed(10).replace(/\.?0+$/, "");
      return String(result);
    } catch (e) {
      console.error("Hesaplama Hatası:", e);
      return 'ERR';
    }
  },

  applyKey(key) {
    // Basit sayı/düğme işlemleri — (senin eski applyKey fonksiyonunla aynı mantık)
    const state = Calculator.basicState;
    const display = document.getElementById('calcDisplay');
    if (!display) return;
    const degToRad = (deg) => deg * Math.PI / 180;

    if (/[0-9.]/.test(key)) {
      if (state.waitingForSecondOperand) { state.currentInput = key === '.' ? '0.' : key; state.waitingForSecondOperand = false; }
      else { if (key === '.' && state.currentInput.includes('.')) return; state.currentInput = (state.currentInput === '0' && key !== '.') ? key : state.currentInput + key; }
    } else if (key === 'AC') {
      Object.assign(state, { currentInput: '0', prevValue: null, operator: null, waitingForSecondOperand: false });
    } else if (key === 'C') {
      state.currentInput = state.currentInput.slice(0, -1) || '0';
      if (state.currentInput === '0') state.waitingForSecondOperand = false;
    } else if (['+', '-', '*', '/', '^'].includes(key)) {
      const inputValue = parseFloat(state.currentInput);
      if (state.prevValue === null) state.prevValue = inputValue;
      else if (state.operator) {
        const expression = `${state.prevValue}${state.operator}${inputValue}`;
        const result = Calculator.calculateBasic(expression);
        state.prevValue = parseFloat(result) || state.prevValue;
        state.currentInput = result;
      }
      state.operator = key;
      state.waitingForSecondOperand = true;
    } else if (key === '=') {
      if (state.prevValue !== null && state.operator) {
        const inputValue = parseFloat(state.currentInput);
        const expression = `${state.prevValue}${state.operator}${inputValue}`;
        const result = Calculator.calculateBasic(expression);
        Object.assign(state, { currentInput: result, prevValue: null, operator: null, waitingForSecondOperand: true });
      }
    } else if (['sin','cos','tan','sqrt','ln','log','!','pi','e','%'].includes(key)) {
      let value = parseFloat(state.currentInput); let result = 'ERR';
      try {
        if (key === 'pi') result = Math.PI.toFixed(10);
        else if (key === 'e') result = Math.E.toFixed(10);
        else if (key === 'sqrt') result = Math.sqrt(value).toFixed(10);
        else if (key === 'sin') result = Math.sin(degToRad(value)).toFixed(10);
        else if (key === 'cos') result = Math.cos(degToRad(value)).toFixed(10);
        else if (key === 'tan') result = Math.tan(degToRad(value)).toFixed(10);
        else if (key === 'ln') result = Math.log(value).toFixed(10);
        else if (key === 'log') result = Math.log10(value).toFixed(10);
        else if (key === '%') result = (value/100).toFixed(10);
        else if (key === '!') result = Calculator.calculateBasic(`${value}!`);
        state.currentInput = String(result).replace(/\.?0+$/,"");
        state.waitingForSecondOperand = true;
      } catch { state.currentInput = 'ERR'; }
    }

    if (display) display.textContent = state.currentInput;
  },

  /* -------------------------
     OHM, BİRİM vs. (kısa: mevcut fonksiyonları koru)
  ------------------------- */
  calculateOhm() {
    const v = parseFloat(document.getElementById('ohmVoltage')?.value) || 0;
    const i = parseFloat(document.getElementById('ohmCurrent')?.value) || 0;
    const r = parseFloat(document.getElementById('ohmResistance')?.value) || 0;
    const resultDiv = document.getElementById('ohmResult');
    let result = '';
    const enteredCount = [v,i,r].filter(val=>val>0).length;
    if (enteredCount < 2) result = 'Hesaplama için en az iki değer girilmelidir.';
    else if (v>0 && i>0 && r===0) result = `Direnç (R): ${(v/i).toFixed(3)} Ω`;
    else if (v>0 && r>0 && i===0) result = `Akım (I): ${(v/r).toFixed(3)} A`;
    else if (i>0 && r>0 && v===0) result = `Voltaj (V): ${(i*r).toFixed(3)} V`;
    else result = 'Lütfen hesaplanacak alanı boş bırakarak en az iki değer girin.';
    if (resultDiv) resultDiv.innerHTML = `<p style="font-weight:bold;">${result}</p>`;
  },

  updateUnitOptions() {
    const unitType = document.getElementById('unitType')?.value;
    const generalForm = document.getElementById('general-converter-form');
    const unitResult = document.getElementById('unitResult');

    if (!generalForm || !unitResult) return;

    if (unitType === 'bac') {
      // Gizle eski genel form, render yeni kullanıcı dostu BAC formunu
      generalForm.style.display = 'none';
      this.renderBACFriendlyForm(unitResult);
    } else {
      generalForm.style.display = 'block';
      // restore/hide bac area
      unitResult.innerHTML = '';
      const units = Calculator.UNITS[unitType] || {};
      let optionsHTML = '';
      for (const key in units) if (key !== 'base') optionsHTML += `<option value="${key}">${units[key]}</option>`;
      const fromSelect = document.getElementById('unitFrom');
      const toSelect = document.getElementById('unitTo');
      if (fromSelect && toSelect) { fromSelect.innerHTML = optionsHTML; toSelect.innerHTML = optionsHTML; toSelect.value = Object.keys(units)[1] || Object.keys(units)[0] || ""; }
      Calculator.convertUnit();
    }
  },

  /* -------------------------
     --- USER-FRIENDLY BAC FORM + LOGIC ---
     ------------------------- */

  // Preset içecekler: hacim (ml) ve abv (oran)
  DRINK_PRESETS: [
    { id: 'beer_500', label: '🍺 Bira 500ml (≈ 5%)', ml: 500, abv: 0.05 },
    { id: 'wine_150', label: '🍷 Şarap 150ml (≈12%)', ml: 150, abv: 0.12 },
    { id: 'whisky_50', label: '🥃 Viski 50ml (≈40%)', ml: 50, abv: 0.40 },
    { id: 'raki_100', label: '🧊 Rakı 100ml (≈40%)', ml: 100, abv: 0.40 },
    { id: 'cocktail_200', label: '🍹 Kokteyl 200ml (≈12%)', ml: 200, abv: 0.12 },
    { id: 'custom', label: '➕ Özel (g olarak gir)' , ml: 0, abv: 0 }
  ],

  // ml * abv * 0.789 -> alkol gramı (yaklaşık)
  mlAbvToGrams(ml, abv) { return (ml * abv * 0.789); },

  // Bir preset (veya custom gram) eklenmiş veri yapısı:
  // { id, label, grams }
  buildDrinkFromPreset(presetId, customGrams) {
    const p = Calculator.DRINK_PRESETS.find(x => x.id === presetId);
    if (!p) return null;
    if (p.id === 'custom') return { id: 'custom', label: 'Özel', grams: Number(customGrams) || 0 };
    return { id: p.id, label: p.label, grams: Math.round(Calculator.mlAbvToGrams(p.ml, p.abv) * 100) / 100 };
  },

  // Render kullanıcı-dostu formu
  renderBACFriendlyForm(container) {
    container.innerHTML = `
      <div class="bac-card" style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="flex:1; min-width:180px;">
            <label>Kilonuz (kg)</label>
            <input id="bacWeight" type="number" min="1" placeholder="70" />
          </div>
          <div style="min-width:140px;">
            <label>Cinsiyet</label>
            <select id="bacGender">
              <option value="M">Erkek</option>
              <option value="F">Kadın</option>
            </select>
          </div>
          <div style="min-width:140px;">
            <label>Boş mide?</label>
            <select id="bacFasted">
              <option value="no">Hayır</option>
              <option value="yes">Evet</option>
            </select>
          </div>
        </div>

        <div id="bacDrinkList" style="display:flex;flex-direction:column;gap:8px;">
          <label>İçecekler (ekleyin):</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="bacPresetButtons"></div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="bacCustomGrams" type="number" placeholder="Özel: alkol gramı (g)" style="flex:1;" />
            <button id="bacAddCustomBtn" class="btn-secondary">Ekle</button>
          </div>
          <div id="bacAddedList" style="min-height:36px;"></div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;">
          <label style="white-space:nowrap;">İçtikten beri geçen süre (saat):</label>
          <input id="bacHoursElapsed" type="range" min="0" max="12" step="0.1" value="1" style="flex:1;" />
          <div style="width:60px; text-align:center;"><span id="bacHoursLabel">1.0</span> sa</div>
        </div>

        <div style="display:flex;gap:10px;">
          <button id="bacCalculateBtn" class="btn-primary">Hesapla</button>
          <button id="bacResetListBtn" class="btn-neutral">Temizle</button>
        </div>

        <div id="bacResult" class="result-display" style="margin-top:6px;"></div>
        <div id="bacChartWrap" style="margin-top:8px; display:none;">
          <canvas id="bacChartCanvas" height="120"></canvas>
        </div>
      </div>
    `;

    // attach preset buttons
    const presetWrap = container.querySelector('#bacPresetButtons');
    Calculator.DRINK_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary';
      btn.style.margin = '2px';
      btn.textContent = p.label;
      btn.onclick = () => {
        if (p.id === 'custom') {
          container.querySelector('#bacCustomGrams').focus();
        } else {
          const drink = Calculator.buildDrinkFromPreset(p.id);
          Calculator._bacAddDrinkToList(drink);
        }
      };
      presetWrap.appendChild(btn);
    });

    // add custom
    container.querySelector('#bacAddCustomBtn').onclick = () => {
      const grams = Number(container.querySelector('#bacCustomGrams').value) || 0;
      if (grams <= 0) return alert('Lütfen geçerli bir gram değeri girin.');
      Calculator._bacAddDrinkToList({ id:'custom', label: `Özel ${grams} g`, grams });
      container.querySelector('#bacCustomGrams').value = '';
    };

    // hours update
    container.querySelector('#bacHoursElapsed').addEventListener('input', (e) => {
      container.querySelector('#bacHoursLabel').textContent = Number(e.target.value).toFixed(1);
    });

    // calculate
    container.querySelector('#bacCalculateBtn').onclick = () => Calculator.calculateFriendlyBAC();

    // reset list
    container.querySelector('#bacResetListBtn').onclick = () => {
      Calculator._bacClearList();
      container.querySelector('#bacResult').innerHTML = '';
      document.getElementById('bacChartWrap').style.display = 'none';
    };

    // ensure list exists
    Calculator._bacEnsureStorage();
    Calculator._bacRenderAddedList();
  },

  // içecek listesini local değişkende tutalım (sayfa yenilense de kaybolabilir)
  _bac_drinks: [],

  _bacEnsureStorage() { if (!Array.isArray(this._bac_drinks)) this._bac_drinks = []; },

  _bacAddDrinkToList(drink) {
    if (!drink || !drink.grams) return;
    this._bacEnsureStorage();
    this._bac_drinks.push(drink);
    this._bacRenderAddedList();
  },

  _bacClearList() { this._bac_drinks = []; this._bacRenderAddedList(); },

  _bacRenderAddedList() {
    const wrap = document.getElementById('bacAddedList');
    if (!wrap) return;
    if (!this._bac_drinks.length) { wrap.innerHTML = '<p class="muted">Henüz içecek eklenmedi.</p>'; return; }
    wrap.innerHTML = this._bac_drinks.map((d, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <div style="flex:1;">${d.label} — <b>${d.grams} g</b></div>
        <button data-i="${i}" class="btn-small bac-remove">Sil</button>
      </div>
    `).join('');
    wrap.querySelectorAll('.bac-remove').forEach(b => b.onclick = (e) => {
      const i = Number(e.currentTarget.dataset.i);
      this._bac_drinks.splice(i,1);
      this._bacRenderAddedList();
    });
  },

  // Hesaplama: Widmark benzeri (uyumlu olduğun eski formülle tutarlı)
  calculateFriendlyBAC() {
    const weight = Number(document.getElementById('bacWeight')?.value) || 0;
    const gender = document.getElementById('bacGender')?.value || 'M';
    const fasted = document.getElementById('bacFasted')?.value === 'yes';
    const hoursElapsed = Number(document.getElementById('bacHoursElapsed')?.value) || 0;
    const resultDiv = document.getElementById('bacResult');

    if (!weight || !this._bac_drinks.length) {
      return resultDiv.innerHTML = `<p class="muted">Lütfen kilo girin ve en az bir içecek ekleyin.</p>`;
    }

    // toplam alkol gramı
    const totalGrams = this._bac_drinks.reduce((s,d) => s + (Number(d.grams)||0), 0);

    // Widmark sabiti (R)
    const R = (gender === 'M') ? 0.73 : 0.66;

    // Eğer açlık etkisi varsa metabolizma biraz hızlı/eksik etkileyebilir; burada küçük bir düzeltme
    const metabolismRate = this.BAC_CONSTANTS.METABOLISM_RATE_PROMILLE_PER_HOUR * (fasted ? 1.05 : 1.0);

    // Peak promil (uygun formül ile tutarlı: (g / (kg * R)) * 100  -> promil (‰))
    const peakBAC = (totalGrams / (weight * R)) * 100;

    // Final BAC (geçen saat kadar metabolize olmuş)
    const finalBAC = Math.max(0, peakBAC - (hoursElapsed * metabolismRate));

    const finalBACStr = finalBAC.toFixed(3);

    // Tam sıfırlanma süresi
    const totalTimeToZero = peakBAC / metabolismRate;
    const timeRemaining = Math.max(0, totalTimeToZero - hoursElapsed);

    // Durum rengi / mesaj
    let status = { color: '#22c55e', text: 'Düşük — Genel olarak güvenli' };
    if (finalBAC > 0.5) status = { color:'#DC2626', text:'Yüksek — Araç kullanmayın' };
    else if (finalBAC > 0.3) status = { color:'#F97316', text: 'Dikkat — Riskli' };

    // Mesajı oluştur
    resultDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div>
          <div style="font-weight:700; font-size:1.4rem; color:${status.color}">${finalBACStr} ‰</div>
          <div style="margin-top:6px;font-size:0.95rem;">Durum: <b>${status.text}</b></div>
          <div style="margin-top:6px;font-size:0.85rem;" class="muted">Tahmini tam sıfırlanma: <b>${timeRemaining.toFixed(1)} saat</b></div>
        </div>
        <div style="text-align:right; min-width:160px;">
          <div style="font-size:0.85rem;" class="muted">Toplam alkol:</div>
          <div style="font-weight:700; font-size:1rem;">${totalGrams.toFixed(1)} g</div>
          <div style="font-size:0.8rem; margin-top:6px;" class="muted">Metabolizma: ${metabolismRate.toFixed(3)} ‰/saat</div>
        </div>
      </div>
      <div style="margin-top:8px; font-size:0.85rem;" class="muted">(**Sonuçlar tahmini olup kişisel farklılıklar gösterebilir.**) </div>
    `;

    // Chart çiz
    Calculator._bacRenderChart(peakBAC, metabolismRate, hoursElapsed);
  },

  // Chart.js kullanarak saatlik eğri
  _bacRenderChart(peakBAC, metabolismRate, hoursElapsed) {
    // Chart'ın global Chart objesine ihtiyacı vardır. (HTML'de Chart.js yüklenmiş olmalı)
    if (typeof window.Chart === 'undefined') {
        console.error("Chart.js kütüphanesi yüklenmedi. Grafik çizilemiyor.");
        return;
    }
      
    const wrap = document.getElementById('bacChartWrap');
    const canvas = document.getElementById('bacChartCanvas');
    if (!wrap || !canvas) return;
    wrap.style.display = 'block';

    // prepare data for 0..maxHours
    const maxHours = Math.min(24, Math.ceil((peakBAC / metabolismRate) + 1));
    const labels = [];
    const data = [];
    for (let h = 0; h <= maxHours; h++) {
      labels.push(h + 'h');
      const bacAt = Math.max(0, peakBAC - (h * metabolismRate));
      data.push(Math.round(bacAt * 1000)/1000);
    }

    // destroy existing chart if varsa
    if (canvas._bacChartInstance) {
      canvas._bacChartInstance.destroy();
      canvas._bacChartInstance = null;
    }

    // create
    const ctx = canvas.getContext('2d');
    canvas._bacChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Tahmini BAC (‰)', data, fill:false, tension:0.2 }] },
      options: {
        responsive:true,
        maintainAspectRatio:false,
        scales: {
          y: { beginAtZero:true }
        },
        plugins: {
          legend:{ display:false }
        }
      }
    });
  },

  /* -------------------------
     Birim dönüştürücü (eski convertUnit) - koru
  ------------------------- */
  _toBase(type, value, fromUnit) {
    if (type === 'length') {
      if (fromUnit === 'kilometer') return value * 1000;
      if (fromUnit === 'mile') return value * 1609.34;
      if (fromUnit === 'foot') return value * 0.3048;
      return value;
    } else if (type === 'weight') {
      if (fromUnit === 'gram') return value / 1000;
      if (fromUnit === 'pound') return value * 0.453592;
      if (fromUnit === 'ounce') return value * 0.0283495;
      return value;
    } else if (type === 'temp') {
      if (fromUnit === 'fahrenheit') return (value - 32) * 5 / 9;
      if (fromUnit === 'kelvin') return value - 273.15;
      return value;
    } else if (type === 'volume') {
      if (fromUnit === 'milliliter') return value / 1000;
      if (fromUnit === 'gallon') return value * 3.78541;
      if (fromUnit === 'cubicMeter') return value * 1000;
      return value;
    } else if (type === 'area') {
      if (fromUnit === 'squareKilometer') return value * 1000000;
      if (fromUnit === 'acre') return value * 4046.86;
      if (fromUnit === 'hectare') return value * 10000;
      return value;
    } else if (type === 'speed') {
      if (fromUnit === 'mph') return value * 1.60934;
      if (fromUnit === 'mps') return value * 3.6;
      return value;
    }
    return value;
  },

  _fromBase(type, baseValue, toUnit) {
    if (type === 'length') {
      if (toUnit === 'kilometer') return baseValue / 1000;
      if (toUnit === 'mile') return baseValue / 1609.34;
      if (toUnit === 'foot') return baseValue / 0.3048;
      return baseValue;
    } else if (type === 'weight') {
      if (toUnit === 'gram') return baseValue * 1000;
      if (toUnit === 'pound') return baseValue / 0.453592;
      if (toUnit === 'ounce') return baseValue / 0.0283495;
      return baseValue;
    } else if (type === 'temp') {
      if (toUnit === 'fahrenheit') return (baseValue * 9 / 5) + 32;
      if (toUnit === 'kelvin') return baseValue + 273.15;
      return baseValue;
    } else if (type === 'volume') {
      if (toUnit === 'milliliter') return baseValue * 1000;
      if (toUnit === 'gallon') return baseValue / 3.78541;
      if (toUnit === 'cubicMeter') return baseValue / 1000;
      return baseValue;
    } else if (type === 'area') {
      if (toUnit === 'squareKilometer') return baseValue / 1000000;
      if (toUnit === 'acre') return baseValue / 4046.86;
      if (toUnit === 'hectare') return baseValue / 10000;
      return baseValue;
    } else if (type === 'speed') {
      if (toUnit === 'mph') return baseValue / 1.60934;
      if (toUnit === 'mps') return baseValue / 3.6;
      return baseValue;
    }
    return baseValue;
  },

  convertUnit() {
    const type = document.getElementById('unitType')?.value;
    if (type === 'bac') {
      this.updateUnitOptions(); // zaten updateUnitOptions çağrılırken bac formu oluşturulur
      return;
    }
    const value = parseFloat(document.getElementById('unitValue')?.value) || 0;
    const from = document.getElementById('unitFrom')?.value;
    const to = document.getElementById('unitTo')?.value;
    const resultDiv = document.getElementById('unitResult');
    if (!resultDiv) return;
    if (!from || !to) { resultDiv.innerHTML = `<p class="muted">Lütfen birim seçin.</p>`; return; }
    if (value === 0) { resultDiv.innerHTML = `<p class="muted">Dönüştürmek için bir değer girin.</p>`; return; }
    const baseValue = Calculator._toBase(type, value, from);
    const convertedValue = Calculator._fromBase(type, baseValue, to);
    const fromName = Calculator.UNITS[type][from];
    const toName = Calculator.UNITS[type][to];
    const resultText = `${value.toFixed(4).replace(/\.?0+$/, "")} ${fromName} = ${convertedValue.toFixed(6).replace(/\.?0+$/, "")} ${toName}`;
    resultDiv.innerHTML = `<p style="font-weight:bold;">${resultText}</p>`;
  },

  /* -------------------------
     Olay dinleyicilerinin bağlanması (Pages.attach çağırdığında kullanılacak)
     - debounce fonksiyonu AppCore.debounce veya window.debounce varsa onu kullan
  ------------------------- */
  attachListeners(debounceFn) {
    // fallback
    const dfn = debounceFn || (window.AppCore && window.AppCore.debounce) || (fn => fn);
    
    // TAB Düğmeleri
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => CalculatorUI.showTool(btn.dataset.tool)));
    
    // TEMEL HESAP MAKİNESİ Tuşları
    document.querySelectorAll('#basic-calc button[data-key]').forEach(btn => btn.addEventListener('click', (e) => Calculator.applyKey(e.currentTarget.dataset.key)));
    
    // OHM Hesaplayıcı Inputları (debounce ile)
    document.querySelectorAll('#ohm-calc input').forEach(el => el.addEventListener('input', dfn(() => Calculator.calculateOhm(), 400)));
    
    // BİRİM TİPİ Değişikliği (UnitType)
    document.getElementById('unitType')?.addEventListener('change', dfn(() => Calculator.updateUnitOptions(), 150));
    
    // BİRİM DÖNÜŞTÜRÜCÜ Select/Input Değişiklikleri
    document.getElementById('unitValue')?.addEventListener('input', dfn(() => Calculator.convertUnit(), 200));
    document.getElementById('unitFrom')?.addEventListener('change', dfn(() => Calculator.convertUnit(), 10));
    document.getElementById('unitTo')?.addEventListener('change', dfn(() => Calculator.convertUnit(), 10));

    // Eğer sayfa ilk defa yüklendiyse unit seçeneklerini güncelle
    setTimeout(() => Calculator.updateUnitOptions(), 120);
  }
};

/* -------------------------
   Calculator UI kısmi
------------------------- */
const CalculatorUI = {
  showTool(id) {
    document.querySelectorAll('.calc-tool').forEach(c => c.classList.remove('visible'));
    const el = document.getElementById(id);
    if (el) el.classList.add('visible');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === id));
    
    // Görünür olan aracın ilk hesaplamasını tetikle
    if (id === 'unit-converter') { Calculator.updateUnitOptions?.(); } 
    else if (id === 'ohm-calc') { Calculator.calculateOhm?.(); }
  }
};
  /* -------------------------
     📄 SAYFALAR (RENDERER & ATTACH)
   -------------------------- */
  const Pages = {
    render(page) {
      if (page === "home") {
        return `
        <div class="card fade-in" style="text-align:center; padding:30px;">
          <h2 style="color:var(--accent); font-size:1.8rem;">👋 InsightReads'e Hoş Geldiniz!</h2>
          <p class="muted" style="margin:10px auto; max-width:500px;">
            Bilgiyi paylaş, hikayeni anlat ve keşfet. Menüden veya aşağıdaki araçlardan birini seçerek başla!
          </p>
          <div style="margin-top:20px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">
            <button class="btn-primary gradient" onclick="AppCore.Router.load('calculator')">🧮 Hesaplama Merkezi</button>
            <button class="btn-primary gradient" onclick="AppCore.Router.load('notes')">📝 Notlarım</button>
            <button class="btn-primary gradient" onclick="AppCore.Router.load('posts')">📢 Paylaşım Konsolu</button>
            <button class="btn-primary gradient" onclick="AppCore.Router.load('masal')">✨ Masal Üretici</button>
            <button class="btn-primary gradient" onclick="AppCore.Router.load('chat')">🤖 Sohbet</button>
          </div>
        </div>
      `;
      }

      if (page === "notes") {
        return `
        <div class="notes-container card fade-in">
          <h2>📝 Not Yöneticisi</h2>
          <input id="noteTitle" type="text" placeholder="Not Başlığı (Opsiyonel)">
          <textarea id="noteBody" placeholder="Notunuzu buraya yazın..." rows="4"></textarea>
          <button id="saveNote" class="btn-primary gradient">Kaydet</button>
          <div id="notesList" class="list-container"></div>
        </div>
      `;
      }

    if (page === "posts") {
      return `
      <div class="card fade-in">
        <h2 style="color:var(--accent-2); text-align:center;">📸 Paylaşım Konsolu</h2>
        <p class="muted">Fotoğraf ve yazı paylaş. İçeriklerin yalnızca sen onayladığında görünür.</p>
        <input id="postTitle" type="text" placeholder="Paylaşım Başlığı" class="text-input">
        <textarea id="postContent" placeholder="İçeriği yazın..." rows="3" class="text-input"></textarea>
        <input type="file" id="postImage" accept="image/*" class="text-input" style="padding:6px;">
        <button id="addPost" class="btn-primary gradient">Paylaşımı Ekle</button>
        <div id="postList" class="list-container fade-in" style="margin-top:20px;"></div>
      </div>`;
    }

    // ✨ Masal Üretici
if (page === "masal") {
  return `
  <div class="masal-container card fade-in">
    <h2>✨ Masal Üretici</h2>

    <div style="border:1px solid var(--accent-2); padding:15px; margin-bottom:20px; border-radius:8px;">
      <h3>📚 Modeli Eğit</h3>
      <p class="muted" style="font-size:0.9em; margin-bottom:10px;">
        Modeli yeni hikayelerle üç farklı yolla geliştirebilirsiniz:
      </p>

      <div style="margin-bottom:15px; border-bottom:1px dashed var(--border); padding-bottom:15px;">
        <h4>1️⃣ Metin Yapıştır (Hızlı)</h4>
        <textarea id="learnTextarea" placeholder="Öğretilecek metni buraya yapıştırın..." rows="3"></textarea>
        <button id="learnModelBtn" class="btn-primary gradient" style="margin-top:5px;">Metni Modele Öğret</button>
      </div>

      <div style="margin-bottom:15px; border-bottom:1px dashed var(--border); padding-bottom:15px;">
        <h4>2️⃣ Dosya Yükle (.txt)</h4>
        <input type="file" id="learnFileInput" accept=".txt" style="margin-bottom:5px; padding:6px;">
        <button id="uploadAndLearnBtn" class="btn-primary gradient">Dosyayı Yükle ve Öğret</button>
      </div>

      <div>
        <h4>3️⃣ Hazır Eğitim Paketleri</h4>
        <p class="muted" style="font-size:0.9em; margin-bottom:8px;">
          Modeli hızla güçlendirmek için önceden hazırlanmış hikaye setlerini yükleyebilirsiniz.
        </p>
        <button id="loadPack1Btn" class="btn-secondary gradient" style="margin-right:5px;">📦 Doğa Masalları</button>
        <button id="loadPack2Btn" class="btn-secondary gradient">📜 Efsanevi Hikayeler</button>
      </div>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:20px;">
      <button id="resetModelBtn" class="btn-danger gradient" style="flex:1;">🧹 Modeli Sıfırla</button>
      <button id="showMemoryBtn" class="btn-neutral gradient" style="flex:1;">🧠 Öğrenilenleri Gör</button>
    </div>

    <!-- 🧠 Öğrenilen Bilgiler Paneli -->
   <div id="memorySummaryOut"
     class="card"
     style="display:block; padding:12px; margin-bottom:20px;
            background:rgba(255,255,255,0.08); border-radius:12px; white-space:pre-wrap;">
  <p class="muted">Henüz öğrenme özeti yok.</p>
</div>

    <label>Kahraman:</label>
    <input id="hero" type="text" placeholder="Küçük Sincap">

    <label>Yer:</label>
    <input id="place" type="text" placeholder="Sihirli Orman">

    <label>Tema (Opsiyonel):</label>
    <input id="theme" type="text" placeholder="kayıp sır veya boş bırakabilirsiniz">

    <label>Duygu (Opsiyonel):</label>
    <input id="emotion" type="text" placeholder="mutlu, şaşkın veya boş bırakabilirsiniz">

    <button id="genStory" class="btn-primary gradient" style="margin-top:10px;">🌟 Masal Üret</button>

    <!-- Üretilen Masal -->
    <div id="storyOut" class="result-display" style="margin-top:20px;"></div>

    <!-- Son Masallar -->
    <div id="storyHistory" style="margin-top:20px;"></div>
  </div>`;
}

    // 🧮 Hesaplama Merkezi (BAC seçeneği eklenmiş)
    if (page === "calculator") {
      return `
      <div class="card fade-in calculator-container">
        <h2 style="color:var(--accent)">🧮 Hesaplama Merkezi</h2>
        <p class="muted">Bilimsel, Ohm ve Kapsamlı Birim dönüştürme araçlarına buradan erişebilirsin.</p>

        <div class="calc-tabs">
          <button class="tab-btn active" data-tool="basic-calc" onclick="AppCore.CalculatorUI.showTool('basic-calc')">Bilimsel</button>
          <button class="tab-btn" data-tool="ohm-calc" onclick="AppCore.CalculatorUI.showTool('ohm-calc')">Ohm</button>
          <button class="tab-btn" data-tool="unit-converter" onclick="AppCore.CalculatorUI.showTool('unit-converter')">Dönüştürücü</button>
        </div>

        <div id="calcContent">
          <div id="basic-calc" class="calc-tool visible">
            <input type="text" id="calcDisplay" value="0" readonly class="display">
            <div class="keypad">
              <button data-key="sin">sin</button>
              <button data-key="cos">cos</button>
              <button data-key="tan">tan</button>
              <button data-key="(">(</button>
              <button data-key=")">)</button>

              <button data-key="pi">π</button>
              <button data-key="sqrt">√x</button>
              <button data-key="^">xʸ</button>
              <button data-key="C" class="op-clear">C</button>
              <button data-key="/">÷</button>

              <button data-key="e">e</button>
              <button data-key="ln">ln</button>
              <button data-key="7">7</button>
              <button data-key="8">8</button>
              <button data-key="9">9</button>
              <button data-key="*" class="op-arith">×</button>

              <button data-key="log">log</button>
              <button data-key="4">4</button>
              <button data-key="5">5</button>
              <button data-key="6">6</button>
              <button data-key="-" class="op-arith">−</button>

              <button data-key="1">1</button>
              <button data-key="2">2</button>
              <button data-key="3">3</button>
              <button data-key="+" class="op-arith">+</button>

              <button data-key="0" style="grid-column: span 2;">0</button>
              <button data-key=".">.</button>
              <button data-key="=" class="op-equal" style="grid-column: span 2;">=</button>
            </div>
          </div>

          <div id="ohm-calc" class="calc-tool">
            <h3>Ohm Yasası (V = I × R)</h3>
            <p class="muted" style="font-size:0.8em;">Hesaplanacak alanı boş bırakın.</p>
            <input id="ohmVoltage" type="number" placeholder="Voltaj (V)">
            <input id="ohmCurrent" type="number" placeholder="Akım (I)">
            <input id="ohmResistance" type="number" placeholder="Direnç (R)">
            <div id="ohmResult" class="result-display"></div>
          </div>

          <div id="unit-converter" class="calc-tool">
            <h3>Kapsamlı Dönüştürücü</h3>
            <p class="muted" style="font-size:0.8em;">Dönüştürmek istediğiniz birim türünü seçin.</p>
            <select id="unitType">
              <option value="length">Uzunluk</option>
              <option value="weight">Ağırlık</option>
              <option value="temp">Sıcaklık</option>
              <option value="volume">Hacim</option>
              <option value="area">Alan</option>
              <option value="speed">Hız</option>
              <option value="bac" selected>Promil (Alkol)</option>
            </select>

            <div id="general-converter-form">
              <div style="display:flex; gap:10px; align-items:center; margin-top:10px;">
                <input id="unitValue" type="number" placeholder="Değer" value="100" style="flex:1;">
                <select id="unitFrom" style="flex:1;"></select>
                <span>→</span>
                <select id="unitTo" style="flex:1;"></select>
              </div>
              <button class="btn-primary" style="width:100%; margin-top:15px;" onclick="AppCore.Calculator.convertUnit()">Dönüştür</button>
            </div>

            <div id="unitResult" class="result-display"></div>
          </div>
        </div>
      </div>`;
    }

// 🤖 Sohbet Sayfası
if (page === "chat") {
  return `
  <div class="card fade-in" style="padding:20px;">
    <h2>🤖 Yapay Zekâ Sohbet</h2>

    <!-- 🧠 Chat Öğretim Alanı -->
    <div class="trainer-box" style="border:1px dashed var(--accent-2);padding:10px;border-radius:8px;margin-bottom:15px;">
      <h4>🧠 Chat Modelini Eğit</h4>
      <p class="muted" style="font-size:0.9em;">Sohbete örnek cümleler girerek yapay zekanın konuşma tarzını geliştirebilirsiniz.</p>
      <textarea id="chatLearnUser" rows="2" placeholder="Kullanıcı örneği... (örnek: Nasılsın?)"></textarea>
      <textarea id="chatLearnBot" rows="2" placeholder="Asistan cevabı... (örnek: İyiyim, sen nasılsın?)"></textarea>
      <button id="chatLearnBtn" class="btn-primary gradient" style="margin-top:5px;">Chat'e Öğret</button>
    </div>

    <!-- 💬 Chat Alanı -->
    <div id="chatLog" class="chat-log" style="max-height:400px;overflow-y:auto;border:1px solid var(--border);padding:10px;border-radius:8px;"></div>

    <!-- 🧭 Kontrol Butonları -->
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button id="clearChat" class="btn-danger" style="flex:0 0 auto;">🧹</button>
      <input id="chatInput" type="text" placeholder="Bir şey yazın..." style="flex:1;">
      <button id="chatSend" class="btn-primary gradient">Gönder</button>
      <button id="exportChat" class="btn-neutral" style="flex:0 0 auto;">💾</button>
    </div>
  </div>`;
}

    // ⚙️ Ayarlar
    if (page === "settings") {
      const theme = safeStorage.get("userTheme") || "auto";
      const fontSize = safeStorage.get("fontSize") || "normal";
      const lang = safeStorage.get("language") || "tr";
      const avatar = safeStorage.get("userAvatar") || "";
      const username = safeStorage.get("username") || "";

      return `
      <div class="settings-container card fade-in">
        <h2>⚙️ Ayarlar</h2>
        <div class="setting-item" style="text-align:center;">
          <h4>👤 Profil Avatarı & İsim</h4>
          <img id="avatarPreview" src="${avatar || 'https://placekitten.com/100/100'}"
              style="width:100px;height:100px;border-radius:50%;border:2px solid var(--accent);object-fit:cover;margin:10px;">
          <input id="usernameInput" type="text" placeholder="Kullanıcı Adı" value="${escapeHTML(username)}" style="text-align:center; margin-bottom:5px;">
          <input type="file" id="avatarUpload" accept="image/*">
          <button id="saveAvatarBtn" class="btn-primary gradient" style="margin-top:5px;">Kaydet</button>
        </div>

        <div class="setting-item">
          <label for="themeSelect">Tema:</label>
          <select id="themeSelect">
            <option value="light" ${theme === "light" ? "selected" : ""}>Açık</option>
            <option value="dark" ${theme === "dark" ? "selected" : ""}>Koyu</option>
            <option value="auto" ${theme === "auto" ? "selected" : ""}>Otomatik</option>
          </select>
        </div>

        <div class="setting-item">
          <label for="languageSelect">Dil:</label>
          <select id="languageSelect">
            <option value="tr" ${lang === "tr" ? "selected" : ""}>Türkçe</option>
            <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
          </select>
        </div>

        <div class="setting-item">
          <label for="fontSizeSelect">Yazı Boyutu:</label>
          <select id="fontSizeSelect">
            <option value="small" ${fontSize === "small" ? "selected" : ""}>Küçük</option>
            <option value="normal" ${fontSize === "normal" ? "selected" : ""}>Normal</option>
            <option value="large" ${fontSize === "large" ? "selected" : ""}>Büyük</option>
          </select>
        </div>

        <hr>
        <button id="exportDataBtn" class="btn-neutral gradient" style="margin-top:10px;">💾 Verileri Dışa Aktar</button>
        <input type="file" id="importDataInput" accept=".json" style="display:none;">
        <button id="importDataBtn" class="btn-primary gradient" style="margin-top:5px;">📂 Veri Yükle</button>
      </div>`;
    }

    // 🏠 Fallback (404)
    return `
    <div class="card fade-in">
      <h2>Sayfa bulunamadı: ${page}</h2>
      <button class="btn-primary" onclick="AppCore.Router.load('home')">Anasayfaya Dön</button>
    </div>`;
    }
    };
  /* -------------------------
     ⚙️ AYARLAR YÖNETİCİSİ (Export/Import)
  -------------------------- */
  const Settings = {
      // Tüm verileri JSON olarak dışa aktar
      exportData() {
          const data = {
              version: "v10",
              timestamp: new Date().toISOString(),
              notes: NoteManager.load(),
              posts: PostManager.load(),
              settings: {
                  userTheme: safeStorage.get("userTheme"),
                  language: safeStorage.get("language"),
                  fontSize: safeStorage.get("fontSize"),
                  username: safeStorage.get("username"),
                  userAvatar: safeStorage.get("userAvatar") // Base64 verisi
              },
              learningModelMemory: window.AppCore.LearningModel?.getRawMemory?.() 
          };

          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `insightreads_yedek_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast("💾 Veriler dışa aktarıldı!", 'success');
      },

      // JSON dosyasından verileri içe aktar
      importData(event) {
          const file = event.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = JSON.parse(e.target.result);

                  if (data.version !== "v10" && !confirm("Farklı bir sürümden veri alıyorsunuz. Devam etmek istiyor musunuz?")) {
                      return showToast("Veri içe aktarma iptal edildi.", 'neutral');
                  }

                  // Notlar
                  if (data.notes && Array.isArray(data.notes)) {
                      safeStorage.set("notes", JSON.stringify(data.notes));
                      NoteManager.renderList?.();
                  }

                  // Paylaşımlar
                  if (data.posts && Array.isArray(data.posts)) {
                      safeStorage.set(PostManager.key, JSON.stringify(data.posts));
                      PostManager.renderList?.();
                  }
                  
                  // Öğrenme Modeli
                  if (data.learningModelMemory && window.AppCore.LearningModel?.setRawMemory) {
                      window.AppCore.LearningModel.setRawMemory(data.learningModelMemory);
                  }

                  // Ayarlar
                  if (data.settings) {
                      safeStorage.set("userTheme", data.settings.userTheme);
                      safeStorage.set("language", data.settings.language);
                      safeStorage.set("fontSize", data.settings.fontSize);
                      safeStorage.set("username", data.settings.username);
                      safeStorage.set("userAvatar", data.settings.userAvatar);
                  }
                  
                  showToast("📂 Veriler başarıyla yüklendi! Sayfa yenileniyor...", 'success', 4000);
                  setTimeout(() => window.location.reload(), 1500);

              } catch (error) {
                  console.error("Veri içe aktarma hatası:", error);
                  showToast("❌ Geçersiz dosya formatı veya okuma hatası.", 'error');
              }
          };
          reader.readAsText(file);
      }
  };


/**
 * V10 Uyumlu Pages.Attach(page) Fonksiyonu
 * Sayfa yüklendikten sonra DOM elemanlarına olay dinleyicileri (event listeners) bağlar.
 */
function Attach(page) {
    // DÜZELTME 1: escapeHTML eklendi. AppCore dışında tanımlanan InsightChatModule çıkarıldı.
    const { showToast, NoteManager, PostManager, state, Calculator, CalculatorUI, Theme, escapeHTML, debounce } = AppCore || {};
    const LearningModel = window.AppCore?.LearningModel;
    const Settings = window.AppCore?.Settings;
    const InsightChatModule = window.InsightChatModule; 

    // Helper: Elementleri toplu halde yakalamak için
    const getElements = (ids) => {
        const elements = {};
        ids.forEach(id => {
            elements[id] = document.getElementById(id);
        });
        return elements;
    };

    // --- 1. NOTES ---
    if (page === "notes") {
        const { saveNote, noteTitle, noteBody } = getElements(['saveNote', 'noteTitle', 'noteBody']);

        if (!saveNote || !noteTitle || !noteBody) return console.warn(`NOTES: Eksik UI elementleri.`);

        saveNote.onclick = () => {
            const title = noteTitle.value.trim() ?? "";
            const content = noteBody.value.trim() ?? "";

            if (!content) return showToast("Boş not kaydedilmez.");

            NoteManager.add(title, content);
            showToast("Not kaydedildi.", 'success');

            // Temizleme
            noteTitle.value = '';
            noteBody.value = '';

            NoteManager.renderList?.();
        };

        NoteManager.renderList?.();
    }

    // --- 2. POSTS ---
    if (page === "posts") {
        const { addPost, postTitle, postContent, postImage } = getElements(['addPost', 'postTitle', 'postContent', 'postImage']);

        if (!addPost || !postTitle || !postContent || !postImage) return console.warn(`POSTS: Eksik UI elementleri.`);

        addPost.onclick = () => {
            const title = postTitle.value.trim();
            const content = postContent.value.trim();
            const imageFile = postImage.files?.[0] ?? null;

            if (!title && !content && !imageFile) {
                showToast("Bir içerik girin veya fotoğraf ekleyin.");
                return;
            }

            const finalize = (imgData) => {
                const postObj = {
                    id: Date.now(),
                    title,
                    content,
                    image: imgData,
                    date: new Date().toISOString(),
                    user: safeStorage.get("username", "Anonim"),
                    likedBy: [],
                    comments: []
                };
                PostManager.add(postObj);
                showToast("Paylaşım eklendi.", 'success');

                // Temizleme
                postTitle.value = "";
                postContent.value = "";
                postImage.value = "";

                PostManager.renderList?.();
            };

            if (imageFile) {
                if (imageFile.size > 2 * 1024 * 1024) {
                    return showToast("Resim boyutu 2MB'den küçük olmalıdır.", 'error');
                }
                const reader = new FileReader();
                reader.onload = () => finalize(reader.result);
                reader.onerror = () => showToast("Resim okunamadı.", 'error');
                reader.readAsDataURL(imageFile);
            } else {
                finalize(null);
            }
        };

        PostManager.renderList?.();
    }

// --- 3. MASAL SAYFASI (Gelişmiş Mantık) ---
if (page === "masal") {
    // NOT: getElements, AppCore.Pages.Attach fonksiyonunun başında tanımlanmalıdır.
    // Eğer AppCore içinde değilse, bu bloğun hemen üstüne tanımını eklemelisiniz.
    const elements = getElements([
        'learnTextarea', 'learnModelBtn', 'learnFileInput', 'uploadAndLearnBtn',
        'loadPack1Btn', 'loadPack2Btn', 'resetModelBtn', 'showMemoryBtn',
        'genStory', 'hero', 'place', 'theme', 'emotion', 'storyOut',
        'memorySummaryOut' // 👈 EKLENDİ
    ]);
    
    const storyOut = elements.storyOut; 
    const genBtn = elements.genStory;
    const heroInput = elements.hero;
    const placeInput = elements.place;
    const themeInput = elements.theme;
    const emotionInput = elements.emotion;
    const summaryOut = elements.memorySummaryOut; // 👈 YENİ DEĞİŞKEN

    // Ana elementlerin kontrolü
    if (!elements.learnModelBtn || !genBtn || !storyOut || !summaryOut) return console.warn(`MASAL: Ana UI elementleri eksik. (summaryOut veya diğerleri)`);
    if (!LearningModel) return showToast(`MASAL: Öğrenme Modeli (LearningModelV10) yüklenmedi.`, 'error');

    const MASAL_CATEGORY = "story";
    const STYLE_CATEGORIES = { 'default': MASAL_CATEGORY }; // Basitleştirildi

    // === MODEL EĞİTİMİ ===
    elements.learnModelBtn.addEventListener("click", () => {
        const text = elements.learnTextarea?.value.trim() ?? "";
        if (text.length < 50) return showToast("En az 50 karakter girin.");
        
        LearningModel.learnFromText(text, MASAL_CATEGORY, "Kullanıcı Metni");
        showToast(`📚 Masal modeli geliştirildi.`, 'success');
        elements.learnTextarea.value = "";
    });

    // Dosya yükleme mantığı
    elements.uploadAndLearnBtn?.addEventListener("click", () => elements.learnFileInput?.click());
    elements.learnFileInput?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            LearningModel.learnFromText(e.target.result, MASAL_CATEGORY, file.name);
            showToast(`'${file.name}' modeli geliştirildi.`, 'success');
        };
        reader.readAsText(file);
    });

    elements.loadPack1Btn?.addEventListener("click", () => {
        LearningModel.learnFromText("Küçük bir sincap, ormanın derinliklerinde kaybolmuştu. Amacı kayıp bir meşe palamudunu bulmaktı. Dostları ona yardım etmek için bir araya geldi ve birlikte maceralı bir yolculuğa çıktılar.", MASAL_CATEGORY, "Doğa Masalları");
        showToast(`📦 Doğa Masalları öğretildi!`, 'info');
    });
    
    elements.loadPack2Btn?.addEventListener("click", () => {
        LearningModel.learnFromText("Güneşin batmadığı topraklarda yaşayan cesur bir prenses, sihirli bir kılıç arıyordu. Kılıç, krallığını koruyacak tek şeydi. Ejderhalar ve büyücülerle dolu tehlikeli bir yolculuk onu bekliyordu.", MASAL_CATEGORY, "Efsanevi Hikayeler");
        showToast(`📜 Efsanevi Hikayeler öğretildi!`, 'info');
    });


    // === MODEL YÖNETİMİ ===
    elements.resetModelBtn?.addEventListener("click", () => {
        if (confirm("Modelin tüm öğrenilmiş hafızasını silmek istediğinizden emin misiniz?")) {
            LearningModel.resetMemory();
            storyOut.innerHTML = "";
            showToast("🧹 Öğrenme belleği sıfırlandı!", 'warning');
        }
    });
    
    // ✅ DÜZELTİLMİŞ ÖĞRENİLENLERİ GÖR FONKSİYONU
    elements.showMemoryBtn?.addEventListener("click", () => {
        if (!LearningModel) return showToast("Model bulunamadı!", "error");
    
        // Hafızayı yapılandırılmış obje olarak oku (false, ham JSON string'i istemediğimizi belirtir)
        const summary = LearningModel.getMemorySummary?.(false); 
        
        if (summaryOut) {
            // Gelen verileri al ve varsayılan değerleri atla
            const toplamKelime = summary?.toplamKelime ?? 0;
            const toplamCümle = summary?.toplamCümle ?? 0;
            const themeList = summary?.örnekTemalar?.join(', ') || 'Hiçbiri';
            const profileList = summary?.örnekProfil?.join(', ') || 'Kullanıcı Girişi';

            // Görüntü paneli (Dashboard) formatında HTML oluşturma
            const summaryHtml = `
                <div class="summary-card fade-in" style="margin-top: 0; padding: 0; border: none; border-radius: 0;">
                    <h4 style="margin-top: 0;">🧠 Öğrenme Özeti</h4>
                    <hr style="border: none; border-top: 1px solid var(--border-color-light); margin: 10px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 5px 0;"><strong>Toplam Kelime Haznesi:</strong></td><td style="padding: 5px 0; text-align: right;">${toplamKelime}</td></tr>
                        <tr><td style="padding: 5px 0;"><strong>Toplam Öğrenilen Cümle:</strong></td><td style="padding: 5px 0; text-align: right;">${toplamCümle}</td></tr>
                    </table>
                    <hr style="border: none; border-top: 1px solid var(--border-color-light); margin: 10px 0;">
                    <p style="margin-bottom: 5px;"><strong>Örnek Temalar:</strong></p>
                    <div style="font-size: 0.9em; padding-left: 10px;">${escapeHTML(themeList)}</div>
                    <p style="margin-top: 10px; margin-bottom: 5px;"><strong>Öğrenme Kaynakları:</strong></p>
                    <div style="font-size: 0.9em; padding-left: 10px;">${escapeHTML(profileList)}</div>
                </div>
            `;
            
            summaryOut.innerHTML = summaryHtml;
            summaryOut.style.display = 'block';

        } else {
            // memorySummaryOut elementi bulunamazsa (uyumsuzluk)
            alert(JSON.stringify(summary, null, 2)); 
        }

        console.log("📘 Learning Model Özeti:", summary);
        showToast("Öğrenilen bilgiler gösteriliyor.", "info");
    });
    // ❌ Hata Giderildi: Ham JSON gösterme mantığı, biçimlendirilmiş HTML ile değiştirildi.


    // === HİKAYE ÜRETİMİ ===
    genBtn.addEventListener("click", () => {
        const hero = heroInput?.value.trim() ?? "Küçük Sincap";
        const place = placeInput?.value.trim() ?? "Orman";
        const theme = themeInput?.value.trim() ?? "";
        const emotion = emotionInput?.value.trim() ?? "";
        
        if (!LearningModel.isTrained(MASAL_CATEGORY)) {
            return showToast(`Model henüz eğitilmedi. Lütfen veri yükleyin. 📚`, 'error');
        }
        
        storyOut.innerHTML = "<p class='loading'>Masal üretiliyor...</p>";

        const prompt = `Kahraman: ${hero}, Yer: ${place}${theme ? ', Tema: ' + theme : ''}. Bu unsurları kullanarak tam ve detaylı, ${emotion || 'neşeli'} bir masal yaz.`;

        // LearningModel'in basit bir Markov zinciri tabanlı generate fonksiyonu olduğu varsayılır.
        const story = LearningModel.generateFromTemplate(
            hero, // Start word
            place, // Context
            prompt, 
            emotion,
            MASAL_CATEGORY,
            { temperature: 0.8, maxSentences: 15, minSentences: 8 }
        );

        // DÜZELTME: escapeHTML kullanıldı.
        storyOut.innerHTML = `
            <div class="story-card fade-in">
                ${story.split('\n').map(p => `<p>${escapeHTML(p.trim())}</p>`).join('')}
                <button id="saveStoryBtn" class="btn-secondary gradient" style="margin-top:10px;">💾 Notlara Kaydet</button>
            </div>`;
        storyOut.style.display = 'block';

        showToast("🌟 Masal oluşturuldu!", 'success');
        // Yeni üretilen masalı modele geri öğretir
        LearningModel.learnFromText(story, MASAL_CATEGORY, "Otomatik Öğrenme: Üretilen Masal");

        document.getElementById("saveStoryBtn")?.addEventListener("click", () => {
            NoteManager.add(`Masal: ${hero}`, story);
            showToast("📝 Masal notlara kaydedildi!", 'info');
        });
    });
}

    // --- 4. CALCULATOR (GÜNCEL BAC ENTEGRASYONU) ---
    if (page === "calculator") {
        if (!Calculator || !CalculatorUI) return console.warn(`CALCULATOR: Calculator modülleri eksik.`);
        
        // Temel Hesap Makinesi tuşları, Ohm yasası inputları ve Birim Dönüştürücü/BAC formu için gerekli tüm dinleyicileri bağlar.
        // Bu tek çağrı, daha önceki hatalı 'keypad' dinleyicisini ve eski 'ohm' dinleyicisini kapsar ve düzgün çalışır.
        Calculator.attachListeners?.(debounce); 
        
        // Varsayılan olarak bilimsel hesap makinesini göster
        CalculatorUI.showTool?.('basic-calc');
    }

// --- 5. CHAT ---
if (page === "chat") {
  const { showToast } = AppCore;
  const LearningModel = AppCore?.LearningModel;

  // === CHAT MODEL ÖĞRETİCİ ===
  const learnBtn = document.getElementById("chatLearnBtn");
  if (learnBtn) {
    learnBtn.addEventListener("click", () => {
      const userText = document.getElementById("chatLearnUser")?.value.trim();
      const botText = document.getElementById("chatLearnBot")?.value.trim();

      if (!userText || !botText) {
        showToast("Lütfen hem kullanıcı hem asistan cümlesini girin.");
        return;
      }

      if (LearningModel && typeof LearningModel.learnChatExample === "function") {
        LearningModel.learnChatExample(userText, botText);
        showToast("📚 Chat modeli yeni bir örnek öğrendi!");
        document.getElementById("chatLearnUser").value = "";
        document.getElementById("chatLearnBot").value = "";
      } else {
        console.warn("⚠️ LearningModel veya learnChatExample tanımlı değil.");
        showToast("⚠️ Chat öğrenme sistemi hazır değil.");
      }
    });
  }

  // === NORMAL CHAT ===
  if (window.InsightChatModule) {
    InsightChatModule.init("chatInput", "chatSend", "chatLog", "clearChat", "exportChat");
  } else {
    console.error("CHAT: InsightChatModule yüklenemedi.");
  }
}

// --- 6. SETTINGS ---
    if (page === "settings") {
        const { themeSelect, languageSelect, fontSizeSelect, avatarUpload, saveAvatarBtn, exportDataBtn, importDataBtn, importDataInput, usernameInput } = getElements([
            'themeSelect', 'languageSelect', 'fontSizeSelect', 'avatarUpload', 'saveAvatarBtn', 'exportDataBtn', 'importDataBtn', 'importDataInput', 'usernameInput'
        ]);

        // Tema, Dil ve Yazı boyutu değişimleri
        themeSelect?.addEventListener("change", e => Theme.set(e.target.value));
        languageSelect?.addEventListener("change", e => {
            safeStorage.set("language", e.target.value);
            showToast("Dil değiştirildi: " + e.target.value);
        });
        fontSizeSelect?.addEventListener("change", e => {
            Theme.setFontSize(e.target.value);
            showToast("Yazı boyutu güncellendi");
        });

        // Avatar & Kullanıcı adı
        saveAvatarBtn?.addEventListener("click", () => {
            const file = avatarUpload?.files?.[0];
            const newUsername = usernameInput?.value.trim() || "Anonim";

            safeStorage.set("username", newUsername);
            state.username = newUsername;

            const finalize = (base64Data) => {
                if (base64Data) {
                    safeStorage.set("userAvatar", base64Data);
                    document.getElementById("avatarPreview").src = base64Data;
                }
                showToast("👤 Profil güncellendi!");
            };

            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    showToast("Resim boyutu 2MB'den küçük olmalıdır.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => finalize(reader.result);
                reader.onerror = () => {
                    showToast("Resim okunamadı.");
                    finalize(null);
                };
                reader.readAsDataURL(file);
            } else {
                finalize(null);
            }
        });

        // Veri Yönetimi
        exportDataBtn?.addEventListener("click", Settings?.exportData);
        importDataBtn?.addEventListener("click", () => importDataInput?.click());
        importDataInput?.addEventListener("change", Settings?.importData);
    } // ✅ settings if bloğu sonu
} // ✅ Attach fonksiyonu sonu

/* ------------------------------------------
   🔗 Attach fonksiyonunu Pages objesine bağla
------------------------------------------ */
Pages.attach = Attach;

/* ==========================================================
   🚀 ROUTER (SPA Yöneticisi)
========================================================== */
const Router = {
    load(page) {
        state.currentPage = page;
        safeStorage.set("lastPage", page);
        const app = document.getElementById("app-content");
        if (!app) return;

        app.classList.add("fade-out");
        setTimeout(() => {
            app.innerHTML = Pages.render(page);
            Pages.attach(page); // ✅ Artık fonksiyon erişilebilir
            app.classList.remove("fade-out");
            app.classList.add("fade-in");
        }, 150);
    }
};

/* -------------------------
   🔄 MENU TOGGLE FONKSİYONLARI
-------------------------- */
window.toggleMenu = function() {
    const menu = document.getElementById("menu");
    const overlay = document.getElementById("overlay");
    if (!menu || !overlay) return;
    const open = menu.classList.contains("open");
    if (open) {
        menu.classList.remove("open");
        overlay.style.display = "none";
    } else {
        menu.classList.add("open");
        overlay.style.display = "block";
    }
};

window.toggleSubmenu = function(event, id) {
    event.preventDefault();
    const submenu = document.getElementById(id);
    const arrow = document.getElementById(id.replace("submenu", "arrow"));
    if (!submenu) return;
    const visible = submenu.style.display === "block";
    submenu.style.display = visible ? "none" : "block";
    if (arrow) arrow.style.transform = visible ? "rotate(0deg)" : "rotate(90deg)";
};

/* -------------------------
   EXPORT (Dışa Aktarım)
-------------------------- */
return {
  state,
  safeStorage,
  escapeHTML,
  showToast,
  debounce,
  Theme,
  PostManager,
  NoteManager,
  Calculator,
  CalculatorUI,
  Pages,
  Router,
  Settings
};
})(); // ✅ AppCore IIFE SONU
window.AppCore = AppCore;
/* ==========================================================
   📱 UZUN BASMA İLE KOPYALAMA + ANİMASYONLU GERİ BİLDİRİM (V10)
   ---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  let touchTimer = null;

  // 🌟 Kopyalama işlemi (güvenli)
  async function copyToClipboard(text, label = "Metin", sourceEl = null) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        area.remove();
      }

      // 🔔 Toast bildirimi
      AppCore?.showToast?.(`✅ ${label} kopyalandı!`, "success");

      // 💫 Görsel geri bildirim animasyonu
      if (sourceEl) {
        sourceEl.classList.add("copy-flash");
        setTimeout(() => sourceEl.classList.remove("copy-flash"), 600);
      }
    } catch (e) {
      console.error("Kopyalama hatası:", e);
      AppCore?.showToast?.(`⚠️ ${label} kopyalanamadı.`, "error");
    }
  }

  // 📱 Uzun basma tespiti
  function setupLongPress(target, callback) {
    if (!target) return;
    target.addEventListener("touchstart", () => {
      touchTimer = setTimeout(callback, 700);
    });
    target.addEventListener("touchend", () => clearTimeout(touchTimer));
    target.addEventListener("touchmove", () => clearTimeout(touchTimer));
  }

  // 🔄 Hedef öğelere uygula
  function enableLongPressCopy() {
    const storyOut = document.getElementById("storyOut"); // Masal çıktısı
    const notesList = document.getElementById("notesList"); // Not kartları
    const chatLog = document.getElementById("chatLog"); // Sohbet

    // ✨ Masal çıktısı
    if (storyOut) {
      setupLongPress(storyOut, () => {
        const text = storyOut.innerText?.trim();
        if (text) copyToClipboard(text, "Masal", storyOut);
      });
    }

    // 📝 Notlar
    if (notesList) {
      notesList.querySelectorAll(".card-mini").forEach((card, i) => {
        setupLongPress(card, () => {
          const text = card.innerText?.trim();
          if (text) copyToClipboard(text, `Not ${i + 1}`, card);
        });
      });
    }

    // 💬 Sohbet
    if (chatLog) {
      setupLongPress(chatLog, () => {
        const range = document.createRange();
        range.selectNodeContents(chatLog);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        AppCore?.showToast?.("💬 Sohbet metni seçildi!");
        chatLog.classList.add("copy-flash");
        setTimeout(() => chatLog.classList.remove("copy-flash"), 600);
      });
    }
  }

  // 🔄 Sayfa güncellenirse yeniden uygula
  const observer = new MutationObserver(() => enableLongPressCopy());
  observer.observe(document.getElementById("app-content"), { childList: true, subtree: true });

  // 🔰 İlk yükleme
  enableLongPressCopy();
});

/* ==========================================================
   💬 INSIGHT CHAT MODÜLÜ (V10 ENTEGRASYON - STABİL)
   ---------------------------------------------------------- */
const InsightChatModule = (() => {
  const STORAGE_KEY = "insightChatHistory";
  let chatInput, chatSend, chatLog, clearChat, exportChat;
  
  /* -------------------------
     🧩 Yardımcı Fonksiyonlar
  ------------------------- */
  function append(role, text) {
    const AppCoreRef = window.AppCore;
    if (!AppCoreRef || !chatLog) return;

    const div = document.createElement("div");
    const isUser = role === "user";
    div.className = `chat-msg ${role} card fade-in`;

    // CSS stilleri
    div.style.alignSelf = isUser ? "flex-end" : "flex-start";
    div.style.background = isUser
      ? "linear-gradient(90deg, var(--accent), var(--accent-2))"
      : "var(--card-dark)";
    div.style.color = isUser ? "#fff" : "var(--text-dark)";
    div.style.maxWidth = "80%";
    div.style.padding = "10px 14px";
    div.style.margin = "5px 0";
    div.style.borderRadius = isUser ? "14px 14px 0 14px" : "14px 14px 14px 0";
    div.style.boxShadow = isUser ? "0 4px 12px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.2)";
    div.style.border = isUser ? "none" : "1px solid var(--border-color)";

    // AppCore'dan çekilen escapeHTML kullanılır.
    div.innerHTML = `<b>${isUser ? "🧑" : "🤖"}</b> ${AppCoreRef.escapeHTML(text)}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        JSON.parse(saved).forEach(msg => append(msg.role, msg.text));
      } catch (e) {
        console.warn("Chat geçmişi okunamadı:", e);
      }
    }
  }

  function saveHistory() {
    const msgs = Array.from(chatLog.querySelectorAll(".chat-msg")).map(el => ({
      role: el.classList.contains("user") ? "user" : "ai",
      text: (el.textContent || "").replace(/^(🧑|🤖)\s*/, "").trim()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  }

  /* -------------------------
     🧠 Mesaj Gönderme
  ------------------------- */
  function send() {
    const AppCoreRef = window.AppCore;
    const LearningModel = AppCoreRef?.LearningModel; 
    
    if (!AppCoreRef || !chatInput || !chatSend) return;

    const text = chatInput.value.trim();
    if (!text) return;

    append("user", text);
    chatInput.value = "";

    // Model öğrenmesi
    if (LearningModel) {
      LearningModel.learnFromText(text, "chat", "chat-entry");
    }

    chatSend.disabled = true;
    chatInput.placeholder = "🤖 Yanıt hazırlanıyor...";

    setTimeout(() => {
      let reply = "Hmm... bu konuda ne diyeceğimi bilemedim. Başka bir şey sormak ister misin?";
      
      const context = Array.from(chatLog.querySelectorAll(".chat-msg")).slice(-5).map(el => {
          return `${el.classList.contains("user") ? 'Kullanıcı' : 'Yapay Zeka'}: ${el.textContent.replace(/^(🧑|🤖)\s*/, "").trim()}`;
      }).join('\n');

      const fullPrompt = `Sen bir Yapay Zeka asistansın. Sohbet geçmişi:\n${context}\n\nKullanıcı sorusu: ${text}. Bu soruya kısa, ilgili ve nazik bir cevap ver.`;


      if (LearningModel && LearningModel.generateFromTemplate) {
        reply = LearningModel.generateFromTemplate(
          text.split(/\s+/).filter(t => t.length > 2).slice(-1)[0] || "Merhaba",
          text,
          fullPrompt, 
          "nötr",
          "chat",
          { temperature: 0.9, maxSentences: 4 }
        );
      } else if (LearningModel && LearningModel._generateMarkovParagraph) {
        // Fallback Markov kullanımı
        reply = LearningModel._generateMarkovParagraph(
          50,
          "chat",
          text.split(/\s+/).filter(t => t.length > 2)
        );
      }

      append("ai", reply.trim());
      saveHistory();
      chatSend.disabled = false;
      chatInput.placeholder = "Bir şey yazın...";
      chatInput.focus();
    }, 600 + Math.random() * 600);
  }
  
  /* -------------------------
     ⚙️ Başlatma
  ------------------------- */
  function init(inputId, sendId, logId, clearId, exportId) {
    chatInput = document.getElementById(inputId);
    chatSend = document.getElementById(sendId);
    chatLog = document.getElementById(logId);
    clearChat = document.getElementById(clearId);
    exportChat = document.getElementById(exportId);

    if (!chatLog || !chatInput || !chatSend) return;

    // Geçmiş yükle
    if (!localStorage.getItem(STORAGE_KEY) || chatLog.children.length === 0) {
      append("ai", "Merhaba! Ben InsightChat (V10). Sohbete hazır mısın? 👋");
      saveHistory();
    } else {
      loadHistory();
    }

    chatSend.onclick = send;
    chatInput.onkeypress = (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Varsayılan Enter hareketini engelle
        send();
      }
    };
    
    if(clearChat) {
      clearChat.onclick = () => {
        chatLog.innerHTML = "";
        localStorage.removeItem(STORAGE_KEY);
        append("ai", "Sohbet temizlendi! Yeniden başlayalım. 🧼");
        window.AppCore.showToast("Sohbet geçmişi silindi!", 'warning');
        saveHistory();
      };
    }
    
    if(exportChat) {
      exportChat.onclick = () => {
        const history = localStorage.getItem(STORAGE_KEY) || "[]";
        const blob = new Blob([history], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "InsightChat-Sohbet.json"; a.click();
        URL.revokeObjectURL(url);
        window.AppCore.showToast("💾 Sohbet dışa aktarıldı!", 'info');
      };
    }

    chatInput.focus();
    console.log("✅ InsightChatModule başarıyla başlatıldı (V10)");
  }

  return { init, send, append, saveHistory };
})();

/* ==========================================================
   🌐 Global Erişim (Modül Atamaları)
   ---------------------------------------------------------- */
// DÜZELTME: Bu atama, AppCore ve ilgili modüller yüklendikten sonra yapılmalıdır.
window.InsightChatModule = InsightChatModule; 

/* ==========================================================
   🧠 Learning Model Başlatma
   ---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const AppCoreRef = window.AppCore;
  
  // LearningModelV10'un başka bir JS dosyasından yüklendiği varsayılmıştır.
  if (typeof window.LearningModelV10 === 'function' && window.AppCore) {
    window.AppCore.LearningModel = new window.LearningModelV10({
      order: 2,
      storageKey: "lm_v10_main",
      onNotify: (msg) => window.AppCore.showToast?.("🧠 " + msg, "neutral")
    });
    console.log("✅ LearningModelV10 AppCore içine eklendi.");
  } else {
    console.warn("⚠️ LearningModelV10 sınıfı tanımsız veya AppCore yüklenmedi. Dosya sırasını kontrol edin.");
  }
})

/* ==========================================================
   🚀 BAŞLATMA (SAFE INIT)
   ---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const AppCoreRef = window.AppCore;
  if (!AppCoreRef) return console.error("KRİTİK HATA: AppCore global'e atanmadı.");

  try { 
      AppCoreRef.Theme.apply(); 
      AppCoreRef.Theme.setFontSize(AppCore.safeStorage.get("fontSize", "normal"));
  } catch (e) { console.warn("Tema/Font hatası:", e); }
  
  // Sayfa yükleme
  try { AppCoreRef.Router.load(AppCoreRef.state.currentPage || "home"); } 
  catch (e) { console.error("Router hatası:", e); }

 document.getElementById("menuButton")?.addEventListener("click", toggleMenu); 
 document.getElementById("fabButton")?.addEventListener("click", () => AppCoreRef.Router.load("calculator"));
  document.getElementById("overlay")?.addEventListener("click", () => {
    // toggleMenu'nün globalde tanımlı olduğu varsayılır.
    if (typeof toggleMenu === "function") toggleMenu(); 
  });

  console.info("🌌 AppCore tamamen yüklendi (V10 Stabil)");
});
