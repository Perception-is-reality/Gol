/* ==========================================================
   LearningModelV10 — NeuroCore Edition (xAI)
   - Düşünsün, Anlasın, Gelişsin
   - IndexedDB fallback, adaptive temperature, self-learning
   - Usage: const M = new LearningModelV10({ storageKey:'lm_v10' });
   ========================================================== */

class LearningModelV10 {
  constructor(options = {}) {
    this.order = Math.max(1, options.order || 2);
    this.storageKey = options.storageKey || 'neurocore_v10';
    this.chain = {};           // { category: { key: { next: count } } }
    this.startTokens = {};     // { category: { startKey: count } }
    this.vocab = new Map();    // Map token -> count
    this.memory = { stories: [], learnedFiles: [], stats: {}, emotions: {}, themes: {}, semanticProfiles: {} };
    this.coOccurrenceMap = {}; // { category: { token: { token2: count } } } - context relationships
    this.contextBoost = options.contextBoost || 3;
    this.saveThrottleMs = options.saveThrottleMs || 600;
    this._saveTimer = null;
    this._dbName = this.storageKey + '_db';
    this.onNotify = typeof options.onNotify === 'function' ? options.onNotify : (m) => {};
    this.maxChainKeysBeforePrune = options.maxChainKeysBeforePrune || 120000; // safe default
    this._initPersistence().then(() => this._loadFromStorage()).catch(()=> {/*silent*/});
  }

  /* ---------------- Utilities ---------------- */
  _nowISO(){ return new Date().toISOString(); }
  _notify(msg){ try{ this.onNotify(msg); }catch(e){ console.info('notify',msg); } }
  _normalizeText(text=''){ return (String(text||'')).replace(/\r\n/g,'\n').replace(/\s+/g,' ').trim(); }
  _splitSentences(text=''){
    if (!text) return [];
    const normalized = this._normalizeText(text);
    const raw = normalized.match(/[^.!?]+[.!?]?/g) || [];
    return raw.map(s => s.trim()).filter(Boolean);
  }
  _tokenize(sentence=''){
    if (!sentence) return [];
    let s = String(sentence).replace(/[“”«»]/g,'"').replace(/[\u2018\u2019]/g,"'").trim();
    const tokens = s
      .split(/\s+/)
      .map(t => t.replace(/^[^\wÇÖÜĞİçöüğı0-9']+|[^\wÇÖÜĞİçöüğı0-9']+$/g,''))
      .filter(Boolean)
      .map(t => t.toLowerCase());
    return tokens;
  }

