/* ==========================================================================
   LOGIQUE FRONTEND - LE TRIANGLE (CANDLELIVES)
   ========================================================================== */

// --- Variables d'état Globales ---
const state = {
  currentView: 'welcome',
  groups: [],
  venues: [],
  programmations: [],
  calendar: {
    currentDate: new Date() // Month-view target date
  },
  activeMap: null, // Leaflet instance
  user: JSON.parse(sessionStorage.getItem('triangle_user') || 'null')
};

// Mapeur de mois en français
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// --- Cycle de vie au démarrage ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Initialise l'application
function initApp() {
  // Configurer le routeur SPA
  window.addEventListener('hashchange', router);
  
  // Lancer le routeur une première fois au chargement
  router();

  // Enregistrer les écouteurs d'événements globaux
  registerGlobalEvents();
}

// --- Routeur SPA ---
function router() {
  const hash = window.location.hash || '#welcome';
  
  // Analyse du chemin
  let view = 'welcome';
  let id = null;
  let action = null;

  if (hash.startsWith('#welcome')) {
    view = 'welcome';
  } else if (hash.startsWith('#menu')) {
    view = 'menu';
  } else if (hash.startsWith('#group-form')) {
    // must be checked BEFORE '#group/' and '#groups'
    view = 'group-form';
    id = hash.split('/')[1] || null;
  } else if (hash.startsWith('#group/')) {
    view = 'group-detail';
    id = hash.split('/')[1];
  } else if (hash.startsWith('#groups')) {
    view = 'groups-list';
  } else if (hash.startsWith('#venue-form')) {
    // must be checked BEFORE '#venue/' and '#venues'
    view = 'venue-form';
    id = hash.split('/')[1] || null;
  } else if (hash.startsWith('#venue/')) {
    view = 'venue-detail';
    id = hash.split('/')[1];
  } else if (hash.startsWith('#venues')) {
    view = 'venues-list';
  } else if (hash.startsWith('#calendar')) {
    view = 'calendar';
  } else if (hash.startsWith('#programming-form')) {
    view = 'programming-form';
    id = hash.split('/')[1] || null;
  } else if (hash.startsWith('#settings')) {
    view = 'settings';
  }

  // Guard access if not authenticated
  if (!state.user && view !== 'welcome') {
    window.location.hash = '#welcome';
    return;
  }

  // Charger la vue correspondante
  showView(view, id);
}

// Active la visibilité de la bonne section HTML
function showView(viewName, id = null) {
  state.currentView = viewName;

  // Cacher toutes les vues
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });

  // Afficher/masquer l'en-tête de l'application
  const header = document.getElementById('app-header');
  if (viewName === 'welcome') {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }

  // Mettre à jour l'état actif des boutons de nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const target = btn.dataset.target;
    const viewRoot = viewName.replace('-list', '').replace('-detail', '').replace('-form', '');
    if (viewRoot === target || 
        (target === 'groups' && (viewName === 'groups-list' || viewName === 'group-detail' || viewName === 'group-form')) ||
        (target === 'venues' && (viewName === 'venues-list' || viewName === 'venue-detail' || viewName === 'venue-form')) ||
        (target === 'calendar' && viewName === 'programming-form')) {
      btn.classList.add('active');
    }
  });

  // Afficher la vue ciblée et lancer sa logique
  const activeViewEl = document.getElementById(`view-${viewName}`);
  if (activeViewEl) {
    activeViewEl.classList.remove('hidden');
  }

  // Lancement des chargements de données
  switch (viewName) {
    case 'menu':
      // Rien de particulier à charger
      break;
    case 'groups-list':
      loadGroupsList();
      break;
    case 'group-detail':
      loadGroupDetails(id);
      break;
    case 'group-form':
      setupGroupForm(id);
      break;
    case 'venues-list':
      loadVenuesList();
      break;
    case 'venue-detail':
      loadVenueDetails(id);
      break;
    case 'venue-form':
      setupVenueForm(id);
      break;
    case 'calendar':
      loadCalendarView();
      break;
    case 'programming-form':
      setupProgrammingForm(id);
      break;
    case 'settings':
      loadSettingsView();
      break;
  }
}

// --- Écouteurs globaux ---
function registerGlobalEvents() {
  // Bouton Entrer
  document.getElementById('enter-btn').addEventListener('click', () => {
    if (state.user) {
      window.location.hash = '#menu';
    } else {
      openLoginModal();
    }
  });

  // Clic Logo Header
  document.getElementById('header-logo-btn').addEventListener('click', () => {
    if (state.user) {
      window.location.hash = '#menu';
    } else {
      window.location.hash = '#welcome';
    }
  });

  // Navigation Boutons Header
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target.dataset.target;
      window.location.hash = `#${target}`;
    });
  });

  // Navigation Cartes Menu Dashboard
  document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = card.dataset.target;
      window.location.hash = `#${target}`;
    });
  });

  // Boutons Ajout
  document.getElementById('add-group-btn').addEventListener('click', () => {
    window.location.hash = '#group-form';
  });
  document.getElementById('add-venue-btn').addEventListener('click', () => {
    window.location.hash = '#venue-form';
  });
  document.getElementById('add-prog-btn').addEventListener('click', () => {
    window.location.hash = '#programming-form';
  });

  // Filtres listes
  document.getElementById('group-search').addEventListener('input', filterGroups);
  document.getElementById('group-filter-status').addEventListener('change', filterGroups);
  document.getElementById('venue-search').addEventListener('input', filterVenues);
  document.getElementById('venue-filter-type').addEventListener('change', filterVenues);

  // Formulaires soumission
  document.getElementById('group-form').addEventListener('submit', handleGroupSubmit);
  document.getElementById('venue-form').addEventListener('submit', handleVenueSubmit);
  document.getElementById('programming-form').addEventListener('submit', handleProgrammingSubmit);
  
  // Connection Form & Logout
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('login-close-btn').addEventListener('click', closeLoginModal);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // User Settings CRUD Form
  document.getElementById('add-user-btn').addEventListener('click', openAddUserForm);
  document.getElementById('cancel-user-btn').addEventListener('click', closeUserForm);
  document.getElementById('user-settings-form').addEventListener('submit', handleUserFormSubmit);

  // Upload Photo bouton
  document.getElementById('upload-photo-btn').addEventListener('click', () => {
    document.getElementById('group-photo-file').click();
  });
  document.getElementById('group-photo-file').addEventListener('change', handlePhotoUpload);

  // Formulaire Retour
  document.getElementById('group-form-back-btn').addEventListener('click', () => window.history.back());
  document.getElementById('venue-form-back-btn').addEventListener('click', () => window.history.back());
  document.getElementById('programming-form-back-btn').addEventListener('click', () => window.history.back());

  // Boutons de retour fiches détail (data-target)
  document.querySelectorAll('.back-link[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#${btn.dataset.target}`;
    });
  });

  // Upload Photo Lieu
  document.getElementById('upload-venue-photo-btn').addEventListener('click', () => {
    document.getElementById('venue-photo-file').click();
  });
  document.getElementById('venue-photo-file').addEventListener('change', handleVenuePhotoUpload);

  document.getElementById('cal-prev-btn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('cal-next-btn').addEventListener('click', () => changeMonth(1));
  document.getElementById('cal-today-btn').addEventListener('click', () => {
    state.calendar.currentDate = new Date();
    loadCalendarView();
  });

  // Modale Agenda
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('event-modal').addEventListener('click', (e) => {
    if (e.target.id === 'event-modal') closeModal();
  });

  // Custom Delete Modal cancel button & backdrop clicks
  document.getElementById('confirm-delete-cancel-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-delete-modal') closeDeleteModal();
  });

  // Formulaire Concert : check gratuite vs prix
  const priceFreeCheck = document.getElementById('prog-price-free');
  priceFreeCheck.addEventListener('change', (e) => {
    const fields = document.querySelectorAll('.price-field input');
    fields.forEach(input => {
      input.disabled = e.target.checked;
      if (e.target.checked) input.value = '';
    });
  });
}

