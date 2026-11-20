const src = n => `images/${n}.jpg`;

/* ---------- Simple page switching (uses the #hash in the address) ---------- */
/* ---------- Dish photos (tap a dish to see it). Add more: "Dish name": "file-name-without-.jpg" ---------- */
const DISH = {
  "Surfside Nuggets": "food-nuggets", "Saltwater Strings": "food-strings", "Pierside Fish & Chips": "food-fishchips",
  "Gull's Wing Plate": "food-wings", "Tidal Crunch Calamari": "food-calamari",
  "Fisherman's Crust": "food-pizza-crust", "Sunset Spice Pepperoni": "food-pizza-pepperoni",
  "The Coast House Tuyo Special": "food-pizza-tuyo", "Sailor's Crunch": "food-pizza-sailor",
  "Islander's Choice": "food-pizza-islander", "Crust & Cheese": "food-pizza-cheese", "Pizza Sandbar": "food-pizza-sandbar",
  "Fisherman's Wharf": "food-pasta-wharf", "Anchor's Rest": "food-pasta-anchor", "Crimson Coast Classic": "food-pasta-crimson"
};
function dishPic(n) {
  return `<div class="ph">${DISH[n] ? `<img src="${src(DISH[n])}" alt="${n}" loading="lazy">` : '<div class="soon">Photo coming soon</div>'}</div>`;
}