  /* ---------------- Persistence (IndexedDB with localStorage fallback) ---------------- */
  async _initPersistence(){
    // try open indexedDB
    if (!('indexedDB' in window)) { this._useIndexedDB = false; return; }
    this._useIndexedDB = true;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) db.createObjectStore('store');
      };
      req.onsuccess = (e) => { this._idb = e.target.result; resolve(); };
      req.onerror = (e) => { this._useIndexedDB = false; reject(e); };
    });
  }
  _idbPut(key, value){
    if (this._useIndexedDB && this._idb){
      return new Promise((res,rej)=>{
        try{
          const tx = this._idb.transaction('store','readwrite');
          const store = tx.objectStore('store');
          const req = store.put(value, key);
          req.onsuccess = ()=>res(true);
          req.onerror=()=>rej(req.error);
        }catch(e){ rej(e); }
      });
    } else {
      try{ localStorage.setItem(key, JSON.stringify(value)); return Promise.resolve(true); } catch(e){ return Promise.reject(e); }
    }
  }
  _idbGet(key){
    if (this._useIndexedDB && this._idb){
      return new Promise((res,rej)=>{
        try{
          const tx = this._idb.transaction('store','readonly');
          const store = tx.objectStore('store');
          const req = store.get(key);
          req.onsuccess = ()=>res(req.result);
          req.onerror = ()=>rej(req.error);
        }catch(e){ rej(e); }
      });
    } else {
      try{ const raw = localStorage.getItem(key); return Promise.resolve(raw?JSON.parse(raw):null); } catch(e){ return Promise.reject(e); }
    }
  }

  _scheduleSave(){
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(()=> this.saveMemory(), this.saveThrottleMs);
  }

  async _loadFromStorage(){
    try{
      const saved = await this._idbGet(this.storageKey);
      if (!saved) return;
      this.chain = saved.chain || this.chain;
      this.startTokens = saved.startTokens || this.startTokens;
      this.vocab = new Map((saved.vocab || []).map(([w,c])=>[w,c]));
      this.memory = Object.assign(this.memory, saved.memory || {});
      this.coOccurrenceMap = saved.coOccurrenceMap || this.coOccurrenceMap;
      this._updateStats();
      this._notify('Memory loaded');
    }catch(e){
      console.warn('loadFromStorage failed', e);
    }
  }

  async saveMemory(){
    try{
      const toSave = {
        chain: this.chain,
        startTokens: this.startTokens,
        vocab: Array.from(this.vocab.entries()),
        memory: this.memory,
        coOccurrenceMap: this.coOccurrenceMap
      };
      await this._idbPut(this.storageKey, toSave);
      this._notify('Memory saved');
    }catch(e){
      console.warn('saveMemory failed', e);
    }
  }

  exportJSON(){
    return JSON.stringify({
      chain: this.chain,
      startTokens: this.startTokens,
      vocab: Array.from(this.vocab.entries()),
      memory: this.memory,
      coOccurrenceMap: this.coOccurrenceMap
    }, null, 2);
  }

  importJSON(jsonStr, merge = true){
    try{
      const obj = (typeof jsonStr === 'string') ? JSON.parse(jsonStr) : jsonStr;
      if (!merge){
        this.chain = obj.chain || {};
        this.startTokens = obj.startTokens || {};
        this.vocab = new Map((obj.vocab||[]).map(([w,c])=>[w,c]));
        this.memory = obj.memory || this.memory;
        this.coOccurrenceMap = obj.coOccurrenceMap || {};
      } else {
        for (const cat in obj.chain || {}){
          this.chain[cat] = this.chain[cat] || {};
          for (const k in obj.chain[cat]){
            this.chain[cat][k] = this.chain[cat][k] || {};
            for (const next in obj.chain[cat][k]){
              this.chain[cat][k][next] = (this.chain[cat][k][next]||0) + obj.chain[cat][k][next];
            }
          }
        }
        for (const cat in obj.startTokens || {}){
          this.startTokens[cat] = this.startTokens[cat] || {};
          for (const sk in obj.startTokens[cat]){
            this.startTokens[cat][sk] = (this.startTokens[cat][sk]||0) + obj.startTokens[cat][sk];
          }
        }
        (obj.vocab||[]).forEach(([w,c])=> this.vocab.set(w, (this.vocab.get(w)||0)+c));
        this.memory.learnedFiles = (this.memory.learnedFiles||[]).concat(obj.memory?.learnedFiles||[]);
        // merge coOccurrence
        for (const cat in obj.coOccurrenceMap||{}){
          this.coOccurrenceMap[cat] = this.coOccurrenceMap[cat] || {};
          for (const a in obj.coOccurrenceMap[cat]){
            this.coOccurrenceMap[cat][a] = this.coOccurrenceMap[cat][a] || {};
            for (const b in obj.coOccurrenceMap[cat][a]){
              this.coOccurrenceMap[cat][a][b] = (this.coOccurrenceMap[cat][a][b]||0) + obj.coOccurrenceMap[cat][a][b];
            }
          }
        }
      }
      this._scheduleSave();
      this._updateStats();
      this._notify('Memory imported');
    }catch(e){
      console.warn('importJSON failed', e);
      this._notify('Import failed');
    }
  }

  /* ---------------- Learning & Co-oc ---------------- */
  _ensureCategory(category){
    if (!category) category = 'default';
    if (!this.chain[category]) this.chain[category] = {};
    if (!this.startTokens[category]) this.startTokens[category] = {};
    if (!this.coOccurrenceMap[category]) this.coOccurrenceMap[category] = {};
    if (!this.memory.emotions[category]) this.memory.emotions[category] = null;
    if (!this.memory.themes[category]) this.memory.themes[category] = null;
    if (!this.memory.semanticProfiles) this.memory.semanticProfiles = this.memory.semanticProfiles || {};
  }

  _incVocab(token){
    this.vocab.set(token, (this.vocab.get(token)||0) + 1);
  }

  _addCoOccurrence(category, tokens){
    if (!tokens || tokens.length<2) return;
    const catMap = this.coOccurrenceMap[category] || (this.coOccurrenceMap[category] = {});
    for (let i=0;i<tokens.length;i++){
      const a = tokens[i];
      catMap[a] = catMap[a] || {};
      const window = 4;
      for (let j=Math.max(0,i-window); j<=Math.min(tokens.length-1,i+window); j++){
        if (i===j) continue;
        const b = tokens[j];
        catMap[a][b] = (catMap[a][b]||0) + 1;
      }
    }
  }

  learnFromText(text='', category='story', source='user'){
    if (typeof text !== 'string' || !text.trim()) return;
    this._ensureCategory(category);
    const sentences = this._splitSentences(text);
    let sentenceCount = 0;
    for (const s of sentences){
      const tokens = this._tokenize(s);
      if (tokens.length < 1) continue;
      sentenceCount++;
      const startKey = tokens.slice(0, this.order).join(' ');
      this.startTokens[category][startKey] = (this.startTokens[category][startKey]||0) + 1;
      for (let i=0;i<=tokens.length - this.order - 1;i++){
        const key = tokens.slice(i, i+this.order).join(' ');
        const next = tokens[i+this.order];
        this.chain[category][key] = this.chain[category][key] || {};
        this.chain[category][key][next] = (this.chain[category][key][next]||0) + 1;
      }
      tokens.forEach(t=> this._incVocab(t));
      this._addCoOccurrence(category, tokens);
    }
    this.memory.learnedFiles.push({ name: source, date: this._nowISO(), sentencesCount: sentenceCount, category });
    this._extractEmotionAndThemes(text, category);
    this._buildSemanticProfile(category, text);
    this._updateStats();
    this._scheduleSave();
    // prune if huge
    const totalKeys = Object.values(this.chain).reduce((a,c)=> a + Object.keys(c).length, 0);
    if (totalKeys > this.maxChainKeysBeforePrune) this.pruneChains();
  }

  learnBatch(arr = [], category = 'story', sourcePrefix = 'batch'){
    arr.forEach((t,i)=> this.learnFromText(t, category, `${sourcePrefix}-${i}`));
  }

  /* ---------------- Emotion, Theme, Semantic Profile ---------------- */
  _extractEmotionAndThemes(text='', category='story'){
    const lexicon = {
      positive: ["güzel","harika","mutlu","sevinç","şahane","hoş","beğendim","sevdim"],
      negative: ["üzgün","kötü","berbat","ağladı","kayıp","hüzün","sinir","nefret"],
      fear: ["korktu","korku","karanlık","canavar","dehşet","panik"],
      excitement: ["heyecan","macera","keşif","koştu","atıldı","coşku"]
    };
    const lower = (text||'').toLowerCase();
    const scores = { positive:0, negative:0, fear:0, excitement:0 };
    for (const [k,arr] of Object.entries(lexicon)){
      for (const w of arr) if (lower.includes(w)) scores[k] += 1;
    }
    const top = Object.keys(scores).reduce((a,b)=> scores[a]>=scores[b]?a:b);
    if (scores[top] > 0) this.memory.emotions[category] = top;
    // theme: most frequent non-stop token in text
    const tokens = this._tokenize(text).filter(t => t.length > 2);
    const stop = new Set(["ve","ile","de","da","bir","bu","o","için","ki","ama","veya","mi","ne","ben","sen"]);
    const freq = {};
    for (const t of tokens){
      if (stop.has(t)) continue;
      freq[t] = (freq[t]||0) + 1;
    }
    const sorted = Object.entries(freq).sort((a,b)=> b[1]-a[1]);
    if (sorted.length) this.memory.themes[category] = sorted[0][0];
  }

  _buildSemanticProfile(category, text){
    // combine emotion + theme + top co-occurring tokens -> small profile
    const tokens = this._tokenize(text).slice(0, 120);
    const counts = {};
    for (const t of tokens){ counts[t] = (counts[t]||0) + 1; }
    const topTokens = Object.entries(counts).sort((a,b)=> b[1]-a[1]).slice(0,8).map(x=>x[0]);
    this.memory.semanticProfiles[category] = this.memory.semanticProfiles[category] || { emotions: this.memory.emotions[category] || null, themes: this.memory.themes[category] || null, tokens: [] };
    this.memory.semanticProfiles[category].tokens = Array.from(new Set([...(this.memory.semanticProfiles[category].tokens || []), ...topTokens])).slice(0,12);
  }

  /* ---------------- Sampling helpers ---------------- */
  _sampleFromCounts(counts = {}, temperature = 1.0){
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    if (temperature <= 0.0001) return entries.reduce((a,b)=> a[1]>=b[1]?a:b)[0];
    const raw = entries.map(([t,n]) => [t, Math.pow(n, 1/temperature)]);
    const total = raw.reduce((s,[,v])=> s+v, 0);
    let r = Math.random() * total;
    for (const [t,v] of raw){
      r -= v;
      if (r <= 0) return t;
    }
    return raw[0][0];
  }

  _sampleNextWithBackoff(keyTokens = [], category='story', temperature=1.0){
    if (!this.chain[category]) return null;
    let kt = Array.from(keyTokens);
    for (let o = kt.length; o >= 1; o--){
      const key = kt.slice(-o).join(' ');
      const bucket = this.chain[category][key];
      if (bucket && Object.keys(bucket).length) return this._sampleFromCounts(bucket, temperature);
      kt = kt.slice(1);
    }
    return null;
  }

  _adaptiveTemperatureByEmotion(category){
    const e = this.memory.emotions[category] || null;
    if (!e) return 1.0;
    if (e === 'fear') return 0.8;
    if (e === 'negative') return 0.9;
    if (e === 'excitement') return 1.2;
    if (e === 'positive') return 1.1;
    return 1.0;
  }

  _smartStart(category='story', context = [], temperature = 1.0){
    const starts = this.startTokens[category] || {};
    const keys = Object.keys(starts);
    if (keys.length === 0) return null;
    if (!context || context.length === 0) return this._sampleFromCounts(starts, temperature);
    const boostCounts = {};
    for (const sk of keys){
      let score = starts[sk] || 0;
      for (const c of context){
        if (!c) continue;
        if (String(sk).includes(String(c).toLowerCase())) score += this.contextBoost;
        // also check semanticProfile tokens
        const sp = this.memory.semanticProfiles[category] || {};
        if ((sp.tokens||[]).some(t => sk.includes(t))) score += Math.floor(this.contextBoost/2);
      }
      boostCounts[sk] = score;
    }
    return this._sampleFromCounts(boostCounts, temperature);
  }

  /* ---------------- Generation ---------------- */
  generateParagraph(options = {}){
    const maxSentences = Math.max(1, options.maxSentences || 3);
    const category = options.category || 'story';
    const context = Array.isArray(options.context) ? options.context : (options.context ? [options.context] : []);
    const userTemp = (typeof options.temperature === 'number') ? options.temperature : null;
    const maxWordsPerSentence = options.maxWordsPerSentence || 70;

    if (!this.chain[category] || Object.keys(this.chain[category]).length === 0){
      return "Model bu kategoriye henüz yeterince öğrenmedi. Bana metin öğret! 🌱";
    }

    const adaptiveTemp = userTemp !== null ? userTemp : this._adaptiveTemperatureByEmotion(category);
    const out = [];
    let sentences = 0;
    let globalAttempts = 0;
    const MAX_GLOBAL = Math.max(20, maxSentences * 6);

    while (sentences < maxSentences && globalAttempts < MAX_GLOBAL){
      globalAttempts++;
      const start = this._smartStart(category, context, adaptiveTemp) || Object.keys(this.startTokens[category])[Math.floor(Math.random()*Math.max(1,Object.keys(this.startTokens[category]).length))];
      if (!start) break;
      let currentTokens = start.split(' ').filter(Boolean);
      const seen = new Set();
      let wordCount = currentTokens.length;
      let innerAttempts = 0;
      const MAX_INNER = maxWordsPerSentence * 3;

      while (wordCount < maxWordsPerSentence && innerAttempts++ < MAX_INNER){
        const next = this._sampleNextWithBackoff(currentTokens.slice(-this.order), category, adaptiveTemp);
        if (!next) break;
        if (next === '__END__') break;
        currentTokens.push(next);
        wordCount++;
        const tail = currentTokens.slice(- (this.order + 3)).join(' ');
        if (seen.has(tail)) break;
        seen.add(tail);
        if (/[.!?]$/.test(next) || next === '.') break;
      }

      let sentence = currentTokens.join(' ');
      sentence = sentence.replace(/\s+([,;:.!?])/g,'$1');
      sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
      if (!/[.!?]$/.test(sentence)) sentence += '.';
      out.push(sentence);
      sentences++;
    }

    const result = out.join(' ');
    // Self-learning: incorporate generated text back (soft)
    try{
      this.learnFromText(result, category, 'self-generated');
    }catch(e){ /* ignore learning errors */ }
    return result;
  }