// --- Toast notification ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.remove('hidden');
  
  if (type === 'error') {
    toast.style.borderLeftColor = 'var(--status-annule-text)';
  } else {
    toast.style.borderLeftColor = 'var(--accent-orange)';
  }

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// --- MODALE EVENT ---
function openModal(contentHtml) {
  const modal = document.getElementById('event-modal');
  const body = document.getElementById('modal-body-content');
  body.innerHTML = contentHtml;
  modal.classList.remove('hidden');
}
function closeModal() {
  document.getElementById('event-modal').classList.add('hidden');
}

// --- CUSTOM DELETE MODAL ---
let currentDeleteCallback = null;

function openDeleteModal(message, confirmCallback) {
  const modal = document.getElementById('confirm-delete-modal');
  document.getElementById('confirm-delete-message').innerText = message;
  currentDeleteCallback = confirmCallback;
  modal.classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('confirm-delete-modal').classList.add('hidden');
  currentDeleteCallback = null;
}

// Handle Custom Delete Confirm Action
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (currentDeleteCallback) {
      await currentDeleteCallback();
    }
    closeDeleteModal();
  });
});

// ==========================================================================
// 1. GROUPES LOGIQUE
// ==========================================================================

async function loadGroupsList() {
  try {
    const response = await fetch('/api/groups');
    state.groups = await response.json();
    renderGroupsGrid(state.groups);
  } catch (error) {
    showToast('Erreur lors du chargement des groupes.', 'error');
  }
}

