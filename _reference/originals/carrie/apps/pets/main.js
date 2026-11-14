import confetti from 'canvas-confetti';

// --- CERTIFICATE TYPES CONFIG ---
const CERT_TYPES = {
  birth: {
    title: 'BIRTH CERTIFICATE',
    icon: '🐾',
    preamble: 'This certifies with absolute joy that the following beloved companion has officially entered our world:',
    dateLabel: 'DATE OF BIRTH',
    vowDefault: 'Bound by endless love, unconditional cuddles, treat privileges, and eternal happiness.'
  },
  gotcha: {
    title: 'OFFICIAL ADOPTION CERTIFICATE',
    icon: '🏠',
    preamble: 'This certifies that the following cherished soul has officially entered their forever home and family:',
    dateLabel: 'GOTCHA DAY DATE',
    vowDefault: 'Promised lifelong shelter, unlimited belly rubs, warm blankets, and infinite love.'
  },
  birthday: {
    title: 'BIRTHDAY CELEBRATION CERTIFICATE',
    icon: '🎂',
    preamble: 'In joyous commemoration of another magnificent year of spreading happiness and tail wags:',
    dateLabel: 'BIRTHDAY DATE',
    vowDefault: 'Celebrating another year of being our favorite reason to smile every single day.'
  },
  goodboy: {
    title: 'HONOR OF 100% GOOD PET',
    icon: '🌟',
    preamble: 'Officially conferring the highest honor of excellence for extraordinary cuddles, loyalty, and companionship:',
    dateLabel: 'DATE CONFERRED',
    vowDefault: 'Certified 100% good, zero bad habits, full pardon for any stolen socks or table scraps.'
  },
  citizen: {
    title: 'SOVEREIGN PET CITIZENSHIP',
    icon: '👑',
    preamble: 'By decree of the household realm, officially recognized as Supreme Ruler of the Couch and Heart:',
    dateLabel: 'ACCESSION DATE',
    vowDefault: 'Entitled to the softest spot in bed, supreme window-watching rights, and royal affection.'
  }
};

const SPECIES_ICONS = {
  'Dog': '🐕',
  'Cat': '🐈',
  'Bunny': '🐇',
  'Bird': '🦜',
  'Hamster': '🐹',
  'Horse': '🐎',
  'Ferret': '🐾',
  'Reptile': '🦎'
};

const SEAL_ICONS = {
  'gold-paw': '🐾',
  'royal-crest': '👑',
  'star-ribbon': '🌟',
  'heart-shield': '❤️'
};

// Curated Royalty-Free Stock Pet Photos (Unsplash optimized CDNs)
const STOCK_PETS = [
  {
    name: 'Golden Puppy',
    species: 'Dog',
    breed: 'Golden Retriever',
    url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Calico Kitten',
    species: 'Cat',
    breed: 'Calico Cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'French Bulldog',
    species: 'Dog',
    breed: 'French Bulldog',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'British Shorthair',
    species: 'Cat',
    breed: 'British Shorthair',
    url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Fluffy Bunny',
    species: 'Bunny',
    breed: 'Holland Lop Rabbit',
    url: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Happy Beagle',
    species: 'Dog',
    breed: 'Beagle',
    url: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Australian Shepherd',
    species: 'Dog',
    breed: 'Aussie Mix',
    url: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Cockatiel Bird',
    species: 'Bird',
    breed: 'Cockatiel',
    url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=400&q=80'
  }
];