// Basit kontrol: model o kategoride öğrenmiş mi?
  isTrained(category = 'story') {
    return (
      this.chain[category] &&
      Object.keys(this.chain[category]).length > 10
    );
  }
  
  generateFromTemplate(
    hero = 'Küçük kahraman',
    place = 'bir yerde',
    theme = '',
    emotion = '',
    category = 'story',
    opts = {}
  ) {
    // 1️⃣ Bağlam oluştur
    const context = [hero, place, theme, emotion]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    // 2️⃣ Giriş cümlesi
    const intro = `${hero}, ${place}'da ${theme ? theme + ' ' : ''}${emotion ? emotion + ' duygusuyla ' : ''}bir maceraya çıktı.`;

    // 3️⃣ Paragraf üretimi
    let body = this.generateParagraph(
      Object.assign(
        {
          category,
          context,
          maxSentences: 5,
          temperature: 0.85
        },
        opts
      )
    );

    // 4️⃣ Masal dili filtresi
    const storyFilter = [
      [/veri|algoritma|sistem|makine|dijital|teknolojik|kod|siber|program|ağ|işlemci|yapay/gi, 'büyü'],
      [/metal|çelik|mekanik|zırh/gi, 'ejderha'],
      [/bilgi|veritabanı/gi, 'bilgelik'],
      [/ışık sızıyor|karanlık|soğuk|sessizlik/gi, 'gökkuşağı dans ediyor'],
      [/ölüm|hiçlik|korku/gi, 'umut'],
      [/nefesin kesiliyor/gi, 'heyecanla kalbi hızla atıyor'],
    ];

    storyFilter.forEach(([regex, replace]) => {
      body = body.replace(regex, replace);
    });

    // Tekrar düzelt
    body = body.replace(/\b(\w+)\s+\1\b/g, '$1');

    // 5️⃣ Çıkış
    const outro = `Sonunda ${hero} eve ${emotion || 'mutlu'} döndü.`;

    // 6️⃣ Tam metin
    const full = `${intro} ${body} ${outro}`.replace(/\s+/g, ' ').trim();

    // 7️⃣ Belleğe kaydet
    this.memory.stories.push({
      id: Date.now(),
      hero,
      place,
      theme,
      emotion,
      category,
      text: full,
      created: this._nowISO(),
    });

    // 8️⃣ Öğrenme ve kaydetme
    this._buildSemanticProfile(category, full);
    this._updateStats();
    this._scheduleSave();

    // 9️⃣ Bildirim
    if (window.AppCore?.showToast) {
      window.AppCore.showToast('✨ Masal üretildi! 🌈', 2000);
    }

    return full;
  }