function renderGroupsGrid(groupsList) {
  const grid = document.getElementById('groups-grid');
  grid.innerHTML = '';

  if (groupsList.length === 0) {
    grid.innerHTML = `<div class="text-center py-5" style="grid-column: 1/-1; color: var(--text-secondary);">Aucun groupe trouvé.</div>`;
    return;
  }

  groupsList.forEach(group => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.addEventListener('click', () => {
      window.location.hash = `#group/${group.id}`;
    });

    const photoHtml = group.photo_url 
      ? `<img src="${group.photo_url}" alt="${group.name}">` 
      : `<svg class="image-fallback-icon" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 9l10.5-3m0 0L21 8.25M19.5 6V15M12 19.5a3 3 0 11-6 0 3 3 0 016 0zm9-3.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;

    card.innerHTML = `
      <div class="card-image-box">
        ${photoHtml}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h4 class="card-title">${group.name}</h4>
          <span class="badge badge-${group.status.toLowerCase().replace(' ', '-')}">${group.status}</span>
        </div>
        <div class="card-meta">${group.musical_style || 'Style non spécifié'}</div>
        <p class="card-desc">${group.description || 'Pas de description renseignée.'}</p>
        <div class="card-footer-info">
          <span>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z"/></svg>
            ${group.city || 'Ville inconnue'}
          </span>
          <span>Créé en ${group.creation_date || 'N/C'}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterGroups() {
  const query = document.getElementById('group-search').value.toLowerCase();
  const statusFilter = document.getElementById('group-filter-status').value;

  const filtered = state.groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(query) || 
                          (group.musical_style && group.musical_style.toLowerCase().includes(query)) ||
                          (group.city && group.city.toLowerCase().includes(query));
    
    const matchesStatus = !statusFilter || group.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  renderGroupsGrid(filtered);
}

async function loadGroupDetails(id) {
  try {
    const response = await fetch(`/api/groups/${id}`);
    if (!response.ok) throw new Error();
    const group = await response.json();
    renderGroupProfile(group);
  } catch (error) {
    showToast('Erreur lors du chargement des détails du groupe.', 'error');
    window.location.hash = '#groups';
  }
}

function renderGroupProfile(group) {
  const container = document.getElementById('group-profile-container');
  
  const photoHtml = group.photo_url 
    ? `<img src="${group.photo_url}" alt="${group.name}">` 
    : `<svg class="image-fallback-icon" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.1;"><path d="M9 9l10.5-3m0 0L21 8.25M19.5 6V15M12 19.5a3 3 0 11-6 0 3 3 0 016 0zm9-3.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;

  let socials = {};
  try { socials = JSON.parse(group.social_media || '{}'); } catch(e) {}
  
  let socialHtml = '';
  if (socials.facebook) socialHtml += `<a href="${socials.facebook}" target="_blank" class="social-icon-btn">FB</a>`;
  if (socials.instagram) socialHtml += `<a href="${socials.instagram}" target="_blank" class="social-icon-btn">IG</a>`;
  if (socials.youtube) socialHtml += `<a href="${socials.youtube}" target="_blank" class="social-icon-btn">YT</a>`;
  if (socials.bandcamp) socialHtml += `<a href="${socials.bandcamp}" target="_blank" class="social-icon-btn">BC</a>`;

  // Render gig history list
  let gigsListHtml = `<p style="color: var(--text-secondary);">Aucun concert programmé pour l'instant.</p>`;
  if (group.gigs && group.gigs.length > 0) {
    gigsListHtml = `<div class="profile-gigs-list">`;
    group.gigs.forEach(gig => {
      const gigDate = new Date(gig.event_date);
      const day = gigDate.getDate();
      const month = MONTHS_FR[gigDate.getMonth()].substring(0, 4);
      const time = String(gigDate.getHours()).padStart(2,'0') + 'h' + String(gigDate.getMinutes()).padStart(2,'0');
      
      gigsListHtml += `
        <div class="profile-gig-card">
          <div class="gig-date-box">
            <span class="month">${month}</span>
            <span class="day">${day}</span>
            <span class="time">${time}</span>
          </div>
          <div class="gig-details-box">
            <div class="gig-title">${gig.event_name}</div>
            <div class="gig-link-ref">à <a href="#venue/${gig.venue_id}" style="color: var(--accent-orange); text-decoration: none;">${gig.venue_name}</a></div>
          </div>
          <span class="badge badge-${gig.status.toLowerCase()}">${gig.status}</span>
        </div>
      `;
    });
    gigsListHtml += `</div>`;
  }

  container.innerHTML = `
    <!-- Left column profile -->
    <div class="profile-card">
      <div class="profile-photo-container">
        ${photoHtml}
      </div>
      <div class="profile-info-body">
        <div class="profile-title-row">
          <h3 class="profile-name">${group.name}</h3>
          <span class="badge badge-${group.status.toLowerCase().replace(' ', '-')}">${group.status}</span>
        </div>
        
        <div class="profile-facts">
          <div class="fact-item">
            <span>Style</span>
            <span>${group.musical_style || 'N/C'}</span>
          </div>
          <div class="fact-item">
            <span>Ville</span>
            <span>${group.city || 'N/C'}</span>
          </div>
          <div class="fact-item">
            <span>Créé en</span>
            <span>${group.creation_date || 'N/C'}</span>
          </div>
          <div class="fact-item" style="border:none;">
            <span>Site</span>
            <span>${group.website ? `<a href="${group.website}" target="_blank" style="color: var(--accent-orange);">Visiter</a>` : 'Aucun'}</span>
          </div>
        </div>

        <div class="profile-actions">
          <button class="action-btn secondary btn-sm" onclick="window.location.hash='#group-form/${group.id}'">Modifier</button>
          <button class="action-btn danger btn-sm" onclick="deleteGroupRecord(${group.id})">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Right column content -->
    <div class="profile-content">
      <div class="content-block">
        <h4 class="block-title">Biographie</h4>
        <p class="block-text">${group.description || 'Aucune description disponible.'}</p>
        
        ${socialHtml ? `
          <h4 class="block-title mt-4" style="margin-bottom:10px;">Réseaux Sociaux</h4>
          <div class="social-badges">${socialHtml}</div>
        ` : ''}
      </div>

      <div class="content-block">
        <h4 class="block-title">Contact & Booking</h4>
        <p class="block-text" style="font-weight: 500;">${group.contact || 'Aucun contact spécifié.'}</p>
      </div>

      <div class="content-block">
        <h4 class="block-title">Programmations / Concerts</h4>
        ${gigsListHtml}
      </div>
    </div>
  `;
}

async function deleteGroupRecord(id) {
  openDeleteModal(
    'Voulez-vous vraiment supprimer ce groupe définitivement ? Tous les concerts liés seront supprimés.',
    async () => {
      try {
        const response = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('Groupe supprimé avec succès.');
          window.location.hash = '#groups';
        } else {
          throw new Error();
        }
      } catch (error) {
        showToast('Erreur lors de la suppression.', 'error');
      }
    }
  );
}

// --- FORM GROUPE ---
async function setupGroupForm(id = null) {
  const title = document.getElementById('group-form-title');
  const submitBtn = document.getElementById('group-submit-btn');
  const form = document.getElementById('group-form');
  
  form.reset();
  document.getElementById('group-id-input').value = '';
  document.getElementById('group-photo-url-input').value = '';
  document.getElementById('group-photo-preview').innerHTML = '<div class="preview-placeholder">Aucune image choisie</div>';
  
  if (id) {
    title.innerText = 'Modifier le Groupe';
    submitBtn.innerText = 'Mettre à jour';
    try {
      const res = await fetch(`/api/groups/${id}`);
      const g = await res.json();
      
      document.getElementById('group-id-input').value = g.id;
      document.getElementById('group-name').value = g.name;
      document.getElementById('group-style').value = g.musical_style;
      document.getElementById('group-creation').value = g.creation_date;
      document.getElementById('group-city').value = g.city;
      document.getElementById('group-status').value = g.status;
      document.getElementById('group-description').value = g.description;
      document.getElementById('group-contact').value = g.contact;
      document.getElementById('group-website').value = g.website;
      
      let socials = {};
      try { socials = JSON.parse(g.social_media || '{}'); } catch(e) {}
      document.getElementById('group-social-fb').value = socials.facebook || '';
      document.getElementById('group-social-ig').value = socials.instagram || '';
      document.getElementById('group-social-yt').value = socials.youtube || '';
      
      if (g.photo_url) {
        document.getElementById('group-photo-url-input').value = g.photo_url;
        document.getElementById('group-photo-preview').innerHTML = `<img src="${g.photo_url}" alt="Preview">`;
      }
    } catch(e) {
      showToast('Erreur lors du chargement du groupe à modifier.', 'error');
    }
  } else {
    title.innerText = 'Ajouter un Groupe';
    submitBtn.innerText = 'Enregistrer';
  }
}

async function handleVenuePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('photo', file);

  const previewBox = document.getElementById('venue-photo-preview');
  previewBox.innerHTML = '<div class="preview-placeholder">Téléchargement en cours...</div>';

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error();
    const data = await res.json();
    document.getElementById('venue-photo-url-input').value = data.photoUrl;
    previewBox.innerHTML = `<img src="${data.photoUrl}" alt="Preview">`;
    showToast('Image téléversée avec succès !');
  } catch(err) {
    previewBox.innerHTML = '<div class="preview-placeholder" style="color:var(--status-annule-text)">Erreur lors du chargement.</div>';
    showToast("Impossible de charger l'image.", 'error');
  }
}

async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('photo', file);

  const previewBox = document.getElementById('group-photo-preview');
  previewBox.innerHTML = '<div class="preview-placeholder">Téléchargement en cours...</div>';

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    document.getElementById('group-photo-url-input').value = data.photoUrl;
    previewBox.innerHTML = `<img src="${data.photoUrl}" alt="Preview">`;
    showToast('Image téléversée avec succès !');
  } catch(err) {
    previewBox.innerHTML = '<div class="preview-placeholder" style="color:var(--status-annule-text)">Erreur lors du chargement.</div>';
    showToast('Impossible de charger l\'image.', 'error');
  }
}