// Presets
const PRESETS = {
  dog: {
    type: 'birth',
    theme: 'gold',
    name: 'Barnaby Bear',
    species: 'Dog',
    breed: 'Golden Retriever',
    date: '2024-04-18',
    gender: 'Good Boy',
    guardians: 'Carrie & Family',
    location: 'San Francisco, California',
    vow: 'Bound by endless love, unconditional cuddles, treat privileges, and eternal happiness.',
    seal: 'gold-paw',
    photoUrl: STOCK_PETS[0].url
  },
  cat: {
    type: 'gotcha',
    theme: 'emerald',
    name: 'Cleo Clementine',
    species: 'Cat',
    breed: 'Calico Rescue',
    date: '2023-10-12',
    gender: 'Good Girl',
    guardians: 'Carrie & Kyle',
    location: 'Portland, Oregon',
    vow: 'Promised lifelong sunbeam napping rights, gourmet salmon feasts, and endless affection.',
    seal: 'heart-shield',
    photoUrl: STOCK_PETS[1].url
  },
  birthday: {
    type: 'birthday',
    theme: 'party',
    name: 'Winston Churchill',
    species: 'Dog',
    breed: 'French Bulldog',
    date: '2021-08-04',
    gender: 'Good Boy',
    guardians: 'Carrie, Maya & Crew',
    location: 'Austin, Texas',
    vow: 'Happy 5th Birthday to the loudest snorer and sweetest boy in the universe!',
    seal: 'star-ribbon',
    photoUrl: STOCK_PETS[2].url
  },
  goodboy: {
    type: 'goodboy',
    theme: 'royal',
    name: 'Archie',
    species: 'Dog',
    breed: 'Beagle Hound',
    date: '2022-03-15',
    gender: 'Good Boy',
    guardians: 'The McAuliffe Family',
    location: 'Boston, Massachusetts',
    vow: 'Certified 100% Good Boy. Absolute master of howling and neighborhood sniffing adventures.',
    seal: 'royal-crest',
    photoUrl: STOCK_PETS[5].url
  }
};

// --- DOM ELEMENTS ---
const certTypeSelect = document.getElementById('certTypeSelect');
const themePicker = document.getElementById('themePicker');
const petNameInput = document.getElementById('petNameInput');
const petSpeciesSelect = document.getElementById('petSpeciesSelect');
const petBreedInput = document.getElementById('petBreedInput');
const eventDateInput = document.getElementById('eventDateInput');
const dateLabel = document.getElementById('dateLabel');
const petGenderSelect = document.getElementById('petGenderSelect');
const photoUploadInput = document.getElementById('photoUploadInput');
const uploadTriggerBtn = document.getElementById('uploadTriggerBtn');
const quickGalleryBtn = document.getElementById('quickGalleryBtn');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const guardianInput = document.getElementById('guardianInput');
const locationInput = document.getElementById('locationInput');
const certNumberInput = document.getElementById('certNumberInput');
const regenCertNumBtn = document.getElementById('regenCertNumBtn');
const vowInput = document.getElementById('vowInput');
const sealTypeSelect = document.getElementById('sealTypeSelect');

const presetsBtn = document.getElementById('presetsBtn');
const presetsMenu = document.getElementById('presetsMenu');
const galleryBtn = document.getElementById('galleryBtn');
const galleryModal = document.getElementById('galleryModal');
const closeGalleryBtn = document.getElementById('closeGalleryBtn');
const stockGalleryGrid = document.getElementById('stockGalleryGrid');

const certViewport = document.getElementById('certViewport');
const certificateScaleWrapper = document.getElementById('certificateScaleWrapper');
const zoomLevelTag = document.getElementById('zoomLevelTag');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');