// 💬 CHAT ÖĞRETİMİ — gelişmiş sürüm (V10.1)
learnChatExample(userInput, botReply) {
  try {
    const user = String(userInput || "").trim();
    const bot = String(botReply || "").trim();
    if (!user || !bot) return false;

    // Normalize edilmiş örnek
    const text = `Kullanıcı: ${user}\nAsistan: ${bot}`;
    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Markov zincirine öğret
    this.learnFromText(normalized, "chat", "sohbet örneği");

    // Örnek hafızaya kaydedilsin
    if (!Array.isArray(this.memory.chatExamples)) this.memory.chatExamples = [];
    this.memory.chatExamples.push({
      user,
      bot,
      date: this._nowISO(),
    });

    // İstatistik ve kayıt
    this._updateStats();
    this.saveMemory();

    // Geri bildirim
    window.AppCore?.showToast?.("💬 Chat modeli yeni bir örnek öğrendi!", "neutral");
    console.log("💾 Öğrenilen Chat örneği:", { user, bot });
    return true;
  } catch (e) {
    console.warn("⚠️ Chat öğrenme hatası:", e);
    window.AppCore?.showToast?.("⚠️ Chat öğrenme sırasında hata oluştu", "error");
    return false;
  }
}
  /* ---------------- Admin & Helpers ---------------- */
  resetMemory(){
    this.chain = {};
    this.startTokens = {};
    this.vocab = new Map();
    this.memory = { stories: [], learnedFiles: [], stats: {}, emotions: {}, themes: {}, semanticProfiles: {} };
    this.coOccurrenceMap = {};
    try{ if (!this._useIndexedDB) localStorage.removeItem(this.storageKey); else this._idbPut(this.storageKey, {}); }catch(e){}
    this._notify('Memory reset');
  }

  pruneChains(maxKeep = 50000){
    // Remove least-used chain keys per category to reduce memory
    for (const cat of Object.keys(this.chain||{})){
      const entries = Object.entries(this.chain[cat] || {});
      if (entries.length <= maxKeep) continue;
      // score by total next counts
      const scored = entries.map(([k,v]) => [k, Object.values(v).reduce((a,b)=>a+b,0)]);
      scored.sort((a,b)=> a[1] - b[1]); // ascending
      const toDelete = new Set(scored.slice(0, entries.length - maxKeep).map(x=>x[0]));
      for (const k of toDelete) delete this.chain[cat][k];
    }
    this._notify('Pruned chains');
    this._scheduleSave();
  }

  setOrder(n){
    this.order = Math.max(1, Number(n) || 1);
    this._notify(`Order set to ${this.order}`);
  }

  pruneVocab(minCount = 2){
    for (const [w,c] of Array.from(this.vocab.entries())){
      if (c < minCount) this.vocab.delete(w);
    }
    this._notify('Pruned vocab');
    this._scheduleSave();
  }

  _updateStats(){
    const totalChainKeys = Object.values(this.chain || {}).reduce((acc,cat)=> acc + Object.keys(cat||{}).length, 0);
    this.memory.stats = {
      vocab: this.vocab.size,
      stories: (this.memory.stories||[]).length,
      categories: Object.keys(this.chain||{}).length,
      chainKeys: totalChainKeys,
      lastEmotion: this.memory.emotions.story || 'bilinmiyor'
    };
  }

  getStats(){ this._updateStats(); return this.memory.stats; }