async function handleGroupSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('group-id-input').value;
  const name = document.getElementById('group-name').value;
  const musical_style = document.getElementById('group-style').value;
  const creation_date = document.getElementById('group-creation').value;
  const city = document.getElementById('group-city').value;
  const status = document.getElementById('group-status').value;
  const description = document.getElementById('group-description').value;
  const contact = document.getElementById('group-contact').value;
  const website = document.getElementById('group-website').value;
  const photo_url = document.getElementById('group-photo-url-input').value;

  const socials = {
    facebook: document.getElementById('group-social-fb').value,
    instagram: document.getElementById('group-social-ig').value,
    youtube: document.getElementById('group-social-yt').value
  };

  const payload = {
    name, musical_style, creation_date, city, status, description, contact, website, photo_url,
    social_media: JSON.stringify(socials)
  };

  try {
    let response;
    if (id) {
      response = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (response.ok) {
      showToast(id ? 'Groupe mis à jour avec succès.' : 'Groupe enregistré avec succès !');
      window.location.hash = id ? `#group/${id}` : '#groups';
    } else {
      throw new Error();
    }
  } catch(err) {
    showToast('Erreur lors de l\'enregistrement du groupe.', 'error');
  }
}

// ==========================================================================
// 2. LIEUX LOGIQUE
// ==========================================================================

async function loadVenuesList() {
  try {
    const response = await fetch('/api/venues');
    state.venues = await response.json();
    renderVenuesGrid(state.venues);
  } catch (error) {
    showToast('Erreur lors du chargement des lieux.', 'error');
  }
}

