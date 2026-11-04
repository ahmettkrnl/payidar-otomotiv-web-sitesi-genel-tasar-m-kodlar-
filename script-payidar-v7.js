// Payidar Otomotiv - Ahmet Mustafa Kıranel (YBS öğrencisi)
// Form adımlarını sade JavaScript ile yazdım; ekstra sunucu kurmak gerekmiyor.
// İletişim bilgisi veya marka listesi değiştiğinde bu dosyadan güncelleyebilirim.
// Veriler kaydedilmez veya arka planda iletilmez; kullanıcı WhatsApp'ta gönderimi onaylar.
(() => {
  'use strict';
  // Fark etmez seçilirse numarayı iki ustadan rastgele seçiyoruz.
  const USTALAR = {
    selim: { ad: 'Selim Usta', tel: '905469523714' },
    serkan: { ad: 'Serkan Usta', tel: '905528411842' }
  };
  function hedefUsta(tercih) {
    if (tercih === 'selim' || tercih === 'serkan') return USTALAR[tercih];
    return Math.random() < 0.5 ? USTALAR.selim : USTALAR.serkan;
  }
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Üst menü ve mobil navigasyon.
  const navbar = $('#navbar');
  const nav = $('#main-nav');
  const menuToggle = $('#menuToggle');
  const updateNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  });
  $$('.main-nav a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Menüyü aç');
  }));
  $('#year').textContent = String(new Date().getFullYear());

  const overlay = $('#assistantOverlay');
  const dialog = $('.assistant-dialog');
  const closeButton = $('#assistantClose');
  const form = $('#assistantForm');
  const steps = $$('.wizard-step', form);
  const back = $('#backStep');
  const next = $('#nextStep');
  const send = $('#sendWhatsApp');
  const scrollPanel = $('.assistant-scroll');
  const messagePreview = $('#messagePreview');
  const labels = ['İletişim bilgileri', 'Araç bilgileri', 'Servis konusu', 'Ek bilgiler', 'Önizleme & gönderim'];
  let currentStep = 0;
  let previousFocus = null;

  // Model yılı, bulunduğumuz yıla göre kendiliğinden güncelleniyor.
  const yearPicker = $('#vehicleYear');
  const year = new Date().getFullYear();
  for (let y = year + 1; y >= 1980; y--) {
    const option = document.createElement('option');
    option.value = String(y);
    option.textContent = String(y);
    yearPicker.appendChild(option);
  }
  [['1980 öncesi', '1980 öncesi'], ['Bilmiyorum', 'Bilmiyorum']].forEach(([value, text]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = text; yearPicker.appendChild(option);
  });
  // Bugünden önceki tarihin tercih edilmesini engelliyoruz.
  const local = new Date();
  const localISODate = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
  $('#preferredDate').min = localISODate;

  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((element, i) => { element.hidden = i !== currentStep; });
    $('#stepCounter').textContent = `ADIM ${currentStep + 1} / ${steps.length}`;
    $('#stepTopic').textContent = labels[currentStep];
    $('#progressBar').style.width = `${(currentStep + 1) / steps.length * 100}%`;
    back.hidden = currentStep === 0;
    next.hidden = currentStep === steps.length - 1;
    send.hidden = currentStep !== steps.length - 1;
    clearStepError();
    if (currentStep === steps.length - 1) updatePreview();
    scrollPanel.scrollTop = 0;
  }
  function openAssistant(serviceName = '') {
    previousFocus = document.activeElement;
    if (serviceName) {
      const matching = $$('input[name="serviceType"]', form).find(input => input.value === serviceName);
      const selected = matching || $('input[name="serviceType"][value="Diğer"]', form);
      if (selected) selected.checked = true;
    }
    overlay.hidden = false;
    document.body.classList.add('modal-open');
    showStep(0);
    closeButton.focus();
  }
  function closeAssistant() {
    overlay.hidden = true;
    document.body.classList.remove('modal-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  $$('.js-open-assistant').forEach(el => el.addEventListener('click', () => openAssistant()));
  $$('.js-service').forEach(el => el.addEventListener('click', () => openAssistant(el.dataset.service)));
  // Kampanya butonlarında hangi teklif seçildiyse onu da mesajda belirtiriz.
  $$('.js-campaign').forEach(button => button.addEventListener('click', () => {
    const campaign = button.dataset.campaign || 'Kampanya bilgisi';
    openAssistant(campaign);
    const note = $('#issueDescription');
    // Önceden bir açıklama yazılmadıysa kullanıcıya kolaylık için hazır bir taslak koyuyoruz.
    if (!note.value.trim()) {
      const suggestions = {
        'Ücretsiz bilgisayarlı arıza ön taraması': 'Ücretsiz bilgisayarlı arıza kodu ön taraması ve olası onarım maliyeti hakkında bilgi almak istiyorum.',
        'Periyodik bakım paketi kampanyası': 'Yağ ve filtre bakımı için aracımın modeline uygun paket ve işçilik fiyatı öğrenmek istiyorum.',
        'Kampanya bilgisi': 'Tamir ve bakım kampanyaları hakkında bilgi almak istiyorum.'
      };
      note.value = suggestions[campaign] || suggestions['Kampanya bilgisi'];
    }
  }));
  closeButton.addEventListener('click', closeAssistant);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeAssistant(); });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { closeAssistant(); return; }
    if (event.key !== 'Tab') return;
    const items = $$('button:not([hidden]):not(:disabled),input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]', dialog)
      .filter(el => !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden');
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
  });
  back.addEventListener('click', () => showStep(currentStep - 1));

  const error = document.createElement('p');
  error.className = 'wizard-error'; error.id = 'wizardError'; error.setAttribute('role', 'alert');
  error.hidden = true; form.appendChild(error);
  function clearStepError() { error.hidden = true; error.textContent = ''; }
  function showStepError(text) { error.textContent = text; error.hidden = false; }
  function validateCurrentStep() {
    clearStepError();
    const step = steps[currentStep];
    if (currentStep === 2 && !$('input[name="serviceType"]:checked', form)) {
      showStepError('Devam etmek için bir servis konusu işaretleyin.');
      return false;
    }
    const fields = $$('input, select, textarea', step);
    for (const input of fields) {
      if (input.type === 'radio' || (input.type === 'checkbox' && !input.required)) continue;
      if (!input.checkValidity()) {
        showStepError('Lütfen eksik veya geçersiz alanları kontrol edin.');
        input.focus();
        input.reportValidity();
        return false;
      }
    }
    return true;
  }
  next.addEventListener('click', () => {
    if (validateCurrentStep()) showStep(currentStep + 1);
  });
  // Enter tuşu kazara form gönderimini tetiklemesin.
  form.addEventListener('submit', event => event.preventDefault());

  // Çelişkili seçimi önlüyoruz: "Uyarı yok" ve "Bilmiyorum" diğer uyarılarla birlikte işaretlenemez.
  $('#warningsOptions').addEventListener('change', event => {
    const clicked = event.target;
    if (!clicked.matches('input[type="checkbox"]') || !clicked.checked) return;
    const exclusive = ['Uyarı ışığı yok', 'Bilmiyorum'];
    const options = $$('input[name="warnings"]', form);
    if (exclusive.includes(clicked.value)) {
      options.forEach(item => { if (item !== clicked) item.checked = false; });
    } else {
      options.forEach(item => { if (exclusive.includes(item.value)) item.checked = false; });
    }
  });

  const fieldValue = name => String(form.elements.namedItem(name)?.value || '').trim();
  const formatDate = date => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    const [y, m, d] = date.split('-'); return `${d}.${m}.${y}`;
  };
  // Kullanıcının verdiği cevapları tek bir metinde topluyorum.
  // WhatsApp mesajına gitmeden önce önizleme ekranında da gösteriyorum.
  function buildMessage() {
    const warn = $$('input[name="warnings"]:checked', form).map(el => el.value).join(', ');
    const km = fieldValue('mileage');
    const lines = [
      'Merhaba Payidar Otomotiv, Payidar ile Hızlı İletişim formundan talep oluşturuyorum.',
      '',
      '👤 MÜŞTERİ',
      `Ad Soyad: ${fieldValue('fullName')}`,
      ...(fieldValue('customerPhone') ? [`Telefon: ${fieldValue('customerPhone')}`] : []),
      '',
      '🚘 ARAÇ BİLGİLERİ',
      `Marka: ${fieldValue('vehicleBrand')}`,
      `Model: ${fieldValue('vehicleModel')}`,
      ...(fieldValue('vehicleSerial') ? [`Araç seri / şasi (VIN): ${fieldValue('vehicleSerial').toUpperCase()}`] : []),
      `Yıl: ${fieldValue('vehicleYear')}`,
      `Motor: ${fieldValue('vehicleEngine') || 'Belirtilmedi'}`,
      `Yakıt: ${fieldValue('fuelType')}`,
      `Şanzıman: ${fieldValue('transmission')}`,
      ...(km ? [`Kilometre: ${Number(km).toLocaleString('tr-TR')} km`] : []),
      '',
      '🔧 SERVİS TALEBİ',
      `Konu: ${fieldValue('serviceType')}`,
      `Açıklama: ${fieldValue('issueDescription')}`,
      ...(fieldValue('symptomSince') ? [`Sorunun başlangıcı: ${fieldValue('symptomSince')}`] : []),
      ...(fieldValue('driveStatus') ? [`Araç durumu: ${fieldValue('driveStatus')}`] : []),
      ...(warn ? [`Gösterge uyarıları: ${warn}`] : []),
      ...(fieldValue('preferredDate') ? [`Tercih edilen tarih: ${formatDate(fieldValue('preferredDate'))}`] : []),
      ...(fieldValue('preferredTime') ? [`Tercih edilen saat: ${fieldValue('preferredTime')}`] : []),
      ...(fieldValue('extraNote') ? [`Ek not: ${fieldValue('extraNote')}`] : []),
      '',
      `Usta tercihi: ${fieldValue('ustaPreference') === 'random' ? 'Fark etmez (otomatik yönlendirme)' : (USTALAR[fieldValue('ustaPreference')]?.ad || 'Fark etmez')}`,
      '',
      'Uygunluk ve servis detayları hakkında bilgi alabilir miyim? Teşekkürler.'
    ];
    return lines.join('\n');
  }
  function updatePreview() { messagePreview.textContent = buildMessage(); }
  $$('input,select,textarea', form).forEach(el => {
    el.addEventListener('input', () => { if (currentStep === 4) updatePreview(); });
    el.addEventListener('change', () => { if (currentStep === 4) updatePreview(); });
  });
  // Sitedeki kısa WhatsApp bağlantıları da iki ustaya eşit olasılıkla yönlenir.
  $$('.js-whatsapp-direct').forEach(link => link.addEventListener('click', () => {
    link.href = `https://wa.me/${hedefUsta('random').tel}`;
  }));

  // Telefondaki animasyon bazen otomatik oynatılamıyor; butonla başlatılabiliyor.
  const video = $('#heroVideo');
  const videoButton = $('#videoPlayButton');
  if (video && videoButton) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animateTry() {
      if (reduceMotion) { video.pause(); videoButton.hidden = false; return; }
      const attempt = video.play();
      if (attempt && typeof attempt.then === 'function') {
        attempt.then(() => { videoButton.hidden = true; }).catch(() => { videoButton.hidden = false; });
      }
    }
    videoButton.addEventListener('click', () => {
      video.closest('.hero')?.classList.add('allow-motion');
      const attempt = video.play();
      if (attempt && typeof attempt.then === 'function') {
        attempt.then(() => { videoButton.hidden = true; }).catch(() => { videoButton.textContent = 'Video açılamadı'; });
      }
    });
    video.addEventListener('error', () => { videoButton.hidden = false; });
    video.addEventListener('playing', () => { videoButton.hidden = true; });
    window.addEventListener('pageshow', animateTry);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && video.paused) animateTry(); });
    animateTry();
  }

  // Burada mesajı gönderemem: WhatsApp açılır, son onayı kullanıcı verir.
  send.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    const message = buildMessage();
    if (!message) return;
    // WhatsApp mesajı yalnızca hazırlanır, otomatik gönderilmez.
    const usta = hedefUsta(fieldValue('ustaPreference'));
    const metin = `${message}\nMesajın yönlendirildiği usta: ${usta.ad}`;
    window.location.assign(`https://wa.me/${usta.tel}?text=${encodeURIComponent(metin)}`);
  });
})();
