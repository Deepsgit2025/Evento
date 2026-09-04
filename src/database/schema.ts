export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS weddings (
      id TEXT PRIMARY KEY,
      bride_name TEXT NOT NULL,
      groom_name TEXT NOT NULL,
      date TEXT,
      venue TEXT,
      cover_photo_uri TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
  );`,
  `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      name TEXT NOT NULL,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
  );`,
  `CREATE TABLE IF NOT EXISTS guest_groups (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL, -- e.g., "Mama Pariwar"
      side TEXT NOT NULL DEFAULT 'Groom',
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS wedding_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wedding_id TEXT NOT NULL,
      role TEXT DEFAULT 'MANAGER',
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE,
      UNIQUE(user_id, wedding_id)
  );`,
  `CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      alternate_phone TEXT,
      side TEXT NOT NULL DEFAULT 'Groom',
      group_id TEXT,
      party_size INTEGER NOT NULL DEFAULT 1,
      rsvp_status TEXT DEFAULT 'PENDING',
      dietary_requirements TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (group_id) REFERENCES guest_groups (id) ON DELETE SET NULL,
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      room_number TEXT NOT NULL,
      room_type TEXT,
      capacity INTEGER NOT NULL DEFAULT 2,
      notes TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS room_assignments (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      guest_id TEXT NOT NULL UNIQUE,
      check_in_date TEXT,
      check_out_date TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_type TEXT,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      description TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      category TEXT NOT NULL, -- e.g., Photography, Catering
      name TEXT NOT NULL,
      contact_info TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      vendor_id TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'UNPAID', -- UNPAID, PAID, OVERDUE
      due_date TEXT,
      paid_date TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      title TEXT NOT NULL,
      design_id TEXT,
      message TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS invitation_deliveries (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_group_id TEXT NOT NULL,
      status TEXT DEFAULT 'NOT_SENT', -- NOT_SENT, SENT, DELIVERED, OPENED
      sent_at TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE CASCADE,
      FOREIGN KEY (guest_group_id) REFERENCES guest_groups (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      wedding_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'TODO', -- TODO, IN_PROGRESS, DONE
      due_date TEXT,
      created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
  );`,
];