function renderVenuesGrid(venuesList) {
  const grid = document.getElementById('venues-grid');
  grid.innerHTML = '';

  if (venuesList.length === 0) {
    grid.innerHTML = `<div class="text-center py-5" style="grid-column: 1/-1; color: var(--text-secondary);">Aucun lieu trouvé.</div>`;
    return;
  }

  venuesList.forEach(venue => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.addEventListener('click', () => {
      window.location.hash = `#venue/${venue.id}`;
    });

    card.innerHTML = `
      <div class="card-image-box" style="height: 140px; background: linear-gradient(135deg, #25120d 0%, #0d0c11 100%);">
        ${ venue.photo_url
          ? `<img src="${venue.photo_url}" alt="${venue.name}" style="width:100%;height:100%;object-fit:cover;">`
          : `<svg class="image-fallback-icon" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" stroke-width="1.2"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" /></svg>`
        }
      </div>
      <div class="card-body">
        <h4 class="card-title">${venue.name}</h4>
        <div class="card-meta" style="color: var(--accent-gold);">${venue.type}</div>
        <p class="card-desc" style="-webkit-line-clamp: 2;">${venue.address || 'Pas d\'adresse renseignée.'}</p>
        <div class="card-footer-info" style="margin-top: 10px;">
          <span>Capacité : <b>${venue.capacity || 'N/C'} pers.</b></span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterVenues() {
  const query = document.getElementById('venue-search').value.toLowerCase();
  const typeFilter = document.getElementById('venue-filter-type').value;

  const filtered = state.venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(query) || 
                          (venue.address && venue.address.toLowerCase().includes(query)) ||
                          (venue.type && venue.type.toLowerCase().includes(query));
    
    const matchesType = !typeFilter || venue.type === typeFilter;

    return matchesSearch && matchesType;
  });

  renderVenuesGrid(filtered);
}

async function loadVenueDetails(id) {
  try {
    const response = await fetch(`/api/venues/${id}`);
    if (!response.ok) throw new Error();
    const venue = await response.json();
    renderVenueProfile(venue);
  } catch (error) {
    showToast('Erreur lors du chargement des détails du lieu.', 'error');
    window.location.hash = '#venues';
  }
}

function renderVenueProfile(venue) {
  const container = document.getElementById('venue-profile-container');
  
  // Set up local state for venue calendar date
  state.venueCalendarDate = new Date();

  let socials = {};
  try { socials = JSON.parse(venue.social_media || '{}'); } catch(e) {}

  // --- Icon pills (only shown if data exists) ---
  const iconPills = [];

  if (venue.address) {
    iconPills.push(`
      <a class="venue-icon-pill" title="${venue.address}" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}" target="_blank">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${venue.address}</span>
      </a>`);
  }

  if (venue.website) {
    iconPills.push(`
      <a class="venue-icon-pill" href="${venue.website}" target="_blank" title="Site internet">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>Site internet</span>
      </a>`);
  }

  if (socials.instagram) {
    iconPills.push(`
      <a class="venue-icon-pill venue-icon-pill--instagram" href="${socials.instagram}" target="_blank" title="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
        <span>Instagram</span>
      </a>`);
  }

  if (socials.facebook) {
    iconPills.push(`
      <a class="venue-icon-pill venue-icon-pill--facebook" href="${socials.facebook}" target="_blank" title="Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
        <span>Facebook</span>
      </a>`);
  }

  const iconPillsHtml = iconPills.length > 0
    ? `<div class="venue-icon-pills">${iconPills.join('')}</div>`
    : '';

  // Notes / Informations (editable textarea)
  const notesValue = venue.internal_notes || '';

  container.innerHTML = `
    <!-- Top photo banner / hero -->
    <div class="venue-profile-header">
      <div class="venue-banner-container">
        ${ venue.photo_url
          ? `<img src="${venue.photo_url}" alt="${venue.name}" class="venue-banner-img">`
          : `<div class="venue-banner-placeholder">
              <svg viewBox="0 0 100 100" class="venue-placeholder-svg" width="90" height="90">
                <circle cx="50" cy="50" r="45" stroke="var(--border-color)" stroke-dasharray="3 3" fill="none"/>
                <path d="M50 20 C35 20 25 30 25 45 C25 60 50 80 50 80 C50 80 75 60 75 45 C75 30 65 20 50 20 Z" fill="rgba(255, 87, 34, 0.08)" stroke="var(--accent-orange)" stroke-width="2"/>
                <circle cx="50" cy="45" r="8" fill="var(--accent-gold)"/>
              </svg>
              <div class="placeholder-text">Localisation</div>
             </div>`
        }
      </div>
      
      <div class="venue-info-bar">
        <div class="venue-title-section">
          <h2 class="venue-name-title">${venue.name}</h2>
          <span class="badge" style="background: rgba(255, 179, 0, 0.1); border-color: rgba(255, 179, 0, 0.4); color: var(--accent-gold);">${venue.type}</span>
          ${iconPillsHtml}
        </div>
        
        <div class="venue-action-buttons">
          <button class="action-btn primary btn-sm" id="venue-add-event-btn">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Ajouter un événement
          </button>
          <button class="action-btn secondary btn-sm" onclick="window.location.hash='#venue-form/${venue.id}'">Modifier</button>
          <button class="action-btn danger btn-sm" onclick="deleteVenueRecord(${venue.id})">Supprimer</button>
        </div>
      </div>
    </div>
    
    <!-- Single column: Calendar then Notes -->
    <div class="venue-single-column">
      <!-- Embedded Venue Calendar -->
      <div class="content-block">
        <h4 class="block-title" style="margin-bottom: 20px;">Agenda du Mois</h4>
        <div class="calendar-wrapper card">
          <div class="calendar-toolbar">
            <div class="toolbar-nav">
              <button class="icon-btn" id="venue-cal-prev-btn">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h3 class="calendar-month-year" id="venue-cal-month-title"></h3>
              <button class="icon-btn" id="venue-cal-next-btn">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
          <div class="calendar-days-header">
            <div>Lundi</div>
            <div>Mardi</div>
            <div>Mercredi</div>
            <div>Jeudi</div>
            <div>Vendredi</div>
            <div>Samedi</div>
            <div>Dimanche</div>
          </div>
          <div class="calendar-grid" id="venue-calendar-grid-days">
            <!-- Drawn by JS -->
          </div>
        </div>
      </div>

      <!-- Notes / Informations -->
      <div class="content-block mt-4" id="venue-notes-block">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <h4 class="block-title" style="margin:0;">INFORMATIONS</h4>
          <button class="action-btn secondary btn-sm" id="venue-notes-save-btn" style="display:none;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Enregistrer
          </button>
        </div>
        <textarea
          id="venue-notes-textarea"
          class="venue-notes-textarea"
          placeholder="Notez ici toutes les informations utiles sur ce lieu : acoustique, équipements, contacts, conditions d'accueil, notes de négociation..."
          rows="8"
        >${notesValue}</textarea>
      </div>
    </div>
  `;

  // Draw embedded calendar
  renderVenueCalendar(venue);

  // Set up event listeners for venue calendar navigation
  document.getElementById('venue-cal-prev-btn').addEventListener('click', () => {
    state.venueCalendarDate.setMonth(state.venueCalendarDate.getMonth() - 1);
    renderVenueCalendar(venue);
  });
  document.getElementById('venue-cal-next-btn').addEventListener('click', () => {
    state.venueCalendarDate.setMonth(state.venueCalendarDate.getMonth() + 1);
    renderVenueCalendar(venue);
  });

  // "Ajouter un événement" button: pre-selects this venue
  document.getElementById('venue-add-event-btn').addEventListener('click', () => {
    state.preselectedVenueId = venue.id;
    window.location.hash = '#programming-form';
  });

  // Notes textarea: show save button on change
  const notesTextarea = document.getElementById('venue-notes-textarea');
  const notesSaveBtn = document.getElementById('venue-notes-save-btn');
  notesTextarea.addEventListener('input', () => {
    notesSaveBtn.style.display = '';
  });
  notesSaveBtn.addEventListener('click', async () => {
    try {
      // Build a minimal update payload preserving all existing fields
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: venue.name,
          type: venue.type,
          address: venue.address || '',
          gps_coordinates: venue.gps_coordinates || '',
          capacity: venue.capacity || 0,
          contact_technical: venue.contact_technical || '',
          contact_commercial: venue.contact_commercial || '',
          website: venue.website || '',
          social_media: venue.social_media || '{}',
          equipment: venue.equipment || '',
          hosting_conditions: venue.hosting_conditions || '',
          internal_notes: notesTextarea.value,
          photo_url: venue.photo_url || '',
          email: venue.email || '',
          phone: venue.phone || ''
        })
      });
      if (res.ok) {
        venue.internal_notes = notesTextarea.value;
        notesSaveBtn.style.display = 'none';
        showToast('Informations enregistrées.');
      } else {
        throw new Error();
      }
    } catch (e) {
      showToast('Erreur lors de la sauvegarde des informations.', 'error');
    }
  });
}

// Function to draw the venue calendar month view
function renderVenueCalendar(venue) {
  const currentDate = state.venueCalendarDate || new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update title
  const monthTitle = document.getElementById('venue-cal-month-title');
  if (monthTitle) {
    monthTitle.innerText = `${MONTHS_FR[month]} ${year}`;
  }

  const grid = document.getElementById('venue-calendar-grid-days');
  if (!grid) return;
  grid.innerHTML = '';

  // Get index day of first day in month (adjusted for Monday as first day)
  let firstDayOfMonth = new Date(year, month, 1).getDay();
  firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Days count of current month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Days count of previous month
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  // 1. Draw previous month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayVal = totalDaysInPrevMonth - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${dayVal}</span>`;
    grid.appendChild(cell);
  }

  // 2. Draw current month days
  const today = new Date();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    
    // Check if cell represents today
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }

    cell.innerHTML = `<span class="day-number">${d}</span>`;

    // Filter events for this day
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = (venue.gigs || []).filter(event => {
      return event.event_date.startsWith(dayStr);
    });

    // Sort events by time
    dayEvents.sort((a, b) => a.event_date.localeCompare(b.event_date));

    // Append events to cell
    dayEvents.forEach(event => {
      const timeStr = event.event_date.split('T')[1].substring(0, 5).replace(':', 'h');
      const badge = document.createElement('div');
      badge.className = `calendar-event-badge event-badge-${event.status.toLowerCase()}`;
      badge.innerHTML = `<strong>${timeStr}</strong> ${event.group_name}`;
      badge.title = `${event.event_name} - ${event.group_style}`;
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        // Inject venue info so modal behaves correctly
        event.venue_name = venue.name;
        event.venue_type = venue.type;
        showEventDetails(event);
      });
      cell.appendChild(badge);
    });

    grid.appendChild(cell);
  }

  // 3. Draw next month padding days
  const gridCellsCount = firstDayOfMonth + totalDaysInMonth;
  const nextMonthPadding = 42 - gridCellsCount;
  for (let n = 1; n <= nextMonthPadding; n++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${n}</span>`;
    grid.appendChild(cell);
  }
}


// Map Leaflet loader
function initVenueMap(coordinatesStr, venueName) {
  if (state.activeMap) {
    state.activeMap.remove();
    state.activeMap = null;
  }
  
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;
  
  if (!coordinatesStr) {
    mapContainer.parentElement.style.display = 'none';
    return;
  }
  
  const coords = coordinatesStr.split(',').map(c => parseFloat(c.trim()));
  if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
    mapContainer.parentElement.style.display = 'none';
    return;
  }
  
  mapContainer.parentElement.style.display = 'block';

  // Leaflet needs visible DOM element to build dimensions correctly
  setTimeout(() => {
    try {
      state.activeMap = L.map('map-container').setView(coords, 14);
      
      // Load tiles from OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(state.activeMap);
      
      // Add custom marker
      L.marker(coords).addTo(state.activeMap)
        .bindPopup(`<b>${venueName}</b><br>Lieu de programmation`)
        .openPopup();
    } catch (e) {
      console.error('Erreur Leaflet Map:', e);
    }
  }, 150);
}

async function deleteVenueRecord(id) {
  openDeleteModal(
    'Voulez-vous vraiment supprimer ce lieu définitivement ? Tous les concerts liés seront supprimés.',
    async () => {
      try {
        const response = await fetch(`/api/venues/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('Lieu supprimé avec succès.');
          window.location.hash = '#venues';
        } else {
          throw new Error();
        }
      } catch (error) {
        showToast('Erreur lors de la suppression.', 'error');
      }
    }
  );
}

