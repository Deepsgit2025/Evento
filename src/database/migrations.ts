import * as SQLite from 'expo-sqlite';

export interface Migration {
  name: string;
  query: string | ((db: SQLite.SQLiteDatabase) => Promise<void>);
}

export const setupMigrations = async (db: SQLite.SQLiteDatabase) => {
  // Create a migrations table if it doesn't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      run_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
    );
  `);

  const migrations: Migration[] = [
    {
      name: '001_upgrade_guests_table',
      query: async (database: SQLite.SQLiteDatabase) => {
        // Safe migration: only run if 'guests' table actually has 'first_name'
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(guests)`);
        const hasFirstName = tableInfo.some((col) => col.name === 'first_name');
        
        if (hasFirstName) {
          await database.execAsync(`
            CREATE TABLE IF NOT EXISTS guests_new (
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
            );
            INSERT INTO guests_new (id, wedding_id, full_name, rsvp_status, dietary_requirements, created_at, updated_at)
            SELECT id, wedding_id, first_name || ' ' || last_name, rsvp_status, dietary_requirements, created_at, created_at FROM guests;
            DROP TABLE guests;
            ALTER TABLE guests_new RENAME TO guests;
          `);
        }
      },
    },
    {
      name: '002_upgrade_guest_groups',
      query: async (database: SQLite.SQLiteDatabase) => {
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(guest_groups)`);
        const hasSide = tableInfo.some((col) => col.name === 'side');
        
        if (!hasSide) {
          await database.execAsync(`
            CREATE TABLE IF NOT EXISTS guest_groups_new (
              id TEXT PRIMARY KEY,
              wedding_id TEXT NOT NULL,
              name TEXT NOT NULL,
              side TEXT NOT NULL DEFAULT 'Groom',
              created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
            );
            INSERT INTO guest_groups_new (id, wedding_id, name, created_at, updated_at)
            SELECT id, wedding_id, name, created_at, created_at FROM guest_groups;
            DROP TABLE guest_groups;
            ALTER TABLE guest_groups_new RENAME TO guest_groups;
          `);
        }
      }
    },
    {
      name: '003_upgrade_rooms_and_hotels',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS hotels (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            notes TEXT,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
        `);
        
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(rooms)`);
        const hasHotelId = tableInfo.some((col) => col.name === 'hotel_id');
        
        if (!hasHotelId) {
          // Drop old unused rooms table and create new one
          await database.execAsync(`
            DROP TABLE IF EXISTS rooms;
            CREATE TABLE rooms (
              id TEXT PRIMARY KEY,
              hotel_id TEXT NOT NULL,
              room_number TEXT NOT NULL,
              room_type TEXT,
              capacity INTEGER NOT NULL DEFAULT 2,
              notes TEXT,
              created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE
            );
          `);
        }
      }
    },
    {
      name: '004_upgrade_room_assignments',
      query: async (database: SQLite.SQLiteDatabase) => {
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(room_assignments)`);
        const hasNotes = tableInfo.some((col) => col.name === 'notes');
        
        if (!hasNotes) {
          await database.execAsync(`
            DROP TABLE IF EXISTS room_assignments;
            CREATE TABLE room_assignments (
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
            );
          `);
        }
      }
    },
    {
      name: '005_upgrade_events',
      query: async (database: SQLite.SQLiteDatabase) => {
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(events)`);
        const hasDate = tableInfo.some((col) => col.name === 'date');
        
        if (!hasDate) {
          await database.execAsync(`
            DROP TABLE IF EXISTS events;
            CREATE TABLE events (
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
            );
          `);
        }
      }
    },
    {
      name: '006_create_vendors_table',
      query: async (database: SQLite.SQLiteDatabase) => {
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(vendors)`);
        const hasNotes = tableInfo.some((col) => col.name === 'notes');
        
        if (!hasNotes) {
          // Drop if exists to recreate with strict new schema
          await database.execAsync(`
            DROP TABLE IF EXISTS vendors;
            CREATE TABLE vendors (
              id TEXT PRIMARY KEY,
              wedding_id TEXT NOT NULL,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              contact_person TEXT,
              phone TEXT,
              alternate_phone TEXT,
              email TEXT,
              address TEXT,
              notes TEXT,
              created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
              FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
            );
          `);
        }
      }
    },
    {
      name: '007_vendor_events_and_payments',
      query: async (database: SQLite.SQLiteDatabase) => {
        // 1. Alter vendors table to add agreed_amount if not exists
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(vendors)`);
        const hasAgreedAmount = tableInfo.some((col) => col.name === 'agreed_amount');
        if (!hasAgreedAmount) {
          await database.execAsync(`ALTER TABLE vendors ADD COLUMN agreed_amount REAL DEFAULT 0`);
        }

        // 2. Create vendor_events junction table
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS vendor_events (
            id TEXT PRIMARY KEY,
            vendor_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
            UNIQUE(vendor_id, event_id)
          );
        `);

        // 3. Create strictly defined payments table (drop if it exists to clean schema)
        await database.execAsync(`
          DROP TABLE IF EXISTS payments;
          CREATE TABLE payments (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            vendor_id TEXT NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            payment_date TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE,
            FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
          );
        `);
      }
    },
    {
      name: '008_expenses_and_budget',
      query: async (database: SQLite.SQLiteDatabase) => {
        // 1. Alter weddings table to add budget
        const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(weddings)`);
        const hasBudget = tableInfo.some((col) => col.name === 'budget');
        if (!hasBudget) {
          await database.execAsync(`ALTER TABLE weddings ADD COLUMN budget REAL DEFAULT NULL`);
        }

        // 2. Create strictly defined expenses table
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            date TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
        `);
      }
    },
    {
      name: '009_invitations',
      query: async (database: SQLite.SQLiteDatabase) => {
        // Create strict invitations table
        // Drops old one if it existed (since it was just a placeholder before)
        await database.execAsync(`DROP TABLE IF EXISTS invitations`);
        await database.execAsync(`DROP TABLE IF EXISTS invitation_deliveries`);
        
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS invitations (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            template_id TEXT NOT NULL,
            title TEXT NOT NULL,
            customization_data TEXT NOT NULL,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
        `);
      }
    },
    {
      name: '010_invitation_recipients',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS invitation_recipients (
            id TEXT PRIMARY KEY,
            invitation_id TEXT NOT NULL,
            guest_id TEXT NOT NULL,
            event_id TEXT,
            status TEXT NOT NULL CHECK(status IN ('NOT_SENT', 'QUEUED', 'SENDING', 'SENT', 'FAILED')),
            sent_at INTEGER,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE CASCADE,
            FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE SET NULL,
            UNIQUE(invitation_id, guest_id, event_id)
          );
        `);
      }
    },
    {
      name: '011_whatsapp_campaigns',
      query: async (database: SQLite.SQLiteDatabase) => {
        // Add campaign_id to invitation_recipients
        // SQLite ALTER TABLE ADD COLUMN is supported, but to add a foreign key we technically should recreate the table. 
        // Given SQLite constraints in Expo, we will just add the column without strict FK for now, or recreate.
        // Let's add the column since it's nullable.
        try {
          await database.execAsync(`ALTER TABLE invitation_recipients ADD COLUMN campaign_id TEXT`);
        } catch(e) {
          // Column might exist if migration ran partially
        }

        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS whatsapp_config (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            phone_number_id TEXT NOT NULL,
            access_token TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS invitation_campaigns (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            name TEXT NOT NULL,
            invitation_id TEXT NOT NULL,
            event_id TEXT,
            status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SENDING', 'COMPLETED')),
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE,
            FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE SET NULL
          );
        `);
      }
    },
    {
      name: '012_guest_groups_reorder',
      query: async (database: SQLite.SQLiteDatabase) => {
        try {
          await database.execAsync(`ALTER TABLE guest_groups ADD COLUMN sort_order INTEGER DEFAULT 0`);
        } catch(e) {
          // Column might exist
        }
      }
    },
    {
      name: '013_event_guests',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS event_guests (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            guest_id TEXT NOT NULL,
            rsvp_status TEXT DEFAULT 'PENDING',
            notes TEXT,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
            FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE,
            UNIQUE(event_id, guest_id)
          );
        `);
      }
    },
    {
      name: '014_indexes',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_guests_wedding_side ON guests(wedding_id, side);
          CREATE INDEX IF NOT EXISTS idx_guests_group ON guests(group_id);
          CREATE INDEX IF NOT EXISTS idx_event_guests_event ON event_guests(event_id);
          CREATE INDEX IF NOT EXISTS idx_event_guests_guest ON event_guests(guest_id);
          CREATE INDEX IF NOT EXISTS idx_room_assignments_guest ON room_assignments(guest_id);
          CREATE INDEX IF NOT EXISTS idx_invitation_recipients_invitation ON invitation_recipients(invitation_id);
          CREATE INDEX IF NOT EXISTS idx_invitation_recipients_guest ON invitation_recipients(guest_id);
        `);
      }
    },
    {
      name: '015_ai_chat',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS ai_messages (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'model')),
            content TEXT NOT NULL,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_ai_messages_wedding ON ai_messages(wedding_id);
        `);
      }
    },
    {
      name: '016_sync_metadata',
      query: async (database: SQLite.SQLiteDatabase) => {
        // Tables that will be synced to cloud
        const tablesToSync = [
          'weddings', 'guest_groups', 'guests', 'hotels', 'rooms', 
          'room_assignments', 'events', 'vendors', 'vendor_events', 
          'payments', 'expenses', 'invitations', 'invitation_recipients',
          'whatsapp_config', 'invitation_campaigns', 'event_guests', 'ai_messages',
          'reminders', 'notifications', 'user_preferences'
        ];

        for (const tableName of tablesToSync) {
          // Wrap in try-catch in case columns already exist or table doesn't exist
          try {
            await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN sync_status TEXT DEFAULT 'pending'`);
          } catch(e) {}
          
          try {
            await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN last_synced_at INTEGER DEFAULT NULL`);
          } catch(e) {}
          
          try {
            await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN deleted_at INTEGER DEFAULT NULL`);
          } catch(e) {}
        }
      }
    },
    {
      name: '017_sync_queue',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation_type TEXT NOT NULL CHECK(operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
            retry_count INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'FAILED', 'CONFLICT')),
            error_info TEXT,
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            last_attempted_at INTEGER DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
        `);
      }
    },
    {
      name: '018_reminders',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('EVENT', 'PAYMENT', 'ROOM', 'INVITATION', 'RSVP', 'CUSTOM')),
            reference_id TEXT,
            title TEXT NOT NULL,
            notes TEXT,
            reminder_time INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'DELIVERED', 'CANCELLED')),
            notification_id TEXT,
            
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            sync_status TEXT DEFAULT 'pending',
            last_synced_at INTEGER DEFAULT NULL,
            deleted_at INTEGER DEFAULT NULL,
            
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_reminders_wedding ON reminders(wedding_id);
          CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time);
        `);
      }
    },
    {
      name: '019_notifications',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('EVENT', 'PAYMENT', 'ROOM', 'INVITATION', 'RSVP', 'CUSTOM', 'SYNC')),
            reference_id TEXT,
            title TEXT NOT NULL,
            body TEXT,
            is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
            
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            sync_status TEXT DEFAULT 'pending',
            last_synced_at INTEGER DEFAULT NULL,
            deleted_at INTEGER DEFAULT NULL,
            
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_notifications_wedding ON notifications(wedding_id);
          CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
        `);
      }
    },
    {
      name: '020_user_preferences',
      query: async (database: SQLite.SQLiteDatabase) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            id TEXT PRIMARY KEY,
            wedding_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            
            created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
            sync_status TEXT DEFAULT 'pending',
            last_synced_at INTEGER DEFAULT NULL,
            deleted_at INTEGER DEFAULT NULL,
            
            UNIQUE(wedding_id, key),
            FOREIGN KEY (wedding_id) REFERENCES weddings (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_user_prefs_wedding ON user_preferences(wedding_id);
        `);
      }
    },
    {
      name: '021_wedding_profile',
      query: async (database: SQLite.SQLiteDatabase) => {
        try {
          await database.execAsync(`ALTER TABLE weddings ADD COLUMN bride_photo_uri TEXT`);
        } catch(e) {}
        try {
          await database.execAsync(`ALTER TABLE weddings ADD COLUMN groom_photo_uri TEXT`);
        } catch(e) {}
        try {
          await database.execAsync(`ALTER TABLE weddings ADD COLUMN city TEXT`);
        } catch(e) {}
      }
    }
  ];

  for (const migration of migrations) {
    const isApplied = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM migrations WHERE name = ?',
      [migration.name]
    );

    if (!isApplied) {
      await db.withTransactionAsync(async () => {
        if (typeof migration.query === 'function') {
          await migration.query(db);
        } else {
          await db.execAsync(migration.query);
        }
        await db.runAsync('INSERT INTO migrations (name) VALUES (?)', [migration.name]);
      });
      console.log(`Applied migration: ${migration.name}`);
    }
  }
};
