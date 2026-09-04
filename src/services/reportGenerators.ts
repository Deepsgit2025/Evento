import * as SQLite from 'expo-sqlite';
import { ExportService } from './exportService';
import { Guest, Event, Vendor, Payment, Expense, Room, RoomAssignment } from '../database/types';

const generateBaseHTML = (title: string, weddingName: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .wedding-name {
      font-size: 24px;
      font-weight: 700;
      color: #6366f1; /* Brand color */
      margin: 0 0 5px 0;
    }
    .report-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 10px 0;
    }
    .meta {
      font-size: 14px;
      color: #6b7280;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 14px;
    }
    th {
      background-color: #f9fafb;
      color: #374151;
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      color: #4b5563;
    }
    tr:nth-child(even) {
      background-color: #fdfdfd;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef9c3; color: #854d0e; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    .badge-default { background: #f3f4f6; color: #374151; }
    
    .summary-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      flex: 1;
      border: 1px solid #e5e7eb;
    }
    .summary-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 class="wedding-name">${weddingName}</h2>
    <h1 class="report-title">${title}</h1>
    <div class="meta">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  ${content}
</body>
</html>
`;

export const ReportGenerators = {
  
  async exportGuestList(db: SQLite.SQLiteDatabase, weddingId: string, format: 'PDF' | 'CSV', weddingName: string) {
    const guests = await db.getAllAsync<any>(
      `SELECT g.full_name, g.phone, g.side, g.party_size, g.rsvp_status, g.notes, gr.name as group_name
       FROM guests g
       LEFT JOIN guest_groups gr ON g.group_id = gr.id
       WHERE g.wedding_id = ? AND g.deleted_at IS NULL
       ORDER BY g.side, gr.sort_order, g.full_name`,
      [weddingId]
    );

    if (format === 'CSV') {
      const csvData = guests.map(g => ({
        'Full Name': g.full_name,
        'Phone': g.phone || '',
        'Side': g.side,
        'Group': g.group_name || '',
        'Party Size': g.party_size,
        'RSVP': g.rsvp_status,
        'Notes': g.notes || ''
      }));
      return ExportService.exportToCSV(csvData, 'Guest_List');
    }

    // PDF
    const totalGuests = guests.reduce((sum, g) => sum + g.party_size, 0);
    const attending = guests.filter(g => g.rsvp_status === 'ATTENDING').reduce((sum, g) => sum + g.party_size, 0);
    
    const getRSVPBadge = (status: string) => {
      switch(status) {
        case 'ATTENDING': return '<span class="badge badge-success">Attending</span>';
        case 'PENDING': return '<span class="badge badge-warning">Pending</span>';
        case 'DECLINED': return '<span class="badge badge-error">Declined</span>';
        default: return '<span class="badge badge-default">Maybe</span>';
      }
    };

    let tableRows = guests.map(g => `
      <tr>
        <td><strong>${g.full_name}</strong></td>
        <td>${g.phone || '-'}</td>
        <td>${g.side}</td>
        <td>${g.group_name || '-'}</td>
        <td>${g.party_size}</td>
        <td>${getRSVPBadge(g.rsvp_status)}</td>
      </tr>
    `).join('');

    const content = `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Guests</div>
          <div class="summary-value">${totalGuests}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Attending</div>
          <div class="summary-value">${attending}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Side</th>
            <th>Group</th>
            <th>Size</th>
            <th>RSVP</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="6" style="text-align:center">No guests found</td></tr>'}
        </tbody>
      </table>
    `;
    
    return ExportService.exportToPDF(generateBaseHTML('Guest List', weddingName, content), 'Guest_List');
  },

  async exportRoomAllocations(db: SQLite.SQLiteDatabase, weddingId: string, format: 'PDF' | 'CSV', weddingName: string) {
    const allocations = await db.getAllAsync<any>(
      `SELECT h.name as hotel_name, r.room_number, r.room_type, r.capacity, g.full_name as guest_name, g.party_size
       FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       LEFT JOIN room_assignments ra ON r.id = ra.room_id AND ra.deleted_at IS NULL
       LEFT JOIN guests g ON ra.guest_id = g.id AND g.deleted_at IS NULL
       WHERE h.wedding_id = ? AND r.deleted_at IS NULL AND h.deleted_at IS NULL
       ORDER BY h.name, r.room_number`,
      [weddingId]
    );

    if (format === 'CSV') {
      const csvData = allocations.map(a => ({
        'Hotel': a.hotel_name,
        'Room Number': a.room_number,
        'Type': a.room_type || '',
        'Capacity': a.capacity,
        'Assigned Guest': a.guest_name || 'Unassigned',
        'Party Size': a.party_size || ''
      }));
      return ExportService.exportToCSV(csvData, 'Room_Allocations');
    }

    let tableRows = allocations.map(a => `
      <tr>
        <td>${a.hotel_name}</td>
        <td><strong>${a.room_number}</strong></td>
        <td>${a.room_type || '-'}</td>
        <td>${a.capacity}</td>
        <td>${a.guest_name || '<span style="color:#9ca3af">Unassigned</span>'}</td>
      </tr>
    `).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>Hotel</th>
            <th>Room #</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Assigned Guest</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="5" style="text-align:center">No rooms found</td></tr>'}
        </tbody>
      </table>
    `;
    
    return ExportService.exportToPDF(generateBaseHTML('Room Allocations', weddingName, content), 'Room_Allocations');
  },

  async exportFinancialReport(db: SQLite.SQLiteDatabase, weddingId: string, format: 'PDF' | 'CSV', weddingName: string) {
    // We will combine Vendors and Expenses
    const vendors = await db.getAllAsync<any>(
      `SELECT v.name, v.category, v.agreed_amount, COALESCE(SUM(p.amount), 0) as paid
       FROM vendors v
       LEFT JOIN payments p ON v.id = p.vendor_id AND p.deleted_at IS NULL
       WHERE v.wedding_id = ? AND v.deleted_at IS NULL
       GROUP BY v.id
       ORDER BY v.category, v.name`,
      [weddingId]
    );

    const expenses = await db.getAllAsync<any>(
      `SELECT title, category, amount, date, payment_method
       FROM expenses
       WHERE wedding_id = ? AND deleted_at IS NULL
       ORDER BY date DESC`,
      [weddingId]
    );

    if (format === 'CSV') {
      const csvData = [
        ...vendors.map(v => ({
          'Type': 'Vendor',
          'Name/Title': v.name,
          'Category': v.category,
          'Amount/Agreed': v.agreed_amount,
          'Paid': v.paid,
          'Pending': Math.max(0, v.agreed_amount - v.paid)
        })),
        ...expenses.map(e => ({
          'Type': 'Expense',
          'Name/Title': e.title,
          'Category': e.category,
          'Amount/Agreed': e.amount,
          'Paid': e.amount,
          'Pending': 0
        }))
      ];
      return ExportService.exportToCSV(csvData, 'Financial_Report');
    }

    let vendorRows = vendors.map(v => `
      <tr>
        <td><strong>${v.name}</strong></td>
        <td>${v.category}</td>
        <td>₹${v.agreed_amount.toLocaleString()}</td>
        <td>₹${v.paid.toLocaleString()}</td>
        <td style="color:${(v.agreed_amount - v.paid) > 0 ? '#b91c1c' : '#15803d'}">
          ₹${Math.max(0, v.agreed_amount - v.paid).toLocaleString()}
        </td>
      </tr>
    `).join('');

    let expenseRows = expenses.map(e => `
      <tr>
        <td><strong>${e.title}</strong></td>
        <td>${e.category}</td>
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td>${e.payment_method}</td>
        <td>₹${e.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const content = `
      <h3>Vendor Agreements</h3>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Category</th>
            <th>Agreed Amount</th>
            <th>Paid</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
          ${vendorRows || '<tr><td colspan="5" style="text-align:center">No vendors found</td></tr>'}
        </tbody>
      </table>

      <h3>General Expenses</h3>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Date</th>
            <th>Method</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRows || '<tr><td colspan="5" style="text-align:center">No expenses found</td></tr>'}
        </tbody>
      </table>
    `;
    
    return ExportService.exportToPDF(generateBaseHTML('Financial Report', weddingName, content), 'Financial_Report');
  },

  async exportEventSchedule(db: SQLite.SQLiteDatabase, weddingId: string, format: 'PDF' | 'CSV', weddingName: string) {
    const events = await db.getAllAsync<any>(
      `SELECT name, event_type, date, start_time, end_time, location
       FROM events
       WHERE wedding_id = ? AND deleted_at IS NULL
       ORDER BY date, start_time`,
      [weddingId]
    );

    if (format === 'CSV') {
      const csvData = events.map(e => ({
        'Event Name': e.name,
        'Type': e.event_type || '',
        'Date': e.date ? new Date(e.date).toLocaleDateString() : '',
        'Start Time': e.start_time ? new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
        'End Time': e.end_time ? new Date(e.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
        'Location': e.location || ''
      }));
      return ExportService.exportToCSV(csvData, 'Event_Schedule');
    }

    let tableRows = events.map(e => `
      <tr>
        <td><strong>${e.name}</strong></td>
        <td>${e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
        <td>${e.start_time ? new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
        <td>${e.location || '-'}</td>
      </tr>
    `).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="4" style="text-align:center">No events found</td></tr>'}
        </tbody>
      </table>
    `;
    
    return ExportService.exportToPDF(generateBaseHTML('Event Schedule', weddingName, content), 'Event_Schedule');
  }
};