// --- FORM LIEU ---
async function setupVenueForm(id = null) {
  const title = document.getElementById('venue-form-title');
  const submitBtn = document.getElementById('venue-submit-btn');
  const form = document.getElementById('venue-form');
  
  form.reset();
  document.getElementById('venue-id-input').value = '';
  document.getElementById('venue-photo-url-input').value = '';
  document.getElementById('venue-photo-preview').innerHTML = '<div class="preview-placeholder">Aucune image choisie</div>';

  if (id) {
    title.innerText = 'Modifier le Lieu';
    submitBtn.innerText = 'Mettre à jour';
    try {
      const res = await fetch(`/api/venues/${id}`);
      const v = await res.json();
      
      document.getElementById('venue-id-input').value = v.id;
      document.getElementById('venue-name').value = v.name;
      document.getElementById('venue-type').value = v.type;
      document.getElementById('venue-address').value = v.address;
      document.getElementById('venue-gps').value = v.gps_coordinates;
      document.getElementById('venue-capacity').value = v.capacity;
      document.getElementById('venue-website').value = v.website;
      document.getElementById('venue-email').value = v.email || '';
      document.getElementById('venue-phone').value = v.phone || '';
      document.getElementById('venue-contact-tech').value = v.contact_technical;
      document.getElementById('venue-contact-comm').value = v.contact_commercial;
      document.getElementById('venue-equipment').value = v.equipment;
      document.getElementById('venue-conditions').value = v.hosting_conditions;
      document.getElementById('venue-notes').value = v.internal_notes;
      
      let socials = {};
      try { socials = JSON.parse(v.social_media || '{}'); } catch(e) {}
      document.getElementById('venue-social-fb').value = socials.facebook || '';
      document.getElementById('venue-social-ig').value = socials.instagram || '';

      if (v.photo_url) {
        document.getElementById('venue-photo-url-input').value = v.photo_url;
        document.getElementById('venue-photo-preview').innerHTML = `<img src="${v.photo_url}" alt="Preview">`;
      }
    } catch(e) {
      showToast('Erreur lors du chargement du lieu à modifier.', 'error');
    }
  } else {
    title.innerText = 'Ajouter un Lieu';
    submitBtn.innerText = 'Enregistrer';
  }
}

async function handleVenueSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('venue-id-input').value;
  const name = document.getElementById('venue-name').value;
  const type = document.getElementById('venue-type').value;
  const address = document.getElementById('venue-address').value;
  const gps_coordinates = document.getElementById('venue-gps').value;
  const capacity = document.getElementById('venue-capacity').value;
  const website = document.getElementById('venue-website').value;
  const email = document.getElementById('venue-email').value;
  const phone = document.getElementById('venue-phone').value;
  const contact_technical = document.getElementById('venue-contact-tech').value;
  const contact_commercial = document.getElementById('venue-contact-comm').value;
  const equipment = document.getElementById('venue-equipment').value;
  const hosting_conditions = document.getElementById('venue-conditions').value;
  const internal_notes = document.getElementById('venue-notes').value;

  const photo_url = document.getElementById('venue-photo-url-input').value;

  const socials = {
    facebook: document.getElementById('venue-social-fb').value,
    instagram: document.getElementById('venue-social-ig').value
  };

  const payload = {
    name, type, address, gps_coordinates, capacity, website, email, phone, contact_technical, contact_commercial,
    equipment, hosting_conditions, internal_notes, photo_url,
    social_media: JSON.stringify(socials)
  };

  try {
    let response;
    if (id) {
      response = await fetch(`/api/venues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (response.ok) {
      showToast(id ? 'Lieu mis à jour avec succès.' : 'Lieu enregistré avec succès !');
      window.location.hash = id ? `#venue/${id}` : '#venues';
    } else {
      throw new Error();
    }
  } catch(err) {
    showToast('Erreur lors de l\'enregistrement du lieu.', 'error');
  }
}


// ==========================================================================
// 3. PROGRAMMATION (CALENDRIER ET FORMULAIRE)
// ==========================================================================

async function loadCalendarView() {
  try {
    const res = await fetch('/api/programmations');
    state.programmations = await res.json();
    renderCalendar();
  } catch(e) {
    showToast('Erreur de chargement du planning.', 'error');
  }
}