const views = [...document.querySelectorAll('.view')];
const siteHeader = document.querySelector('.site-header');
const primaryNav = document.getElementById('primaryNav');
const menuToggle = document.getElementById('menuToggle');
function setMobileNavOpen(open) {
  primaryNav.classList.toggle('is-open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (open) siteHeader.classList.remove('is-hidden');
}
menuToggle.addEventListener('click', () => {
  setMobileNavOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});
primaryNav.addEventListener('click', e => {
  if (e.target.closest('a')) setMobileNavOpen(false);
});
document.addEventListener('click', e => {
  if (menuToggle.getAttribute('aria-expanded') === 'true' && !siteHeader.contains(e.target)) setMobileNavOpen(false);
});
let lastHeaderScrollY = window.scrollY;
function updateHeaderOnScroll() {
  const currentScrollY = window.scrollY;
  const isScrollingDown = currentScrollY > lastHeaderScrollY;
  const menuOpen = menuToggle.getAttribute('aria-expanded') === 'true';

  siteHeader.classList.toggle('is-scrolled', currentScrollY > 24 || document.body.classList.contains('inner'));
  if (currentScrollY <= 24 || isScrollingDown === false || menuOpen) {
    siteHeader.classList.remove('is-hidden');
  } else if (isScrollingDown && currentScrollY - lastHeaderScrollY > 5 && currentScrollY > 96) {
    siteHeader.classList.add('is-hidden');
  }

  lastHeaderScrollY = Math.max(currentScrollY, 0);
}
addEventListener('scroll', updateHeaderOnScroll, { passive: true });
updateHeaderOnScroll();

const scrollUpButton = document.querySelector('.scroll-up');
const scrollDownButton = document.querySelector('.scroll-down');

function updateScrollButtons() {
  const atTop = window.scrollY <= 24;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
  scrollUpButton.classList.toggle('is-hidden', atTop);
  scrollDownButton.classList.toggle('is-hidden', atBottom);
}

scrollUpButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
scrollDownButton.addEventListener('click', () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
addEventListener('scroll', updateScrollButtons, { passive: true });
addEventListener('resize', updateScrollButtons);
updateScrollButtons();

function route() {
  const id = (location.hash || '#home').slice(1);
  const current = views.find(v => v.id === id) || views[0];
  views.forEach(v => v.hidden = v !== current);
  document.body.classList.toggle('inner', current.id !== 'home');
  primaryNav.querySelectorAll('a[href^="#"]').forEach(link => {
    if (link.getAttribute('href') === `#${current.id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  setMobileNavOpen(false);
  window.scrollTo(0, 0);
  siteHeader.classList.remove('is-hidden');
  siteHeader.classList.toggle('is-scrolled', current.id !== 'home');
  lastHeaderScrollY = 0;
}
addEventListener('hashchange', route);
route();

const heroVideo = document.getElementById('heroVideo');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const siteIntro = document.getElementById('siteIntro');
if (siteIntro) {
  if (document.body.classList.contains('inner') || reducedMotion.matches) {
    siteIntro.hidden = true;
  } else {
    siteIntro.addEventListener('animationend', event => {
      if (event.target === siteIntro && event.animationName === 'intro-exit') siteIntro.hidden = true;
    });
  }
}
heroVideo.addEventListener('error', () => {
  console.error('The homepage video failed to load; using the poster image instead.');
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) heroVideo.pause();
});
if (reducedMotion.matches) heroVideo.pause();

/* ---------- Menu data: [name, price, note]. A price can be a number or [hot, iced] ---------- */
const MENU = {
  "Breakfast": [
    { t: "All-day breakfast", sub: "Each plate comes with rice, eggs and a side.", i: [
      ["Shorebound Franks", 325, "Angus beef franks"],
      ["Castaway's Catch", 325, "Boneless bangus marinated in vinegar and garlic"],
      ["Boardwalk Spam", 325, "Seared spam slices"],
      ["Ferryman's Favorite", 325, "Corned beef sautéed with onions"],
      ["Outrigger's Choice", 325, "Beef tapa with garlic and vinegar"],
      ["Sunrise Links", 325, "Longganisa"]
    ]}
  ],
  "Bites": [
    { t: "Waffles", i: [
      ["The Berry Coast", 180], ["Golden Sands Caramel", 175], ["Midnight Cocoa", 175],
      ["Nutty Shore", 175], ["Honeyed Island Banana", 175]
    ]},
    { t: "Sandwiches", i: [
      ["Sunrise Egg", 150], ["Coastal Chicken Melt", 180], ["Pier Tuna Pimiento", 175],
      ["The RAD Clubhouse", 195], ["Golden Horizon French Toast", 175]
    ]},
    { t: "Appetizers", i: [
      ["Surfside Nuggets", 275], ["Saltwater Strings", 160], ["Pierside Fish & Chips", 275],
      ["Gull's Wing Plate", 375], ["Tidal Crunch Calamari", 300]
    ]},
    { t: "Take-out", sub: "Take-out orders include a ₱20 \"Coast-to-Go\" packaging fee.", i: [] }
  ],
  "Pizza & Pasta": [
    { t: "Pizza", sub: "10-inch.", i: [
      ["Fisherman's Crust", 475], ["Sunset Spice Pepperoni", 475], ["The Coast House Tuyo Special", 475],
      ["Sailor's Crunch", 450], ["Islander's Choice", 450], ["Crust & Cheese", 450],
      ["Pizza Sandbar", 375, "Three 5-inch pizzas: Sailor's Crunch, Islander's Choice, Crust & Cheese"]
    ]},
    { t: "Pasta", i: [
      ["Fisherman's Wharf", 325, "Spanish sardines in extra virgin coconut oil, herbs and coastal spices"],
      ["Anchor's Rest", 275, "Salted egg cream sauce with bacon and garden herbs"],
      ["Crimson Coast Classic", 275, "Beef meatballs in tomato sauce"]
    ]}
  ],
  "Coast-to-Share": [
    { t: "Sharing platters", sub: "Not valid with other discounts, including Senior Citizen, PWD and diplomatic.", i: [
      ["Coast-to-Share 1", 999, "Good for 2. Pasta platter, Saltwater Strings, Pizza Sandbar, iced tea pitcher"],
      ["Coast-to-Share 2", 1499, "Good for 3 to 4. Pasta platter, Surfside Nuggets, 10-inch pizza, iced tea pitcher"],
      ["Coast-to-Share 3", 1999, "Good for 4 to 6. Pasta platter, Surfside Nuggets, 10-inch pizza, Gull's Wing Plate, iced tea pitcher"]
    ]}
  ],
  "Coffee & Tea": [
    { t: "Espresso drinks", sub: "Hot / iced.", i: [
      ["Caramel Macchiato", [170, 180]], ["Americano", [150, 160]], ["Latte", [170, 180]],
      ["Cappuccino", [170, 180]], ["Spanish Latte", [170, 180]]
    ]},
    { t: "Coffee frappe", i: [
      ["Black Sand Mocha", 180], ["Espresso Oreo", 180], ["Midnight Espresso", 180],
      ["French Vanilla", 180], ["Coco Crest", 180], ["Dark Tide Jelly", 180]
    ]},
    { t: "Non-coffee frappe", i: [
      ["Banana Strawberry", 180], ["Cookies & Currents", 180], ["Cocoa Caramel Milk", 180],
      ["Seafoam Matcha", 180], ["Strawberry Matcha", 180]
    ]},
    { t: "Tea (Twinings)", i: [
      ["Earl Grey", 120], ["English Breakfast", 120], ["Green Tea & Mint", 120], ["Green Tea & Lemon", 120],
      ["Four Red Fruits", 120], ["Strawberry & Mango", 120], ["Lemon & Ginger", 120]
    ]}
  ],
  "Bar": [
    { t: "Beer", i: [
      ["Heineken", 180], ["Hoagarden", 250], ["Corona", 195],
      ["Pale Pilsen", 120], ["Red Horse", 120], ["San Miguel Light", 120], ["San Mig Apple", 120]
    ]},
    { t: "Coast-to-Cheer", sub: "A bucket is 5 canned beers: Pale Pilsen, Red Horse, San Mig Light or San Mig Apple.", i: [
      ["Coast-to-Cheer 1", 500, "Bucket of beer"],
      ["Coast-to-Cheer 2", 650, "Bucket + Saltwater Strings"],
      ["Coast-to-Cheer 3", 750, "Bucket + Surfside or Pierside"],
      ["Coast-to-Cheer 4", 850, "Bucket + Gull's Wing Plate"],
      ["Coast-to-Cheer 5", 850, "Bucket + Pizza Sandbar"],
      ["Coast-to-Cheer 6", 950, "Bucket + 10-inch pizza of your choice"]
    ]},
    { t: "Cocktails", i: [
      ["Coastline Fizz", 175, "Gin and lemon-lime soda"], ["Lighthouse Tonic", 175, "Gin and tonic"],
      ["Shoreline Shaker", 195, "Classic margarita"], ["Tidal Mint", 225, "Classic mojito"],
      ["The RAD Signature", 250, "Tropical mojito"], ["High Tide Fizz", 175, "Vodka and lemon-lime soda"],
      ["Reef Sunset", 195, "Vodka, orange juice and grenadine"], ["Madras Drift", 195, "Vodka, cranberry and orange juice"],
      ["Honeycomb Harbor", 225, "Vodka, lemon and honey"]
    ]},
    { t: "Wine", sub: "750 ml bottles.", i: [
      ["Cabernet Sauvignon", 800, "Australia, Wolf Blass Eaglehawk"], ["Sauvignon Blanc", 850, "Australia, Hearts & Wines"],
      ["Moscato", 900, "Australia, Hardy's"], ["Chardonnay", 975, "South Africa, Table Mountain"],
      ["Merlot", 1500, "Chile, Santa Carolina"], ["Pink Moscato", 1500, "Chile, Santa Carolina"]
    ]}
  ]
};

const peso = n => '₱' + n.toLocaleString('en-PH');
const price = p => Array.isArray(p) ? `${peso(p[0])} / ${peso(p[1])}` : peso(p);
const FEATURED = [
  { name: "Caramel Macchiato", image: "featured-caramel-macchiato.jpg" },
  { name: "Pierside Fish & Chips", image: "featured-fish-chips.webp" },
  { name: "The Coast House Tuyo Special", image: "food-pizza-tuyo.jpg" }
];
document.getElementById('featuredItems').innerHTML = FEATURED.map(item => `
  <article class="featured-card">
    <figure class="ph featured-photo"><img src="images/${item.image}" alt="${item.name}" loading="lazy"></figure>
    <h4>${item.name}</h4>
  </article>`).join('');

/* ---------- Menu tabs ---------- */
const tabs = document.getElementById('tabs');
const body = document.getElementById('menuBody');

function showTab(name) {
  [...tabs.children].forEach(b => b.setAttribute('aria-selected', b.textContent === name));
  body.innerHTML = MENU[name].map(g => `
    <div class="group">
      <h3>${g.t}</h3>
      ${g.sub ? `<p class="sub">${g.sub}</p>` : ''}
      <ul>${g.i.map(([n, p, note]) => `
        <li data-n="${n}"><div class="row" tabindex="0" role="button"><span><b>${n}</b>${note ? `<small>${note}</small>` : ''}</span><em>${price(p)}</em></div><div class="pic" hidden>${dishPic(n)}</div></li>`).join('')}
      </ul>
    </div>`).join('');
}
Object.keys(MENU).forEach(name => {
  const b = document.createElement('button');
  b.textContent = name;
  b.setAttribute('role', 'tab');
  b.onclick = () => showTab(name);
  tabs.appendChild(b);
});
showTab('Breakfast');

/* ---------- Rooms ---------- */
const ROOMS = [
  { n: "Deluxe Room", p: 2500, maxGuests: 2, g: "2 guests", img: "room-standard", gal: ["room-standard", "tile-beds", "gallery-10", "gallery-09"], f: ["1 double bed", "Ensuite bathroom", "Wi-Fi and air conditioning", "Breakfast for 2"] },
  { n: "Family Room", p: 5000, maxGuests: 4, g: "4 guests", img: "room-family", gal: ["room-family", "gallery-13", "gallery-14", "gallery-11", "gallery-15", "gallery-16"], f: ["1 queen bed and 2 single beds", "Ensuite bathroom", "Wi-Fi and air conditioning", "Breakfast for 4"] },
  { n: "Master Suite", p: 7500, maxGuests: 6, g: "6 guests", img: "room-suite", gal: ["room-suite", "gallery-19", "gallery-18", "gallery-12", "gallery-17"], f: ["2 bedrooms, shared bathroom", "Living area, gym and private bar", "Wi-Fi and air conditioning", "Breakfast for 6"] }
];
document.getElementById('rooms').innerHTML = ROOMS.map((r, i) => `
  <article class="room" data-i="${i}">
    <div class="ph"><img src="${src(r.img)}" alt="${r.n}" loading="lazy"></div>
    <div class="body">
      <h3>${r.n}</h3>
      <p class="room-capacity">Up to ${r.g}</p>
      <ul>${r.f.map(x => `<li>${x}</li>`).join('')}</ul>
      <button class="room-photos" type="button">View photos &rarr;</button>
      <div class="room-offer">
        <p><span>From</span><strong>${peso(r.p)}</strong><span>per night</span></p>
        <button class="btn room-inquire" type="button">Inquire Now</button>
      </div>
      <p class="room-estimate" hidden></p>
    </div>
  </article>`).join('');

const stayCheckIn = document.getElementById('stayCheckIn');
const stayCheckOut = document.getElementById('stayCheckOut');
const stayGuests = document.getElementById('stayGuests');
const roomSearch = document.getElementById('roomSearch');
const roomList = document.getElementById('rooms');
const reservationModal = document.getElementById('reservationModal');
const reservationForm = document.getElementById('roomReservation');
const reservationCheckIn = document.getElementById('reservationCheckIn');
const reservationCheckOut = document.getElementById('reservationCheckOut');
const reservationGuests = document.getElementById('reservationGuests');
const reservationEstimate = document.getElementById('reservationEstimate');
const roomNoResults = document.getElementById('roomNoResults');
let inquiryRoom;
let inquiryTrigger;

function localDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, count) {
  if (!date) return '';
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + count);
  return localDate(next);
}
function countNights(checkIn, checkOut) {
  const [iy, im, id] = checkIn.split('-').map(Number);
  const [oy, om, od] = checkOut.split('-').map(Number);
  return Math.round((Date.UTC(oy, om - 1, od) - Date.UTC(iy, im - 1, id)) / 86400000);
}
function displayDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function updateRoomEstimate(room, checkIn, checkOut, target) {
  const nights = countNights(checkIn, checkOut);
  target.textContent = `${peso(room.p)} × ${nights} night${nights === 1 ? '' : 's'} = ${peso(room.p * nights)} estimated room total`;
  target.hidden = false;
}

const today = localDate(new Date());
stayCheckIn.min = today;
stayCheckIn.value = today;
stayCheckOut.min = addDays(today, 1);
stayCheckOut.value = addDays(today, 1);
stayCheckIn.addEventListener('change', () => {
  stayCheckOut.setCustomValidity('');
  if (!stayCheckIn.value) {
    stayCheckOut.min = addDays(today, 1);
    return;
  }
  stayCheckOut.min = addDays(stayCheckIn.value, 1);
  if (stayCheckOut.value <= stayCheckIn.value) stayCheckOut.value = stayCheckOut.min;
});
stayCheckOut.addEventListener('change', () => stayCheckOut.setCustomValidity(''));

roomSearch.addEventListener('submit', e => {
  e.preventDefault();
  if (!roomSearch.reportValidity()) return;
  const nights = countNights(stayCheckIn.value, stayCheckOut.value);
  if (nights < 1) {
    stayCheckOut.setCustomValidity('Check-out must be after check-in.');
    stayCheckOut.reportValidity();
    return;
  }
  stayCheckOut.setCustomValidity('');
  const guests = Number(stayGuests.value);
  document.getElementById('staySummary').textContent =
    `${nights} night${nights === 1 ? '' : 's'} · ${displayDate(stayCheckIn.value)} to ${displayDate(stayCheckOut.value)} · ${guests} guest${guests === 1 ? '' : 's'}`;
  document.getElementById('staySummary').hidden = false;
  let matches = 0;
  roomList.querySelectorAll('.room').forEach(card => {
    const room = ROOMS[Number(card.dataset.i)];
    card.hidden = room.maxGuests < guests;
    if (!card.hidden) {
      matches++;
      updateRoomEstimate(room, stayCheckIn.value, stayCheckOut.value, card.querySelector('.room-estimate'));
    }
  });
  roomNoResults.hidden = matches > 0;
});

function updateInquiryEstimate() {
  if (!inquiryRoom || !reservationCheckIn.value || !reservationCheckOut.value) return;
  const nights = countNights(reservationCheckIn.value, reservationCheckOut.value);
  reservationEstimate.textContent = nights > 0
    ? `${peso(inquiryRoom.p)} × ${nights} night${nights === 1 ? '' : 's'} = ${peso(inquiryRoom.p * nights)} estimated room total`
    : 'Choose a check-out date after check-in to see an estimate.';
}
function openReservationInquiry(room, trigger) {
  inquiryRoom = room;
  inquiryTrigger = trigger;
  reservationForm.reset();
  document.getElementById('reservationTitle').textContent = room.n;
  document.getElementById('reservationRate').textContent = `${peso(room.p)} per night · up to ${room.g} · breakfast included`;
  reservationCheckIn.value = stayCheckIn.value;
  reservationCheckIn.min = stayCheckIn.min;
  reservationCheckOut.value = stayCheckOut.value;
  reservationCheckOut.min = addDays(reservationCheckIn.value, 1);
  reservationGuests.replaceChildren(...Array.from({ length: room.maxGuests }, (_, i) => {
    const option = document.createElement('option');
    option.value = String(i + 1);
    option.textContent = `${i + 1} guest${i === 0 ? '' : 's'}`;
    return option;
  }));
  reservationGuests.value = String(Math.min(Number(stayGuests.value), room.maxGuests));
  document.getElementById('roomInquirySent').hidden = true;
  reservationModal.hidden = false;
  updateInquiryEstimate();
  reservationCheckIn.focus();
}
reservationCheckIn.addEventListener('change', () => {
  reservationCheckOut.setCustomValidity('');
  if (!reservationCheckIn.value) {
    reservationCheckOut.min = '';
    updateInquiryEstimate();
    return;
  }
  reservationCheckOut.min = addDays(reservationCheckIn.value, 1);
  if (reservationCheckOut.value <= reservationCheckIn.value) reservationCheckOut.value = reservationCheckOut.min;
  updateInquiryEstimate();
});
reservationCheckOut.addEventListener('change', updateInquiryEstimate);
reservationGuests.addEventListener('change', updateInquiryEstimate);
document.getElementById('closeReservation').addEventListener('click', () => {
  reservationModal.hidden = true;
  if (inquiryTrigger) inquiryTrigger.focus();
});
reservationModal.addEventListener('click', e => {
  if (e.target === reservationModal) {
    reservationModal.hidden = true;
    if (inquiryTrigger) inquiryTrigger.focus();
  }
});
reservationForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!reservationForm.reportValidity()) return;
  const d = Object.fromEntries(new FormData(reservationForm));
  const nights = countNights(d.checkIn, d.checkOut);
  if (nights < 1) {
    reservationCheckOut.setCustomValidity('Check-out must be after check-in.');
    reservationCheckOut.reportValidity();
    return;
  }
  reservationCheckOut.setCustomValidity('');
  const total = inquiryRoom.p * nights;
  const text = `Reservation Inquiry\n\nRoom: ${inquiryRoom.n}\nCheck-in: ${displayDate(d.checkIn)}\nCheck-out: ${displayDate(d.checkOut)}\nNights: ${nights}\nGuests: ${d.guests}\nEstimated arrival: ${d.arrival}\nEstimated room total: ${peso(total)}\n\nName: ${d.firstName} ${d.lastName}\nEmail: ${d.email}\nMobile: ${d.mobile}\nSpecial requests: ${d.requests || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Reservation Inquiry - ' + inquiryRoom.n)}&body=${encodeURIComponent(text)}`;
  document.getElementById('roomInquirySent').hidden = false;
});
reservationCheckOut.addEventListener('change', () => reservationCheckOut.setCustomValidity(''));

function buildCarousel(el, names, alt) {
  const track = document.createElement('div');
  track.className = 'carousel-track';
  names.forEach((name, i) => {
    const figure = document.createElement('figure');
    figure.className = 'ph';
    const img = document.createElement('img');
    img.src = src(name);
    img.alt = `${alt} ${i + 1}`;
    img.loading = 'lazy';
    figure.append(img);
    track.append(figure);
  });
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  [['Previous photos', -1, '←'], ['Next photos', 1, '→']].forEach(([label, direction, text]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.textContent = text;
    button.addEventListener('click', () => track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' }));
    controls.append(button);
  });
  el.append(track, controls);
}
buildCarousel(document.getElementById('homeGallery'), ['gallery-02', 'gallery-04', 'gallery-06', 'gallery-08', 'gallery-20'], 'The Coast by RAD');
buildCarousel(document.getElementById('gallery'), Array.from({ length: 20 }, (_, i) => 'gallery-' + String(i + 1).padStart(2, '0')), 'The Coast by RAD photo');

/* ---------- Event reservation: opens the visitor's email app with the details filled in ---------- */
document.getElementById('reserve').addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const text = `Event reservation inquiry\n\nName: ${d.name}\nContact: ${d.contact}\nEvent: ${d.type}\nDate: ${d.date}\nGuests: ${d.guests}\nNotes: ${d.notes || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Event reservation inquiry: ' + d.type)}&body=${encodeURIComponent(text)}`;
  document.getElementById('sent').hidden = false;
});

document.getElementById('tableReservation').addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const text = `Table reservation inquiry\n\nName: ${d.name}\nContact: ${d.contact}\nPreferred date: ${d.date}\nPreferred time: ${d.time}\nGuests: ${d.guests}\nNotes: ${d.notes || '-'}`;
  location.href = `mailto:business@radventures.ph?subject=${encodeURIComponent('Table reservation inquiry')}&body=${encodeURIComponent(text)}`;
  document.getElementById('tableSent').hidden = false;
});

/* ---------- Photo mosaics (data-photos="name,name,...") ---------- */
document.querySelectorAll('.mosaic').forEach(m => {
  m.innerHTML = m.dataset.photos.split(',').map(n =>
    `<figure class="ph"><img src="${src(n)}" alt="The Coast by RAD" loading="lazy"></figure>`).join('');
});

/* ---------- Photo banner at the top of every inner page ---------- */
const BANNER = { menu: 'tile-menu', beds: 'tile-beds', events: 'tile-events', faq: 'gallery-05', about: 'gallery-01', contact: 'hero' };
document.querySelectorAll('.page').forEach(p => {
  const b = document.createElement('div');
  b.className = `banner ph${p.id === 'faq' ? ' faq-banner' : ''}`;
  const overlay = p.id === 'faq'
    ? 'linear-gradient(rgba(12,39,50,.48),rgba(12,39,50,.78))'
    : 'linear-gradient(rgba(10,30,45,.25),rgba(10,30,45,.72))';
  b.style.backgroundImage = `${overlay},url(${src(BANNER[p.id])})`;
  const bk = document.createElement('a');
  bk.className = 'back'; bk.href = '#home'; bk.setAttribute('aria-label', 'Back to home'); bk.innerHTML = '&larr;';
  b.append(bk, p.querySelector('h2'));
  const lead = p.querySelector('.lead');
  if (lead) b.append(lead);
  const w = document.createElement('div');
  w.className = 'wrap';
  w.append(...p.childNodes);
  p.append(b, w);
});

/* ---------- Click a photo to enlarge it ---------- */
const lb = document.createElement('div');
lb.className = 'lb'; lb.hidden = true;
document.body.append(lb);
lb.onclick = () => lb.hidden = true;
addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });
document.addEventListener('click', e => {
  const i = e.target.closest('.mosaic img, .carousel img, .rgal img');
  if (i) { lb.innerHTML = `<img src="${i.src}" alt="">`; lb.hidden = false; }
});

