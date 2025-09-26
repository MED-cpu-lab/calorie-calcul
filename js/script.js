// Calorie Buddy - RTL Arabic
// Handles: API fetch (Nutritionix), result rendering, history (localStorage), suggestions, and errors

(function () {
  'use strict';

  // DOM Elements
  const form = document.getElementById('calc-form');
  const foodInput = document.getElementById('food-input');
  const gramsInput = document.getElementById('grams-input');
  const calcBtn = document.getElementById('calc-btn');
  const suggestBtn = document.getElementById('suggest-btn');
  const formError = document.getElementById('form-error');

  const resultBox = document.getElementById('result');
  const resFood = document.getElementById('res-food');
  const resGrams = document.getElementById('res-grams');
  const resCalories = document.getElementById('res-calories');
  const resSource = document.getElementById('res-source');

  const historyList = document.getElementById('history-list');
  const totalCaloriesEl = document.getElementById('total-calories');
  const clearHistoryBtn = document.getElementById('clear-history');

  // Local dataset instead of API
  // Values are calories per 100 grams
  const LOCAL_DATASET = [
    { key: ['تفاح','تفاحة','apple'], calPer100: 52 },
    { key: ['موز','banana'], calPer100: 89 },
    { key: ['برتقال','orange'], calPer100: 47 },
    { key: ['خبز','bread'], calPer100: 265 },
    { key: ['أرز','أرز أبيض','رز','rice'], calPer100: 130 },
    { key: ['مكرونة','باستا','pasta'], calPer100: 131 },
    { key: ['دجاج','دجاج مشوي','chicken'], calPer100: 239 },
    { key: ['سمك','سمك مشوي','fish'], calPer100: 206 },
    { key: ['كسكسي','couscous'], calPer100: 112 },
    { key: ['سلطة تونسية','سلطة','salad'], calPer100: 35 },
    { key: ['زبادي','لبن','yogurt'], calPer100: 59 },
    { key: ['بيض مسلوق','بيض','egg'], calPer100: 155 },
    { key: ['لبلابي','hummus soup'], calPer100: 95 }
  ];

  // Suggestions pool used by the Suggest button
  const SUGGESTIONS = [
    { name: 'تفاح', grams: 150 },
    { name: 'موز', grams: 120 },
    { name: 'برتقال', grams: 140 },
    { name: 'خبز', grams: 60 },
    { name: 'أرز أبيض', grams: 180 },
    { name: 'مكرونة', grams: 180 },
    { name: 'دجاج مشوي', grams: 120 },
    { name: 'سمك مشوي', grams: 130 },
    { name: 'كسكسي', grams: 200 },
    { name: 'سلطة تونسية', grams: 170 },
    { name: 'زبادي', grams: 110 },
    { name: 'بيض مسلوق', grams: 60 },
    { name: 'لبلابي', grams: 250 }
  ];

  // LocalStorage key
  const STORAGE_KEY = 'calorie-buddy-history-v1';

  // Utilities
  function parseNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function setError(message) {
    formError.textContent = message || '';
  }

  function setLoading(isLoading) {
    calcBtn.disabled = isLoading;
    calcBtn.textContent = isLoading ? '... جاري الحساب' : 'احسب';
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // History handling
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to parse history', e);
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function addHistoryItem(item) {
    const items = loadHistory();
    items.unshift(item);
    saveHistory(items);
    renderHistory(items);
  }

  function clearHistory() {
    saveHistory([]);
    renderHistory([]);
  }

  function renderHistory(items) {
    historyList.innerHTML = '';
    let total = 0;
    items.forEach((entry) => {
      total += entry.calories;
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <span>${entry.food} <span class="badge">${entry.grams}غ</span></span>
        <span class="badge">${entry.calories.toFixed(0)} سعرة</span>
        <span class="badge">MB</span>
      `;
      historyList.appendChild(li);
    });
    totalCaloriesEl.textContent = total.toFixed(0);
  }

  // Local calculation instead of API
  function findFoodEntry(name) {
    const normalized = name.trim().toLowerCase();
    return LOCAL_DATASET.find(entry => entry.key.some(k => k.toLowerCase() === normalized)) || null;
  }

  async function fetchCalories(foodName, grams) {
    const match = findFoodEntry(foodName);
    if (!match) {
      throw new Error('لم يتم العثور على الأكلة في القاعدة المحلية');
    }
    const calories = (match.calPer100 * grams) / 100;
    return {
      food: foodName,
      grams,
      calories,
      source: 'MB'
    };
  }

  // UI
  function renderResult(result) {
    resFood.textContent = result.food;
    resGrams.textContent = result.grams;
    resCalories.textContent = result.calories.toFixed(0);
    resSource.textContent = result.source;
    resultBox.hidden = false;
  }

  function resetResult() {
    resultBox.hidden = true;
    resFood.textContent = '—';
    resGrams.textContent = '—';
    resCalories.textContent = '—';
    resSource.textContent = 'MB';
  }

  // Events
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    resetResult();

    const foodName = foodInput.value.trim();
    const grams = parseNumber(gramsInput.value);

    if (!foodName) {
      setError('رجاءً اكتب اسم الأكلة');
      return;
    }
    if (!Number.isFinite(grams) || grams <= 0) {
      setError('رجاءً أدخل كمية (غرام) صالحة');
      return;
    }
    if (grams > 1000) {
      setError('الحد الأقصى 1000 غرام (1 كيلو)');
      return;
    }

    try {
      setLoading(true);
      const result = await fetchCalories(foodName, grams);
      renderResult(result);
      addHistoryItem(result);
    } catch (err) {
      console.error(err);
      const msg = /not found|لم يتم العثور|foods\]\s*length\s*===\s*0/i.test(String(err))
        ? 'الأكلة غير موجودة. جرّب اسم آخر أو صيغة مختلفة.'
        : 'صار مشكل في الجلب. راجع المعطيات أو الاتصال.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  });

  suggestBtn.addEventListener('click', () => {
    const pick = pickRandom(SUGGESTIONS);
    foodInput.value = pick.name;
    gramsInput.value = String(pick.grams);
    setError('');
  });

  clearHistoryBtn.addEventListener('click', () => {
    clearHistory();
  });

  // Init
  renderHistory(loadHistory());
})();