// Construit et affiche la grille du calendrier
function renderCalendar() {
  const currentDate = state.calendar.currentDate;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mettre à jour le titre
  document.getElementById('cal-month-title').innerText = `${MONTHS_FR[month]} ${year}`;

  const grid = document.getElementById('calendar-grid-days');
  grid.innerHTML = '';

  // Get index day of first day in month (adjusted for Monday as first day)
  // JS day is 0=Sun, 1=Mon... 6=Sat
  // We want: 0=Mon, 1=Tue... 6=Sun
  let firstDayOfMonth = new Date(year, month, 1).getDay();
  firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Days count of current month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Days count of previous month
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  // 1. Draw previous month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayVal = totalDaysInPrevMonth - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${dayVal}</span>`;
    grid.appendChild(cell);
  }

  // 2. Draw current month days
  const today = new Date();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    
    // Check if cell represents today
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }

    cell.innerHTML = `<span class="day-number">${d}</span>`;

    // Filter events for this day
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = state.programmations.filter(event => {
      // event.event_date looks like: YYYY-MM-DDTHH:MM
      return event.event_date.startsWith(dayStr);
    });

    // Sort events by time
    dayEvents.sort((a, b) => a.event_date.localeCompare(b.event_date));

    // Append events to cell
    dayEvents.forEach(event => {
      const timeStr = event.event_date.split('T')[1].substring(0, 5).replace(':', 'h');
      const badge = document.createElement('div');
      badge.className = `calendar-event-badge event-badge-${event.status.toLowerCase()}`;
      badge.innerHTML = `<strong>${timeStr}</strong> ${event.group_name}`;
      badge.title = `${event.event_name} @ ${event.venue_name}`;
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(event);
      });
      cell.appendChild(badge);
    });

    grid.appendChild(cell);
  }

  // 3. Draw next month padding days
  const gridCellsCount = firstDayOfMonth + totalDaysInMonth;
  const nextMonthPadding = 42 - gridCellsCount; // 6 rows * 7 days = 42 cells
  for (let n = 1; n <= nextMonthPadding; n++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${n}</span>`;
    grid.appendChild(cell);
  }
}

function changeMonth(direction) {
  const curDate = state.calendar.currentDate;
  state.calendar.currentDate = new Date(curDate.getFullYear(), curDate.getMonth() + direction, 1);
  loadCalendarView();
}

// Modal info detailed rendering
function showEventDetails(event) {
  const eventDateObj = new Date(event.event_date);
  const formattedDate = eventDateObj.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const time = String(eventDateObj.getHours()).padStart(2, '0') + 'h' + String(eventDateObj.getMinutes()).padStart(2, '0');

  let pricingText = 'Non défini';
  if (event.price_free) {
    pricingText = '<span style="color:var(--status-confirm-text); font-weight:600;">Entrée gratuite</span>';
  } else {
    pricingText = `Prévente : ${event.price_presale || 'N/C'} | Sur place : ${event.price_onsite || 'N/C'}`;
  }

  const content = `
    <div class="modal-body">
      <div class="modal-header-tag">Fiche Concert</div>
      <h3 class="modal-event-title">${event.event_name}</h3>
      
      <div class="modal-info-grid">
        <div class="modal-info-row">
          <span>Artiste / Groupe :</span>
          <span><a href="#group/${event.group_id}" onclick="closeModal()" style="color: var(--accent-orange); text-decoration:none; font-weight:600;">${event.group_name}</a> (${event.group_style})</span>
        </div>
        <div class="modal-info-row">
          <span>Lieu d'accueil :</span>
          <span><a href="#venue/${event.venue_id}" onclick="closeModal()" style="color: var(--accent-orange); text-decoration:none; font-weight:600;">${event.venue_name}</a></span>
        </div>
        <div class="modal-info-row">
          <span>Date & Heure :</span>
          <span><b style="text-transform: capitalize;">${formattedDate}</b> à <b>${time}</b></span>
        </div>
        <div class="modal-info-row">
          <span>Tarifs :</span>
          <span>${pricingText}</span>
        </div>
        <div class="modal-info-row">
          <span>Organisateur :</span>
          <span>${event.organizer_contact || 'N/C'}</span>
        </div>
        <div class="modal-info-row">
          <span>Statut :</span>
          <span><span class="badge badge-${event.status.toLowerCase()}">${event.status}</span></span>
        </div>
      </div>

      ${event.notes ? `
        <div class="modal-notes-box">
          <label>Notes & Infos Diverses</label>
          <div class="modal-notes-content">${event.notes}</div>
        </div>
      ` : ''}

      <div class="modal-actions">
        <button class="action-btn secondary btn-sm" onclick="closeModal(); window.location.hash='#programming-form/${event.id}'">Modifier</button>
        <button class="action-btn danger btn-sm" onclick="closeModal(); deleteProgrammingRecord(${event.id})">Supprimer la Prog</button>
      </div>
    </div>
  `;

  openModal(content);
}

async function deleteProgrammingRecord(id) {
  if (confirm('Voulez-vous supprimer cette programmation de l\'agenda ?')) {
    try {
      const res = await fetch(`/api/programmations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Programmation supprimée.');
        loadCalendarView();
      } else {
        throw new Error();
      }
    } catch(e) {
      showToast('Erreur de suppression.', 'error');
    }
  }
}

// --- FORM PROGRAMMATION ---
async function setupProgrammingForm(id = null) {
  const title = document.getElementById('programming-form-title');
  const submitBtn = document.getElementById('programming-submit-btn');
  const form = document.getElementById('programming-form');
  
  form.reset();
  document.getElementById('programming-id-input').value = '';
  document.getElementById('prog-price-free').checked = false;
  document.querySelectorAll('.price-field input').forEach(input => input.disabled = false);

  // Load select list choices
  await loadSelectDropdownsOptions();

  if (id) {
    title.innerText = 'Modifier la Programmation';
    submitBtn.innerText = 'Enregistrer les modifications';
    try {
      const res = await fetch(`/api/programmations/${id}`);
      const p = await res.json();
      
      document.getElementById('programming-id-input').value = p.id;
      document.getElementById('prog-event-name').value = p.event_name;
      document.getElementById('prog-group-id').value = p.group_id;
      document.getElementById('prog-venue-id').value = p.venue_id;
      document.getElementById('prog-date').value = p.event_date; // standard datetime-local format compatible
      document.getElementById('prog-status').value = p.status;
      document.getElementById('prog-organizer').value = p.organizer_contact;
      document.getElementById('prog-notes').value = p.notes;
      
      if (p.price_free) {
        document.getElementById('prog-price-free').checked = true;
        document.querySelectorAll('.price-field input').forEach(input => {
          input.disabled = true;
          input.value = '';
        });
      } else {
        document.getElementById('prog-price-presale').value = p.price_presale;
        document.getElementById('prog-price-onsite').value = p.price_onsite;
      }
    } catch(e) {
      showToast('Erreur lors du chargement de la prog.', 'error');
    }
  } else {
    title.innerText = 'Planifier un Concert (Ajouter une Prog)';
    submitBtn.innerText = 'Enregistrer la programmation';
    
    // Set default date to current date + 1 day, at 20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T20:00`;
    document.getElementById('prog-date').value = tomorrowStr;

    // Pre-select venue if coming from venue detail page
    if (state.preselectedVenueId) {
      const venueSelect = document.getElementById('prog-venue-id');
      venueSelect.value = state.preselectedVenueId;
      venueSelect.disabled = true; // Lock it since user came from that venue's page
      state.preselectedVenueId = null; // Reset after use
    }
  }
}

// Fills the groups and venues selectors
async function loadSelectDropdownsOptions() {
  const groupSelect = document.getElementById('prog-group-id');
  const venueSelect = document.getElementById('prog-venue-id');

  groupSelect.innerHTML = '<option value="">-- Choisir un groupe --</option>';
  venueSelect.innerHTML = '<option value="">-- Choisir un lieu --</option>';

  try {
    const [gRes, vRes] = await Promise.all([
      fetch('/api/groups'),
      fetch('/api/venues')
    ]);
    
    const groups = await gRes.json();
    const venues = await vRes.json();

    groups.forEach(g => {
      if (g.status !== 'Séparé') { // No point in programming split groups
        groupSelect.innerHTML += `<option value="${g.id}">${g.name} (${g.musical_style})</option>`;
      }
    });

    venues.forEach(v => {
      venueSelect.innerHTML += `<option value="${v.id}">${v.name} (${v.type} - ${v.capacity} p.)</option>`;
    });

  } catch(e) {
    showToast('Erreur de chargement des sélections de formulaires.', 'error');
  }
}