getMemorySummary(asString = false) {
    try {
        this._updateStats?.(); // İstatistikleri güncelle

        const summary = {
            toplamKelime: this.vocab?.size ?? 0, // Kelime haznesi boyutu (Mevcut mantık)
            toplamCümle: 0, // AppCore'un beklediği: Yüklenen toplam cümle sayısı
            örnekTemalar: [],
            örnekProfil: [], // AppCore'un beklediği: Yüklenen kaynaklar
        };

        if (!this.memory) return asString ? JSON.stringify(summary) : summary;

        const learnedSources = new Set();
        const uniqueThemes = new Set();
        let totalSentences = 0;

        // Öğrenilen dosyalardan cümle sayısını ve kaynakları topla
        for (const file of this.memory.learnedFiles || []) {
            totalSentences += file.sentencesCount || 0;
            // Kaynak adını (name) örnek profil olarak kullan
            if (file.name && !learnedSources.has(file.name)) {
                learnedSources.add(file.name);
            }
        }
        
        // Bellekteki kategorileri (temaları) topla
        for (const cat in this.chain) {
             // Kategoride en az bir veri varsa tema olarak say
            if (Object.keys(this.chain[cat]).length > 0) { 
                uniqueThemes.add(cat);
            }
        }

        summary.toplamCümle = totalSentences;
        summary.örnekTemalar = Array.from(uniqueThemes).slice(0, 5);
        summary.örnekProfil = Array.from(learnedSources).slice(0, 5);
        
        return asString ? JSON.stringify(summary, null, 2) : summary;
    } catch (e) {
        console.warn("getMemorySummary hata:", e);
        return asString
            ? JSON.stringify({ hata: e.message })
            : { hata: e.message };
    }
}

getRawMemory() {
    return {
      chain: this.chain,
      startTokens: this.startTokens,
      vocab: Array.from(this.vocab.entries()),
      memory: this.memory,
      coOccurrenceMap: this.coOccurrenceMap
    };
  }
  /* Convenience: download memory file */
  downloadMemory(filename = 'neurocore_memory.json'){
    try{
      const data = this.exportJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      this._notify('Memory downloaded');
    }catch(e){ console.warn(e); }
  }
}
window.LearningModelV10 = LearningModelV10;
/* ========================= Usage Example =========================
const M = new LearningModelV10({ order: 2, storageKey: 'lm_v10_test', onNotify: msg => console.log('NOTIFY:', msg) });
M.learnFromText("Küçük bir sincap ormanda kırmızı bir palamut buldu. Onu yuvasına taşıdı.", 'story', 'ilk');
console.log(M.generateFromTemplate("Küçük Sincap","Sihirli Orman","kayıp sır","şaşkın","story"));
console.log(M.getStats());
M.downloadMemory();
=============================================== */