/* ---------- Tap a dish to show or hide its photo ---------- */
function togglePic(li) {
  const p = li.querySelector('.pic'), wasHidden = p.hidden;
  document.querySelectorAll('.pic').forEach(x => x.hidden = true);
  p.hidden = !wasHidden;
}
body.addEventListener('click', e => { const r = e.target.closest('.row'); if (r) togglePic(r.parentElement); });
body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('row')) e.target.click(); });

/* ---------- Rooms: tap a room to see only its photos ---------- */
const rm = document.createElement('div');
rm.className = 'modal'; rm.hidden = true;
document.body.append(rm);
function openRoom(i) {
  const r = ROOMS[i];
  rm.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="${r.n} photos"><button class="x" aria-label="Close">&times;</button>
    <h3>${r.n}</h3><p class="price">${peso(r.p)} per night, up to ${r.g}</p>
    <ul>${r.f.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="rgal">${r.gal.map(n => `<figure class="ph"><img src="${src(n)}" alt="${r.n}" loading="lazy"></figure>`).join('')}</div></div>`;
  rm.hidden = false;
}
rm.onclick = e => { if (e.target === rm || e.target.classList.contains('x')) rm.hidden = true; };
roomList.addEventListener('click', e => {
  const card = e.target.closest('.room');
  if (!card) return;
  const index = Number(card.dataset.i);
  if (e.target.closest('.room-photos')) openRoom(index);
  if (e.target.closest('.room-inquire')) openReservationInquiry(ROOMS[index], e.target.closest('.room-inquire'));
});

/* ---------- Search: menu items, rooms, FAQs and pages ---------- */
function goDish(tab, n) {
  location.hash = '#menu';
  setTimeout(() => {
    showTab(tab);
    const li = [...body.querySelectorAll('li')].find(x => x.dataset.n === n);
    if (!li) return;
    li.querySelector('.pic').hidden = false;
    li.scrollIntoView({ block: 'center' });
    li.classList.add('hit');
    setTimeout(() => li.classList.remove('hit'), 1800);
  }, 80);
}
const FAQS = [...document.querySelectorAll('#faq details')];
const INDEX = [
  ...Object.entries(MENU).flatMap(([tab, gs]) => gs.flatMap(g => g.i.map(([n, p, note]) =>
    ({ t: n, s: 'Menu: ' + tab, k: `${note || ''} ${g.t}`, go: () => goDish(tab, n) })))),
  ...ROOMS.map((r, i) => ({ t: r.n, s: 'Stay', k: r.f.join(' '), go: () => { location.hash = '#beds'; openRoom(i); } })),
  ...FAQS.map(d => ({ t: d.querySelector('summary').textContent, s: 'FAQs & Policies', k: d.textContent,
    go: () => { location.hash = '#faq'; setTimeout(() => { FAQS.forEach(x => x.open = x === d); d.scrollIntoView({ block: 'center' }); }, 80); } })),
  { t: 'Events and reservations', s: 'Page', k: 'event party birthday wedding book reserve', go: () => location.hash = '#events' },
  { t: 'Contact us', s: 'Page', k: 'phone email address facebook instagram social', go: () => location.hash = '#contact' },
  { t: 'About us', s: 'Page', k: 'story gallery photos', go: () => location.hash = '#about' }
];
const sOv = document.getElementById('search'), q = document.getElementById('q'), res = document.getElementById('res');
const closeSearch = () => sOv.hidden = true;
document.getElementById('searchBtn').onclick = () => { setMobileNavOpen(false); sOv.hidden = false; q.value = ''; res.innerHTML = ''; q.focus(); };
document.getElementById('sx').onclick = closeSearch;
sOv.onclick = e => { if (e.target === sOv) closeSearch(); };
q.oninput = () => {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? INDEX.filter(x => words.every(w => (x.t + ' ' + x.k).toLowerCase().includes(w))).slice(0, 8) : [];
  res.innerHTML = hits.length
    ? hits.map(x => `<li><button data-i="${INDEX.indexOf(x)}"><b>${x.t}</b><small>${x.s}</small></button></li>`).join('')
    : (words.length ? '<li class="none">No results</li>' : '');
};
res.onclick = e => { const b = e.target.closest('button'); if (b) { closeSearch(); INDEX[+b.dataset.i].go(); } };
q.onkeydown = e => { if (e.key === 'Enter') { const b = res.querySelector('button'); if (b) b.click(); } };
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (menuToggle.getAttribute('aria-expanded') === 'true') {
      setMobileNavOpen(false);
      menuToggle.focus();
    }
    rm.hidden = true;
    if (!reservationModal.hidden) {
      reservationModal.hidden = true;
      if (inquiryTrigger) inquiryTrigger.focus();
    }
    closeSearch();
  }
});