const printBtn = document.getElementById('printBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Certificate Display Elements
const certificateContainer = document.getElementById('certificateContainer');
const certDisplayNumber = document.getElementById('certDisplayNumber');
const certDisplayTitle = document.getElementById('certDisplayTitle');
const certTitleIcon = document.getElementById('certTitleIcon');
const certDisplayPreamble = document.getElementById('certDisplayPreamble');
const certPetPhoto = document.getElementById('certPetPhoto');
const certSpeciesSilhouette = document.getElementById('certSpeciesSilhouette');
const certDisplayName = document.getElementById('certDisplayName');
const certDisplayGender = document.getElementById('certDisplayGender');
const certDisplayBreed = document.getElementById('certDisplayBreed');
const certDetailDateLabel = document.getElementById('certDetailDateLabel');
const certDisplayDate = document.getElementById('certDisplayDate');
const certDisplayLocation = document.getElementById('certDisplayLocation');
const certDisplayGuardians = document.getElementById('certDisplayGuardians');
const certDisplayVow = document.getElementById('certDisplayVow');
const certGuardianSig = document.getElementById('certGuardianSig');
const certPetSig = document.getElementById('certPetSig');
const sealEmblemIcon = document.getElementById('sealEmblemIcon');
const exportCanvas = document.getElementById('exportCanvas');

let currentTheme = 'gold';
let activePhotoSource = null;
let currentScale = 1.0;
let isManualZoom = false;

// --- INITIALIZATION ---
function init() {
  setupEventListeners();
  renderStockGallery();
  updateCertificate();
  setupDynamicAutoFit();
}

// --- DYNAMIC AUTO-FIT & RESIZE ENGINE ---
function calculateFitScale() {
  if (!certViewport || !certificateScaleWrapper) return 1.0;
  
  // Available container bounds (leaving comfortable padding)
  const availableWidth = certViewport.clientWidth - 32;
  const availableHeight = certViewport.clientHeight - 32;

  // Base certificate size
  const baseWidth = 960;
  const baseHeight = 680;

  if (availableWidth <= 0 || availableHeight <= 0) return 1.0;

  // Fit ratio
  const scaleX = availableWidth / baseWidth;
  const scaleY = availableHeight / baseHeight;
  
  // Choose scale that fits both horizontally and vertically
  const fitScale = Math.min(scaleX, scaleY);

  // Clamp scale between 0.35 and 1.25
  return Math.max(0.35, Math.min(fitScale, 1.25));
}

function applyScale(scale) {
  currentScale = scale;
  certificateScaleWrapper.style.transform = `scale(${scale.toFixed(3)})`;
  zoomLevelTag.textContent = `Scale: ${Math.round(scale * 100)}%`;
}

function setupDynamicAutoFit() {
  // Initial scale
  applyScale(calculateFitScale());

  // Debounced resize handler
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (isManualZoom) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyScale(calculateFitScale());
    }, 50);
  });

  // Zoom Toolbar Buttons
  zoomResetBtn.addEventListener('click', () => {
    isManualZoom = false;
    applyScale(calculateFitScale());
  });

  zoomInBtn.addEventListener('click', () => {
    isManualZoom = true;
    applyScale(Math.min(currentScale + 0.1, 1.5));
  });

  zoomOutBtn.addEventListener('click', () => {
    isManualZoom = true;
    applyScale(Math.max(currentScale - 0.1, 0.35));
  });
}

function setupEventListeners() {
  [petNameInput, petBreedInput, eventDateInput, guardianInput, locationInput, certNumberInput, vowInput].forEach(el => {
    el.addEventListener('input', updateCertificate);
  });

  certTypeSelect.addEventListener('change', handleTypeChange);
  petSpeciesSelect.addEventListener('change', updateCertificate);
  petGenderSelect.addEventListener('change', updateCertificate);
  sealTypeSelect.addEventListener('change', updateCertificate);

  // Theme selection
  themePicker.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      themePicker.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setTheme(btn.dataset.theme);
    });
  });

  // Photo uploads & gallery
  uploadTriggerBtn.addEventListener('click', () => photoUploadInput.click());
  photoUploadInput.addEventListener('change', handlePhotoUpload);
  quickGalleryBtn.addEventListener('click', () => openGalleryModal());
  galleryBtn.addEventListener('click', () => openGalleryModal());
  closeGalleryBtn.addEventListener('click', () => closeGalleryModal());
  galleryModal.addEventListener('click', (e) => {
    if (e.target === galleryModal) closeGalleryModal();
  });
  removePhotoBtn.addEventListener('click', removePhoto);

  // Cert Number generator
  regenCertNumBtn.addEventListener('click', () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    certNumberInput.value = `PAW-2026-${randomNum}`;
    updateCertificate();
  });

  // Presets dropdown
  presetsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    presetsMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', () => presetsMenu.classList.add('hidden'));

  presetsMenu.querySelectorAll('.dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (preset) applyPreset(preset);
    });
  });

  // Actions
  printBtn.addEventListener('click', () => window.print());
  downloadBtn.addEventListener('click', exportCertificatePNG);
}

