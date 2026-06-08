const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration for group photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// Database Initialization
const dbPath = path.join(__dirname, 'triangle.db');
const db = new DatabaseSync(dbPath);

// Enable Foreign Key constraints support
db.exec('PRAGMA foreign_keys = ON;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    creation_date TEXT,
    musical_style TEXT,
    description TEXT,
    city TEXT,
    website TEXT,
    social_media TEXT, -- JSON string
    status TEXT DEFAULT 'Actif',
    photo_url TEXT,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    address TEXT,
    gps_coordinates TEXT,
    capacity INTEGER,
    contact_technical TEXT,
    contact_commercial TEXT,
    website TEXT,
    social_media TEXT, -- JSON string
    equipment TEXT,
    hosting_conditions TEXT,
    internal_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS programmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL, -- Format YYYY-MM-DDTHH:MM
    venue_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    organizer_contact TEXT,
    price_free INTEGER DEFAULT 0,
    price_presale TEXT,
    price_onsite TEXT,
    status TEXT DEFAULT 'Prévu',
    notes TEXT,
    FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
  );
`);

// Migration: add photo_url to venues if it doesn't exist yet
try {
  db.exec(`ALTER TABLE venues ADD COLUMN photo_url TEXT DEFAULT ''`);
} catch(e) { /* column already exists, ignore */ }

// Helper to check table size
function isTableEmpty(tableName) {
  const query = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = query.get();
  return result.count === 0;
}

// Seed Initial Data if empty
if (isTableEmpty('groups')) {
  console.log('Seeding groups table...');
  const seedGroups = [
    {
      name: 'The Black Candle',
      creation_date: '2020',
      musical_style: 'Dark Electro Rock',
      description: 'Mélangeant des textures électroniques industrielles et des riffs de guitare saturés, The Black Candle propose un univers sombre et théâtral, idéal pour les scènes nocturnes.',
      city: 'Paris',
      website: 'https://theblackcandle.example.com',
      social_media: JSON.stringify({ facebook: 'https://facebook.com/theblackcandle', instagram: 'https://instagram.com/theblackcandle', youtube: 'https://youtube.com/theblackcandle' }),
      status: 'Actif',
      photo_url: '',
      contact: 'Damien Noir - damien@theblackcandle.com - 06 12 34 56 78'
    },
    {
      name: 'Jazz de Lune',
      creation_date: '2018',
      musical_style: 'Cozy Jazz / Swing',
      description: 'Un quintet acoustique qui revisite les grands standards du jazz de la Nouvelle-Orléans tout en y insufflant des compositions modernes pleines de douceur et de mélancolie.',
      city: 'Lyon',
      website: 'https://jazzdelune.example.com',
      social_media: JSON.stringify({ instagram: 'https://instagram.com/jazzdelune' }),
      status: 'Actif',
      photo_url: '',
      contact: 'Clara Lune - contact@jazzdelune.com - 06 98 76 54 32'
    },
    {
      name: 'Les Échos du Silence',
      creation_date: '2021',
      musical_style: 'Folk Acoustique',
      description: 'Trio composé de deux guitares acoustiques, d\'un violoncelle et de trois voix harmonisées, offrant un voyage poétique et intimiste au cœur de la chanson française.',
      city: 'Nantes',
      website: '',
      social_media: JSON.stringify({ facebook: 'https://facebook.com/lesechosdusilence' }),
      status: 'Actif',
      photo_url: '',
      contact: 'Julien Echo - julien.echo@example.com - 07 45 67 89 01'
    },
    {
      name: 'Neon Horizon',
      creation_date: '2022',
      musical_style: 'Synthwave / Retro',
      description: 'Inspiré par les bandes-son des films des années 80, Neon Horizon propose une musique instrumentale entraînante portée par des synthétiseurs vintage et des boîtes à rythmes énergiques.',
      city: 'Marseille',
      website: 'https://neonhorizon.example.com',
      social_media: JSON.stringify({ instagram: 'https://instagram.com/neonhorizon', bandcamp: 'https://neonhorizon.bandcamp.com' }),
      status: 'Actif',
      photo_url: '',
      contact: 'Alex Neon - booking@neonhorizon.com - 06 55 44 33 22'
    },
    {
      name: 'Métal Triangle',
      creation_date: '2015',
      musical_style: 'Heavy Metal',
      description: 'Groupe historique de la scène métal locale avec des solos endiablés et une section rythmique surpuissante.',
      city: 'Toulouse',
      website: '',
      social_media: JSON.stringify({ facebook: 'https://facebook.com/metaltriangle' }),
      status: 'En pause',
      photo_url: '',
      contact: 'Marc Heavy - marc@metaltriangle.com'
    },
    {
      name: 'Pop Sparkle',
      creation_date: '2019',
      musical_style: 'Indie Pop',
      description: 'Ancien quatuor pop coloré qui s\'est dissout après une tournée européenne réussie.',
      city: 'Bordeaux',
      website: '',
      social_media: JSON.stringify({}),
      status: 'Séparé',
      photo_url: '',
      contact: 'Léa Spark - spark@example.com'
    }
  ];

  const insertGroup = db.prepare(`
    INSERT INTO groups (name, creation_date, musical_style, description, city, website, social_media, status, photo_url, contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const g of seedGroups) {
    insertGroup.run(g.name, g.creation_date, g.musical_style, g.description, g.city, g.website, g.social_media, g.status, g.photo_url, g.contact);
  }
}