async function handleProgrammingSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('programming-id-input').value;
  const event_name = document.getElementById('prog-event-name').value;
  const group_id = document.getElementById('prog-group-id').value;
  const venue_id = document.getElementById('prog-venue-id').value;
  const event_date = document.getElementById('prog-date').value;
  const status = document.getElementById('prog-status').value;
  const organizer_contact = document.getElementById('prog-organizer').value;
  const price_free = document.getElementById('prog-price-free').checked;
  const price_presale = document.getElementById('prog-price-presale').value;
  const price_onsite = document.getElementById('prog-price-onsite').value;
  const notes = document.getElementById('prog-notes').value;

  const payload = {
    event_name, group_id, venue_id, event_date, status, organizer_contact,
    price_free, price_presale, price_onsite, notes
  };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/programmations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/programmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(id ? 'Programmation mise à jour.' : 'Concert planifié avec succès !');
      
      // Update targeted calendar month so user sees their new gig immediately
      const dateObj = new Date(event_date);
      state.calendar.currentDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);

      window.location.hash = '#calendar';
    } else {
      throw new Error();
    }
  } catch(e) {
    showToast('Erreur d\'enregistrement de la programmation.', 'error');
  }
}

// --- LOGIQUE AUTHENTICATION ---

function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-username').focus();
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value;
  const loginError = document.getElementById('login-error');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      state.user = data.user;
      sessionStorage.setItem('triangle_user', JSON.stringify(data.user));
      closeLoginModal();
      showToast('Connexion réussie !');
      window.location.hash = '#menu';
    } else {
      loginError.textContent = data.error || 'Erreur d\'identification.';
      loginError.classList.remove('hidden');
    }
  } catch (error) {
    loginError.textContent = 'Serveur inaccessible.';
    loginError.classList.remove('hidden');
  }
}

function handleLogout() {
  state.user = null;
  sessionStorage.removeItem('triangle_user');
  showToast('Déconnexion réussie.');
  window.location.hash = '#welcome';
}

// --- LOGIQUE PARAMÈTRES (GÉRER LES UTILISATEURS) ---

let allUsers = [];

async function loadSettingsView() {
  // Hide form container
  document.getElementById('user-form-container').classList.add('hidden');
  await fetchUsers();
}

async function fetchUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Impossible de récupérer les utilisateurs.');
    allUsers = await res.json();
    renderUsersTable();
  } catch (error) {
    showToast('Erreur lors du chargement des utilisateurs.', 'error');
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';
  
  if (allUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--text-secondary); padding: 20px;">Aucun utilisateur trouvé.</td></tr>`;
    return;
  }
  
  allUsers.forEach(user => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    
    // Actions HTML
    const isCurrentUser = state.user && state.user.id === user.id;
    const canDelete = allUsers.length > 1 && !isCurrentUser;
    
    const actionButtonsHTML = `
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="action-btn secondary btn-edit-user" data-id="${user.id}" style="padding: 6px 12px; font-size: 0.85rem;">Modifier</button>
        ${canDelete ? `<button class="action-btn danger btn-delete-user" data-id="${user.id}" style="padding: 6px 12px; font-size: 0.85rem; background-color: rgba(198, 40, 40, 0.2); border: 1px solid rgba(198, 40, 40, 0.4); color: #e57373;">Supprimer</button>` : ''}
      </div>
    `;
    
    tr.innerHTML = `
      <td style="padding: 12px;">
        <span style="font-weight: 500;">${escapeHTML(user.username)}</span>
        ${isCurrentUser ? ' <span style="font-size: 0.75rem; color: var(--accent-orange); font-style: italic;">(Vous)</span>' : ''}
      </td>
      <td style="padding: 12px; text-align: right;">
        ${actionButtonsHTML}
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Attach listeners
  tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      openEditUserForm(id);
    });
  });
  
  tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      confirmDeleteUser(id);
    });
  });
}

function openAddUserForm() {
  const container = document.getElementById('user-form-container');
  container.classList.remove('hidden');
  
  document.getElementById('user-form-title').textContent = 'Nouvel Utilisateur';
  document.getElementById('user-id').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').required = true;
  document.getElementById('user-password-label').textContent = 'Mot de passe';
  document.getElementById('user-password-helper').textContent = '';
  
  document.getElementById('user-username').focus();
  container.scrollIntoView({ behavior: 'smooth' });
}

function openEditUserForm(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  
  const container = document.getElementById('user-form-container');
  container.classList.remove('hidden');
  
  document.getElementById('user-form-title').textContent = `Modifier l'utilisateur : ${user.username}`;
  document.getElementById('user-id').value = user.id;
  document.getElementById('user-username').value = user.username;
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').required = false;
  document.getElementById('user-password-label').textContent = 'Nouveau mot de passe';
  document.getElementById('user-password-helper').textContent = 'Laissez vide pour conserver le mot de passe actuel.';
  
  document.getElementById('user-username').focus();
  container.scrollIntoView({ behavior: 'smooth' });
}

function closeUserForm() {
  document.getElementById('user-form-container').classList.add('hidden');
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const username = document.getElementById('user-username').value.trim();
  const password = document.getElementById('user-password').value;
  
  const payload = { username };
  if (password) {
    payload.password = password;
  }
  
  try {
    let res;
    if (id) {
      // Edit
      res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create
      if (!password) {
        showToast('Le mot de passe est requis pour un nouvel utilisateur.', 'error');
        return;
      }
      res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    const data = await res.json();
    if (res.ok) {
      showToast(id ? 'Utilisateur mis à jour !' : 'Utilisateur créé avec succès.');
      // If the current user updated their own username, update frontend state
      if (id && state.user && state.user.id === parseInt(id)) {
        state.user.username = username;
        sessionStorage.setItem('triangle_user', JSON.stringify(state.user));
      }
      closeUserForm();
      await fetchUsers();
    } else {
      showToast(data.error || 'Erreur lors de l\'enregistrement.', 'error');
    }
  } catch (error) {
    showToast('Erreur serveur lors de l\'enregistrement.', 'error');
  }
}

async function confirmDeleteUser(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  
  const modal = document.getElementById('confirm-delete-modal');
  const messageEl = document.getElementById('confirm-delete-message');
  const cancelBtn = document.getElementById('confirm-delete-cancel-btn');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  
  messageEl.textContent = `Voulez-vous vraiment supprimer l'utilisateur "${user.username}" ?`;
  modal.classList.remove('hidden');
  
  const cleanup = () => {
    modal.classList.add('hidden');
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', onCancel);
  };
  
  const onConfirm = async () => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Utilisateur supprimé.');
        cleanup();
        await fetchUsers();
      } else {
        showToast(data.error || 'Erreur lors de la suppression.', 'error');
        cleanup();
      }
    } catch (e) {
      showToast('Erreur serveur lors de la suppression.', 'error');
      cleanup();
    }
  };
  
  const onCancel = () => {
    cleanup();
  };
  
  confirmBtn.addEventListener('click', onConfirm);
  cancelBtn.addEventListener('click', onCancel);
}

// Simple HTML escape helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