function renderStockGallery() {
  stockGalleryGrid.innerHTML = STOCK_PETS.map((pet, idx) => `
    <div class="stock-item" data-idx="${idx}">
      <img src="${pet.url}" alt="${pet.name}" class="stock-avatar" loading="lazy">
      <span class="stock-label">${pet.name}</span>
    </div>
  `).join('');

  stockGalleryGrid.querySelectorAll('.stock-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = item.dataset.idx;
      const pet = STOCK_PETS[idx];
      setPetPhoto(pet.url);
      petSpeciesSelect.value = pet.species;
      petBreedInput.value = pet.breed;
      closeGalleryModal();
      updateCertificate();
    });
  });
}

function openGalleryModal() {
  galleryModal.classList.remove('hidden');
}

function closeGalleryModal() {
  galleryModal.classList.add('hidden');
}

function handleTypeChange() {
  const typeKey = certTypeSelect.value;
  const config = CERT_TYPES[typeKey] || CERT_TYPES.birth;
  
  dateLabel.textContent = config.dateLabel;
  certDetailDateLabel.textContent = config.dateLabel.toUpperCase();
  vowInput.value = config.vowDefault;

  updateCertificate();
}

function setTheme(themeKey) {
  currentTheme = themeKey;
  certificateContainer.className = `certificate-wrapper theme-${themeKey} cert-${certTypeSelect.value}`;
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    setPetPhoto(event.target.result);
  };
  reader.readAsDataURL(file);
}

function setPetPhoto(srcUrl) {
  activePhotoSource = srcUrl;
  certPetPhoto.crossOrigin = 'anonymous';
  certPetPhoto.src = srcUrl;
  certPetPhoto.classList.remove('hidden');
  certSpeciesSilhouette.classList.add('hidden');
  removePhotoBtn.classList.remove('hidden');
}

function removePhoto() {
  activePhotoSource = null;
  certPetPhoto.src = '';
  certPetPhoto.classList.add('hidden');
  certSpeciesSilhouette.classList.remove('hidden');
  removePhotoBtn.classList.add('hidden');
  photoUploadInput.value = '';
}

function formatDateString(isoDateStr) {
  if (!isoDateStr) return 'April 18, 2024';
  try {
    const [year, month, day] = isoDateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (err) {
    return isoDateStr;
  }
}

function updateCertificate() {
  const typeKey = certTypeSelect.value;
  const config = CERT_TYPES[typeKey] || CERT_TYPES.birth;

  // Header texts
  certDisplayNumber.textContent = `NO. ${certNumberInput.value.trim() || 'PAW-2026-98102'}`;
  certDisplayTitle.textContent = config.title;
  certTitleIcon.textContent = config.icon;
  certDisplayPreamble.textContent = config.preamble;

  // Pet Info
  const petName = petNameInput.value.trim() || 'Beloved Pet';
  certDisplayName.textContent = petName;
  certDisplayGender.textContent = petGenderSelect.value;
  certDisplayBreed.textContent = petBreedInput.value.trim() || 'Companion';

  // Species silhouette fallback
  const species = petSpeciesSelect.value;
  certSpeciesSilhouette.textContent = SPECIES_ICONS[species] || '🐾';

  // Details
  certDisplayDate.textContent = formatDateString(eventDateInput.value);
  certDisplayLocation.textContent = locationInput.value.trim() || 'San Francisco, CA';
  const guardians = guardianInput.value.trim() || 'Carrie & Family';
  certDisplayGuardians.textContent = guardians;

  // Vow
  const vow = vowInput.value.trim();
  certDisplayVow.textContent = vow ? `“${vow}”` : '';

  // Signatures
  certGuardianSig.textContent = guardians;
  const firstWord = petName.split(' ')[0];
  certPetSig.textContent = `${firstWord} 🐾`;

  // Seal
  const sealKey = sealTypeSelect.value;
  sealEmblemIcon.textContent = SEAL_ICONS[sealKey] || '🐾';
}

function applyPreset(preset) {
  certTypeSelect.value = preset.type;
  handleTypeChange();

  setTheme(preset.theme);
  themePicker.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === preset.theme);
  });

  petNameInput.value = preset.name;
  petSpeciesSelect.value = preset.species;
  petBreedInput.value = preset.breed;
  eventDateInput.value = preset.date;
  petGenderSelect.value = preset.gender;
  guardianInput.value = preset.guardians;
  locationInput.value = preset.location;
  vowInput.value = preset.vow;
  sealTypeSelect.value = preset.seal;

  if (preset.photoUrl) {
    setPetPhoto(preset.photoUrl);
  } else {
    removePhoto();
  }

  updateCertificate();

  confetti({
    particleCount: 50,
    spread: 50,
    origin: { y: 0.5 }
  });
}