if (isTableEmpty('venues')) {
  console.log('Seeding venues table...');
  const seedVenues = [
    {
      name: 'Le Sphinx',
      type: 'Salle',
      address: '12 Rue de la Candelive, 75011 Paris',
      gps_coordinates: '48.8615, 2.3789',
      capacity: 500,
      contact_technical: 'Guillaume (Régisseur) - tech@lesphinx.com - 06 00 11 22 33',
      contact_commercial: 'Stéphanie (Programmatrice) - contact@lesphinx.com - 01 44 55 66 77',
      website: 'https://lesphinx.example.com',
      social_media: JSON.stringify({ facebook: 'https://facebook.com/lesphinxparis' }),
      equipment: 'Système son d&b audiotechnik, console Soundcraft Vi2000, 24 projecteurs LED robotisés, kit micros complet, backline sur demande (batterie Ludwig, ampli basse Ampeg SVT).',
      hosting_conditions: 'Une grande loge équipée avec canapés, frigo garni et douche. Repas chaud fourni par le restaurant partenaire pour 6 personnes.',
      internal_notes: 'Attention à la limite de bruit en fin de soirée à 102dB pour les voisins. Très bonne acoustique.'
    },
    {
      name: 'La Cave aux Merveilles',
      type: 'Bar',
      address: '4 Place des Célestins, 69002 Lyon',
      gps_coordinates: '45.7597, 4.8315',
      capacity: 120,
      contact_technical: 'Léo - 06 22 33 44 55',
      contact_commercial: 'Julien (Patron) - contact@lacaveauxmerveilles.com - 04 78 89 90 91',
      website: 'https://lacaveauxmerveilles.example.com',
      social_media: JSON.stringify({ instagram: 'https://instagram.com/lacaveauxmerveilles' }),
      equipment: 'Petite sono HK Audio (2 têtes + 1 sub), table de mixage Soundcraft 12 voies, 4 spots LED statiques. Prévoir de ramener vos propres micros si spécifique.',
      hosting_conditions: 'Pas de loge fermée (coin vestiaire pour se changer). Bières et softs à volonté pour les musiciens. Planche charcuterie/fromage offerte.',
      internal_notes: 'Public très chaleureux et réceptif. Scène surélevée de 30cm, assez petite (maximum 4 musiciens serrés).'
    },
    {
      name: 'Le Grand Plein Air',
      type: 'Plein air',
      address: 'Chemin du Cabaret, 44190 Clisson',
      gps_coordinates: '47.0872, -1.2825',
      capacity: 10000,
      contact_technical: 'Michel Tech - 06 99 88 77 66',
      contact_commercial: 'Association OpenAir - booking@openairclisson.com',
      website: 'https://openairclisson.example.com',
      social_media: JSON.stringify({}),
      equipment: 'Gros système de diffusion line array L-Acoustics K2, ponts de lumière complets, écran géant LED. Fiche technique fournie sur demande.',
      hosting_conditions: 'Catering VIP sur place. Mobil-homes individuels faisant office de loges avec douches et climatisation.',
      internal_notes: 'Festival annuel en plein air uniquement en juillet. Gérer l\'alimentation électrique sur groupe électrogène.'
    },
    {
      name: 'Théâtre Antique',
      type: 'Théâtre',
      address: '7 Rue du Cirque, 38200 Vienne',
      gps_coordinates: '45.5245, 4.8784',
      capacity: 8000,
      contact_technical: 'Régie Ville de Vienne - tech.theatre@vienne.fr',
      contact_commercial: 'Office du Tourisme de Vienne - billetterie@vienne-tourisme.com',
      website: 'https://theatreantiquevienne.example.com',
      social_media: JSON.stringify({ instagram: 'https://instagram.com/theatreantiquevienne' }),
      equipment: 'Équipement haut de gamme loué pour la saison d\'été. Console de face Yamaha CL5, console retours CL5.',
      hosting_conditions: 'Loges creusées dans la roche, chargement/déchargement difficile à cause de la pente historique. Prévoir des runners.',
      internal_notes: 'Lieu classé monument historique. Beaucoup de vent en fin de soirée.'
    }
  ];

  const insertVenue = db.prepare(`
    INSERT INTO venues (name, type, address, gps_coordinates, capacity, contact_technical, contact_commercial, website, social_media, equipment, hosting_conditions, internal_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of seedVenues) {
    insertVenue.run(v.name, v.type, v.address, v.gps_coordinates, v.capacity, v.contact_technical, v.contact_commercial, v.website, v.social_media, v.equipment, v.hosting_conditions, v.internal_notes);
  }
}

if (isTableEmpty('programmations')) {
  console.log('Seeding programmations table...');
  
  // Let's dynamically get the current year and month for the seed data so it's always relevant
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const seedProgs = [
    {
      event_name: 'Neon Lights Express',
      event_date: `${year}-${month}-12T20:30`,
      venue_id: 1, // Le Sphinx
      group_id: 4, // Neon Horizon
      organizer_contact: 'Stéphanie - 01 44 55 66 77',
      price_free: 0,
      price_presale: '12 €',
      price_onsite: '15 €',
      status: 'Confirmé',
      notes: 'Soirée spéciale synthwave. Prévoir un stand de merchandising dans le hall.'
    },
    {
      event_name: 'Acoustic Cave Session',
      event_date: `${year}-${month}-18T19:00`,
      venue_id: 2, // La Cave aux Merveilles
      group_id: 3, // Les Échos du Silence
      organizer_contact: 'Julien - contact@lacaveauxmerveilles.com',
      price_free: 1,
      price_presale: '',
      price_onsite: '',
      status: 'Confirmé',
      notes: 'Entrée gratuite pour le public. Chanson folk intimiste.'
    },
    {
      event_name: 'Les Ombres du Triangle',
      event_date: `${year}-${month}-25T21:00`,
      venue_id: 1, // Le Sphinx
      group_id: 1, // The Black Candle
      organizer_contact: 'Damien Noir - damien@theblackcandle.com',
      price_free: 0,
      price_presale: '15 €',
      price_onsite: '18 €',
      status: 'Prévu',
      notes: 'Tête d\'affiche de la soirée Dark Electro. Gros show visuel prévu avec des stroboscopes.'
    },
    {
      event_name: 'Clair de Lune Musical',
      event_date: `${year}-${month}-28T20:00`,
      venue_id: 2, // La Cave aux Merveilles
      group_id: 2, // Jazz de Lune
      organizer_contact: 'Julien - 04 78 89 90 91',
      price_free: 0,
      price_presale: '8 €',
      price_onsite: '10 €',
      status: 'Confirmé',
      notes: 'Concert de jazz convivial. Table de mixage à régler avec finesse.'
    },
    {
      event_name: 'Ouverture du Grand Air',
      event_date: `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-04T18:00`, // Next month
      venue_id: 3, // Le Grand Plein Air
      group_id: 1, // The Black Candle
      organizer_contact: 'Association OpenAir - booking@openairclisson.com',
      price_free: 0,
      price_presale: '25 €',
      price_onsite: '30 €',
      status: 'Confirmé',
      notes: 'Premier concert en extérieur de la saison. Scène principale.'
    },
    {
      event_name: 'Metal Shock (Annulé)',
      event_date: `${year}-${month}-05T21:30`, // Past date
      venue_id: 1, // Le Sphinx
      group_id: 5, // Métal Triangle (En pause)
      organizer_contact: 'Stéphanie - Le Sphinx',
      price_free: 0,
      price_presale: '10 €',
      price_onsite: '12 €',
      status: 'Annulé',
      notes: 'Événement annulé en raison de la mise en pause du groupe. Remboursement en cours.'
    }
  ];

  const insertProg = db.prepare(`
    INSERT INTO programmations (event_name, event_date, venue_id, group_id, organizer_contact, price_free, price_presale, price_onsite, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of seedProgs) {
    insertProg.run(p.event_name, p.event_date, p.venue_id, p.group_id, p.organizer_contact, p.price_free, p.price_presale, p.price_onsite, p.status, p.notes);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// --- GROUPS ROUTES ---

// GET all groups
app.get('/api/groups', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM groups ORDER BY name ASC');
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single group + events
app.get('/api/groups/:id', (req, res) => {
  try {
    const groupStmt = db.prepare('SELECT * FROM groups WHERE id = ?');
    const group = groupStmt.get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Groupe non trouvé' });

    // Fetch related gigs
    const gigsStmt = db.prepare(`
      SELECT p.*, v.name as venue_name, v.type as venue_type, v.address as venue_address
      FROM programmations p
      JOIN venues v ON p.venue_id = v.id
      WHERE p.group_id = ?
      ORDER BY p.event_date ASC
    `);
    const gigs = gigsStmt.all(req.params.id);
    group.gigs = gigs;

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create group
app.post('/api/groups', (req, res) => {
  try {
    const { name, creation_date, musical_style, description, city, website, social_media, status, photo_url, contact } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du groupe est obligatoire.' });

    const stmt = db.prepare(`
      INSERT INTO groups (name, creation_date, musical_style, description, city, website, social_media, status, photo_url, contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name,
      creation_date || '',
      musical_style || '',
      description || '',
      city || '',
      website || '',
      social_media || '{}',
      status || 'Actif',
      photo_url || '',
      contact || ''
    );
    res.status(201).json({ id: info.lastInsertRowid, message: 'Groupe créé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update group
app.put('/api/groups/:id', (req, res) => {
  try {
    const { name, creation_date, musical_style, description, city, website, social_media, status, photo_url, contact } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du groupe est obligatoire.' });

    const stmt = db.prepare(`
      UPDATE groups
      SET name = ?, creation_date = ?, musical_style = ?, description = ?, city = ?, website = ?, social_media = ?, status = ?, photo_url = ?, contact = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      name,
      creation_date || '',
      musical_style || '',
      description || '',
      city || '',
      website || '',
      social_media || '{}',
      status || 'Actif',
      photo_url || '',
      contact || '',
      req.params.id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'Groupe non trouvé.' });
    res.json({ message: 'Groupe mis à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE group
app.delete('/api/groups/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Groupe non trouvé.' });
    res.json({ message: 'Groupe supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- VENUES ROUTES ---

// GET all venues
app.get('/api/venues', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM venues ORDER BY name ASC');
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single venue + events
app.get('/api/venues/:id', (req, res) => {
  try {
    const venueStmt = db.prepare('SELECT * FROM venues WHERE id = ?');
    const venue = venueStmt.get(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });

    // Fetch related gigs
    const gigsStmt = db.prepare(`
      SELECT p.*, g.name as group_name, g.musical_style as group_style, g.photo_url as group_photo
      FROM programmations p
      JOIN groups g ON p.group_id = g.id
      WHERE p.venue_id = ?
      ORDER BY p.event_date ASC
    `);
    const gigs = gigsStmt.all(req.params.id);
    venue.gigs = gigs;

    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create venue
app.post('/api/venues', (req, res) => {
  try {
    const { name, type, address, gps_coordinates, capacity, contact_technical, contact_commercial, website, social_media, equipment, hosting_conditions, internal_notes, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du lieu est obligatoire.' });

    const stmt = db.prepare(`
      INSERT INTO venues (name, type, address, gps_coordinates, capacity, contact_technical, contact_commercial, website, social_media, equipment, hosting_conditions, internal_notes, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name,
      type || 'Salle',
      address || '',
      gps_coordinates || '',
      capacity ? parseInt(capacity) : 0,
      contact_technical || '',
      contact_commercial || '',
      website || '',
      social_media || '{}',
      equipment || '',
      hosting_conditions || '',
      internal_notes || '',
      photo_url || ''
    );
    res.status(201).json({ id: info.lastInsertRowid, message: 'Lieu créé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update venue
app.put('/api/venues/:id', (req, res) => {
  try {
    const { name, type, address, gps_coordinates, capacity, contact_technical, contact_commercial, website, social_media, equipment, hosting_conditions, internal_notes, photo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du lieu est obligatoire.' });

    const stmt = db.prepare(`
      UPDATE venues
      SET name = ?, type = ?, address = ?, gps_coordinates = ?, capacity = ?, contact_technical = ?, contact_commercial = ?, website = ?, social_media = ?, equipment = ?, hosting_conditions = ?, internal_notes = ?, photo_url = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      name,
      type || 'Salle',
      address || '',
      gps_coordinates || '',
      capacity ? parseInt(capacity) : 0,
      contact_technical || '',
      contact_commercial || '',
      website || '',
      social_media || '{}',
      equipment || '',
      hosting_conditions || '',
      internal_notes || '',
      photo_url || '',
      req.params.id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'Lieu non trouvé.' });
    res.json({ message: 'Lieu mis à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE venue
app.delete('/api/venues/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM venues WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Lieu non trouvé.' });
    res.json({ message: 'Lieu supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- PROGRAMMATIONS ROUTES ---

// GET all programmations (with joined details)
app.get('/api/programmations', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, g.name as group_name, g.musical_style as group_style, g.photo_url as group_photo,
             v.name as venue_name, v.type as venue_type, v.address as venue_address
      FROM programmations p
      JOIN groups g ON p.group_id = g.id
      JOIN venues v ON p.venue_id = v.id
      ORDER BY p.event_date ASC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single programmation
app.get('/api/programmations/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, g.name as group_name, g.musical_style as group_style, g.photo_url as group_photo,
             v.name as venue_name, v.type as venue_type, v.address as venue_address
      FROM programmations p
      JOIN groups g ON p.group_id = g.id
      JOIN venues v ON p.venue_id = v.id
      WHERE p.id = ?
    `);
    const row = stmt.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Programmation non trouvée.' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create programmation
app.post('/api/programmations', (req, res) => {
  try {
    const { event_name, event_date, venue_id, group_id, organizer_contact, price_free, price_presale, price_onsite, status, notes } = req.body;
    if (!event_name || !event_date || !venue_id || !group_id) {
      return res.status(400).json({ error: 'Le nom de l\'événement, la date, le lieu et le groupe sont obligatoires.' });
    }

    const stmt = db.prepare(`
      INSERT INTO programmations (event_name, event_date, venue_id, group_id, organizer_contact, price_free, price_presale, price_onsite, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      event_name,
      event_date,
      parseInt(venue_id),
      parseInt(group_id),
      organizer_contact || '',
      price_free ? 1 : 0,
      price_presale || '',
      price_onsite || '',
      status || 'Prévu',
      notes || ''
    );
    res.status(201).json({ id: info.lastInsertRowid, message: 'Programmation enregistrée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update programmation
app.put('/api/programmations/:id', (req, res) => {
  try {
    const { event_name, event_date, venue_id, group_id, organizer_contact, price_free, price_presale, price_onsite, status, notes } = req.body;
    if (!event_name || !event_date || !venue_id || !group_id) {
      return res.status(400).json({ error: 'Le nom de l\'événement, la date, le lieu et le groupe sont obligatoires.' });
    }

    const stmt = db.prepare(`
      UPDATE programmations
      SET event_name = ?, event_date = ?, venue_id = ?, group_id = ?, organizer_contact = ?, price_free = ?, price_presale = ?, price_onsite = ?, status = ?, notes = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      event_name,
      event_date,
      parseInt(venue_id),
      parseInt(group_id),
      organizer_contact || '',
      price_free ? 1 : 0,
      price_presale || '',
      price_onsite || '',
      status || 'Prévu',
      notes || '',
      req.params.id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'Programmation non trouvée.' });
    res.json({ message: 'Programmation mise à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE programmation
app.delete('/api/programmations/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM programmations WHERE id = ?');
    const info = stmt.run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Programmation non trouvée.' });
    res.json({ message: 'Programmation supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- FILE UPLOAD ROUTE ---
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléversé.' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ photoUrl: relativePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Fallback to serve index.html for any frontend routing (if using HTML5 history, though hash routing is used)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=== LE TRIANGLE Server is running on http://localhost:${PORT} ===`);
});