// --- HIGH RESOLUTION CANVAS EXPORT (2400 x 1700) ---
function exportCertificatePNG() {
  const canvas = exportCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  const themeColors = {
    gold: {
      bg: '#fffdfa',
      borderOuter: '#c59741',
      borderInner: '#9f7220',
      textPrimary: '#241e14',
      textAccent: '#8c6218',
      seal1: '#fce99f',
      seal2: '#d49f3b',
      seal3: '#9e6f1a'
    },
    emerald: {
      bg: '#f5f9f6',
      borderOuter: '#2d6a4f',
      borderInner: '#1b4332',
      textPrimary: '#132a20',
      textAccent: '#2d6a4f',
      seal1: '#52b788',
      seal2: '#2d6a4f',
      seal3: '#1b4332'
    },
    party: {
      bg: '#fffbfd',
      borderOuter: '#f43f5e',
      borderInner: '#8b5cf6',
      textPrimary: '#4c1d95',
      textAccent: '#e11d48',
      seal1: '#fde047',
      seal2: '#fb923c',
      seal3: '#f43f5e'
    },
    royal: {
      bg: '#f8fafc',
      borderOuter: '#1e3a8a',
      borderInner: '#3b82f6',
      textPrimary: '#0f172a',
      textAccent: '#1d4ed8',
      seal1: '#93c5fd',
      seal2: '#2563eb',
      seal3: '#1e3a8a'
    }
  };

  const colors = themeColors[currentTheme] || themeColors.gold;

  // 1. Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // Guilloche Banknote Arcs (decorative fine lines)
  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.15;
  for (let r = 200; r < 1400; r += 28) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // 2. Borders
  ctx.lineWidth = 14;
  ctx.strokeStyle = colors.borderOuter;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  ctx.lineWidth = 3;
  ctx.strokeRect(78, 78, width - 156, height - 156);

  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.borderInner;
  ctx.strokeRect(100, 100, width - 200, height - 200);

  // Corner Rosettes
  ctx.font = '56px serif';
  ctx.fillStyle = colors.borderOuter;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❦', 132, 132);
  ctx.fillText('❦', width - 132, 132);
  ctx.fillText('❦', 132, height - 132);
  ctx.fillText('❦', width - 132, height - 132);

  // 3. Header
  const typeKey = certTypeSelect.value;
  const config = CERT_TYPES[typeKey] || CERT_TYPES.birth;

  ctx.fillStyle = colors.textAccent;
  ctx.font = '700 28px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText('• OFFICIAL COMPANION REGISTRY •', width / 2, 170);

  ctx.font = '800 24px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`NO. ${certNumberInput.value.trim()}`, width - 140, 170);

  // Title
  ctx.fillStyle = colors.textPrimary;
  ctx.font = '900 68px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText(config.title, width / 2, 260);

  // Rule
  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 250, 305);
  ctx.lineTo(width / 2 - 50, 305);
  ctx.stroke();

  ctx.font = '36px sans-serif';
  ctx.fillText(config.icon, width / 2, 305);

  ctx.beginPath();
  ctx.moveTo(width / 2 + 50, 305);
  ctx.lineTo(width / 2 + 250, 305);
  ctx.stroke();

  // Preamble
  ctx.fillStyle = colors.textAccent;
  ctx.font = 'italic 34px "Playfair Display", serif';
  ctx.fillText(config.preamble, width / 2, 375);

  // 4. Pet Name
  const petName = petNameInput.value.trim() || 'Beloved Pet';
  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 96px "Playfair Display", serif';
  ctx.fillText(petName, width / 2, 510);

  // Subtitle: Title & Breed
  const subText = `${petGenderSelect.value}  •  ${petBreedInput.value.trim() || 'Companion'}`;
  ctx.fillStyle = colors.textAccent;
  ctx.font = '700 32px Cinzel, serif';
  ctx.fillText(subText, width / 2, 580);

  // 5. Details Section
  const detailBoxY = 660;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(180, detailBoxY, width - 360, 260);
  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 2;
  ctx.strokeRect(180, detailBoxY, width - 360, 260);

  // Labels & Values
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.textAccent;
  ctx.font = '800 24px Cinzel, serif';
  ctx.fillText(config.dateLabel, 230, detailBoxY + 50);
  ctx.fillText('HOMETOWN & LOCATION', width / 2 + 50, detailBoxY + 50);

  ctx.fillStyle = colors.textPrimary;
  ctx.font = '600 38px "Playfair Display", serif';
  ctx.fillText(formatDateString(eventDateInput.value), 230, detailBoxY + 105);
  ctx.fillText(locationInput.value.trim() || 'San Francisco, CA', width / 2 + 50, detailBoxY + 105);

  // Guardian
  ctx.strokeStyle = colors.borderOuter;
  ctx.beginPath();
  ctx.moveTo(230, detailBoxY + 145);
  ctx.lineTo(width - 230, detailBoxY + 145);
  ctx.stroke();

  ctx.fillStyle = colors.textAccent;
  ctx.font = '800 22px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL GUARDIAN(S) & PARENTS', width / 2, detailBoxY + 185);

  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 44px "Playfair Display", serif';
  ctx.fillText(guardianInput.value.trim() || 'Carrie & Family', width / 2, detailBoxY + 235);

  // 6. Vow Motto
  const vow = vowInput.value.trim();
  if (vow) {
    ctx.fillStyle = colors.textAccent;
    ctx.font = 'italic 30px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`“${vow}”`, width / 2, 1010);
  }

  // 7. Signatures & Embossed Seal
  const footerY = 1350;

  // Guardian Signature
  ctx.fillStyle = colors.textPrimary;
  ctx.font = '64px Caveat, cursive';
  ctx.textAlign = 'center';
  ctx.fillText(guardianInput.value.trim() || 'Carrie', 480, footerY);

  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, footerY + 20);
  ctx.lineTo(660, footerY + 20);
  ctx.stroke();

  ctx.fillStyle = colors.textAccent;
  ctx.font = '800 20px Cinzel, serif';
  ctx.fillText('PROUD GUARDIAN / PARENT', 480, footerY + 55);

  // Pet Signature
  const firstWord = petName.split(' ')[0];
  ctx.fillStyle = colors.textAccent;
  ctx.font = '64px Caveat, cursive';
  ctx.fillText(`${firstWord} 🐾`, width - 480, footerY);

  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width - 660, footerY + 20);
  ctx.lineTo(width - 300, footerY + 20);
  ctx.stroke();

  ctx.fillStyle = colors.textAccent;
  ctx.font = '800 20px Cinzel, serif';
  ctx.fillText('PET SIGNATURE & PAW APPROVAL', width - 480, footerY + 55);

  // Central Embossed Seal
  const sealX = width / 2;
  const sealY = footerY + 10;
  const sealRadius = 110;

  const sealGradient = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, sealRadius);
  sealGradient.addColorStop(0, colors.seal1);
  sealGradient.addColorStop(0.7, colors.seal2);
  sealGradient.addColorStop(1, colors.seal3);

  ctx.fillStyle = sealGradient;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Seal content
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText('★ ★ ★', sealX, sealY - 45);

  ctx.font = '54px sans-serif';
  ctx.fillText(SEAL_ICONS[sealTypeSelect.value] || '🐾', sealX, sealY + 8);

  ctx.font = '800 18px Cinzel, serif';
  ctx.fillText('SEAL OF LOVE', sealX, sealY + 55);

  // Download Trigger
  const link = document.createElement('a');
  link.download = `${petName.replace(/\s+/g, '_')}_Official_Certificate.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  // Confetti
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 }
  });
}

// Initialize on DOM ready
init();
