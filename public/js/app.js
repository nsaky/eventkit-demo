/**
 * EventKit Demo — Frontend Client Logic
 */
'use strict';

// Application State
const state = {
  currentPage: 'overview',
  events: [],
  attendees: [],
  tickets: [],
  analytics: null,
  activeQRFormat: 'png'
};

// Page Meta Map
const pageTitles = {
  overview: { title: 'Overview Dashboard', subtitle: 'System metrics and recent event activity' },
  events: { title: 'Event Management', subtitle: 'Create, update, view, and organize persistent events' },
  attendees: { title: 'Attendee Directory', subtitle: 'Enrolled participants, ticket links, and admission state' },
  tickets: { title: 'Digital Tickets', subtitle: 'Cryptographic EK- identifiers, QR payloads, and lifecycles' },
  checkin: { title: 'Gate Check-in', subtitle: 'Real-time arrival verification and atomic check-in execution' },
  validation: { title: 'Non-Destructive Validation', subtitle: 'Verify authenticity and eligibility without admitting' },
  analytics: { title: 'Attendance Analytics', subtitle: 'Real-time headcounts, attendance percentages, and capacity fill' },
  export: { title: 'Data Export', subtitle: 'Export RFC 4180 CSV rosters and full JSON event snapshots' },
  about: { title: 'About EventKit', subtitle: 'Package specifications, architecture, and feature coverage' }
};

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileMenu();
  loadAllData();

  document.getElementById('btnRefreshData')?.addEventListener('click', () => {
    loadAllData(true);
  });
});

// Navigation Handling
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      if (page) {
        navigateToPage(page);
      }
    });
  });
}

function navigateToPage(pageName) {
  if (!pageTitles[pageName]) return;

  state.currentPage = pageName;

  // Update navigation items
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === pageName);
  });

  // Update sections
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `sec-${pageName}`);
  });

  // Update Header Title
  const meta = pageTitles[pageName];
  document.getElementById('currentPageTitle').textContent = meta.title;
  document.getElementById('currentPageSubtitle').textContent = meta.subtitle;

  // Close mobile sidebar if open
  document.getElementById('sidebar')?.classList.remove('open');

  // Page-specific trigger
  if (pageName === 'events') renderEventsTable();
  if (pageName === 'attendees') handleAttendeeSearch();
  if (pageName === 'tickets') loadTickets();
  if (pageName === 'checkin') updateCheckInDropdowns();
  if (pageName === 'validation') updateValidationDropdowns();
  if (pageName === 'analytics') renderAnalyticsPage();
  if (pageName === 'export') updateExportDropdowns();
}

function setupMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

// Global API Helper
async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } else {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `Request failed with status ${res.status}`);
      }
      return text;
    }
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// Load Core Data
async function loadAllData(showNotification = false) {
  try {
    // 1. Health check
    const health = await apiRequest('/api/health');
    const badge = document.getElementById('backendStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = `<span class="status-dot"></span> Backend Connected (${health.package.version})`;
    }

    // 2. Fetch events
    const eventsRes = await apiRequest('/api/events');
    state.events = eventsRes.data || [];

    // 3. Fetch analytics & overview
    const analyticsRes = await apiRequest('/api/analytics');
    state.analytics = analyticsRes.data || null;

    // 4. Update dropdowns across modals and pages
    populateAllEventDropdowns();

    // 5. Render active view
    renderOverviewDashboard();
    if (state.currentPage === 'events') renderEventsTable();
    if (state.currentPage === 'attendees') handleAttendeeSearch();
    if (state.currentPage === 'tickets') loadTickets();
    if (state.currentPage === 'analytics') renderAnalyticsPage();

    if (showNotification) {
      showToast('All records refreshed from EventKit storage.', 'success');
    }
  } catch (err) {
    const badge = document.getElementById('backendStatusBadge');
    if (badge) {
      badge.className = 'badge badge-danger';
      badge.innerHTML = `<span class="status-dot" style="background: var(--danger)"></span> Disconnected`;
    }
    showToast(`Error connecting to EventKit backend: ${err.message}`, 'error');
  }
}

// Populate event select elements across the whole app
function populateAllEventDropdowns() {
  const selects = [
    { id: 'attendeeEventFilter', includeAll: true, allLabel: 'All Events' },
    { id: 'ticketEventFilter', includeAll: true, allLabel: 'All Events' },
    { id: 'regEventSelect', includeAll: false, defaultLabel: '-- Choose Event --' },
    { id: 'checkInEventSelect', includeAll: false, defaultLabel: '-- Choose Event --' },
    { id: 'valEventSelect', includeAll: false, defaultLabel: '-- Choose Event --' },
    { id: 'analyticsEventSelect', includeAll: false, defaultLabel: '-- Select Event for Breakdown --' },
    { id: 'exportAttendeesEventSelect', includeAll: false, defaultLabel: '-- Choose Event --' },
    { id: 'exportEventSelect', includeAll: false, defaultLabel: '-- Choose Event --' }
  ];

  selects.forEach(({ id, includeAll, allLabel, defaultLabel }) => {
    const el = document.getElementById(id);
    if (!el) return;

    const currentVal = el.value;
    el.innerHTML = '';

    if (includeAll) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = allLabel;
      el.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = defaultLabel;
      el.appendChild(opt);
    }

    state.events.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = `${ev.name} (${ev.date})`;
      el.appendChild(opt);
    });

    if (currentVal && state.events.some(e => e.id === currentVal)) {
      el.value = currentVal;
    }
  });
}

// =================== SECTION 1: OVERVIEW DASHBOARD ===================
function renderOverviewDashboard() {
  if (!state.analytics) return;

  const s = state.analytics.summary;
  document.getElementById('statTotalEvents').textContent = s.totalEvents;
  document.getElementById('statTotalAttendees').textContent = s.totalAttendees;
  document.getElementById('statTotalTickets').textContent = s.totalTickets;
  document.getElementById('statTotalCheckedIn').textContent = s.totalCheckedIn;
  document.getElementById('statActiveTickets').textContent = s.activeTickets;
  document.getElementById('statAttendanceRate').textContent = `${s.attendanceRate}%`;

  // Render overview events table
  const tbody = document.getElementById('overviewEventsBody');
  if (state.events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <p class="empty-title">No events created yet</p>
            <p class="empty-text">Create your first event using EventKit to start issuing tickets and tracking attendees.</p>
            <button class="btn btn-primary btn-sm" onclick="openCreateEventModal()">Create First Event</button>
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = state.events.map(ev => {
      const reg = ev.stats ? ev.stats.totalRegistrations : 0;
      const checkedIn = ev.stats ? ev.stats.totalCheckedIn : 0;
      const attPct = ev.stats ? ev.stats.attendancePercentage : 0;
      const capText = ev.capacity !== null ? ev.capacity : 'Unlimited';

      return `
        <tr>
          <td><strong>${escapeHtml(ev.name)}</strong></td>
          <td>${escapeHtml(ev.date)}</td>
          <td>${escapeHtml(ev.location || 'N/A')}</td>
          <td><span class="badge badge-neutral">${capText}</span></td>
          <td>${reg} registered</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12.5px; font-weight: 600;">${attPct}%</span>
              <span style="font-size: 11.5px; color: var(--text-secondary);">(${checkedIn}/${reg})</span>
            </div>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="viewEventDetails('${ev.id}')">View</button>
            <button class="btn btn-primary btn-sm" onclick="openRegisterForEvent('${ev.id}')">Register</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render recent registrations
  const regBody = document.getElementById('recentRegistrationsBody');
  const recentAttendees = state.analytics.recentActivity.recentAttendees || [];
  if (recentAttendees.length === 0) {
    regBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 16px;">No registrations recorded yet.</td></tr>`;
  } else {
    regBody.innerHTML = recentAttendees.map(a => `
      <tr>
        <td>
          <div style="font-weight: 600;">${escapeHtml(a.name)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${escapeHtml(a.email)}</div>
        </td>
        <td>${escapeHtml(a.eventName)}</td>
        <td><code style="font-family: monospace; font-weight: 600; color: var(--primary-blue);">${a.ticket ? a.ticket.id : 'N/A'}</code></td>
      </tr>
    `).join('');
  }

  // Render recent check-ins
  const checkInBody = document.getElementById('recentCheckInsBody');
  const recentCheckIns = state.analytics.recentActivity.recentCheckIns || [];
  if (recentCheckIns.length === 0) {
    checkInBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 16px;">No gate admissions yet.</td></tr>`;
  } else {
    checkInBody.innerHTML = recentCheckIns.map(a => `
      <tr>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td><code style="font-family: monospace; font-weight: 600; color: var(--primary-blue);">${a.ticket ? a.ticket.id : 'N/A'}</code></td>
        <td style="font-size: 12px; color: var(--text-secondary);">${formatTime(a.checkedInAt)}</td>
      </tr>
    `).join('');
  }
}

// =================== SECTION 2: EVENT MANAGEMENT ===================
function renderEventsTable() {
  const tbody = document.getElementById('eventsListBody');
  if (state.events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <p class="empty-title">No events found in storage</p>
            <p class="empty-text">Create an event using EventKit's persistent storage engine.</p>
            <button class="btn btn-primary btn-sm" onclick="openCreateEventModal()">Create Event</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.events.map(ev => {
    const reg = ev.stats ? ev.stats.totalRegistrations : 0;
    const capText = ev.capacity !== null ? ev.capacity : 'Unlimited';

    return `
      <tr>
        <td><code style="font-family: monospace; font-size: 11.5px; color: var(--text-secondary);">${ev.id}</code></td>
        <td><strong>${escapeHtml(ev.name)}</strong></td>
        <td>${escapeHtml(ev.date)}</td>
        <td>${escapeHtml(ev.location || 'N/A')}</td>
        <td><span class="badge badge-neutral">${capText}</span></td>
        <td><span class="badge badge-info">${reg} attendees</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewEventDetails('${ev.id}')">View</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditEventModal('${ev.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteEvent('${ev.id}', '${escapeHtml(ev.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateEventModal() {
  document.getElementById('createEventForm').reset();
  openModal('createEventModal');
}

async function handleCreateEventSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('evName').value.trim();
  const date = document.getElementById('evDate').value;
  const capacity = document.getElementById('evCapacity').value;
  const location = document.getElementById('evLocation').value.trim();
  const description = document.getElementById('evDescription').value.trim();

  try {
    const res = await apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        name,
        date,
        capacity: capacity ? Number(capacity) : null,
        location,
        description
      })
    });

    closeModal('createEventModal');
    showToast(`Event '${res.data.name}' created in EventKit!`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(`Failed to create event: ${err.message}`, 'error');
  }
}

async function viewEventDetails(eventId) {
  try {
    const res = await apiRequest(`/api/events/${eventId}`);
    const ev = res.data;

    document.getElementById('viewEvTitle').textContent = ev.name;

    const stats = ev.stats || { totalRegistrations: 0, totalCheckedIn: 0, attendancePercentage: 0 };
    const capDisplay = ev.capacity !== null ? ev.capacity : 'Unlimited';

    const attendeesHtml = ev.attendees && ev.attendees.length > 0
      ? `
        <table class="table" style="margin-top: 12px;">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${ev.attendees.map(a => `
              <tr>
                <td><strong>${escapeHtml(a.name)}</strong></td>
                <td>${escapeHtml(a.email)}</td>
                <td>
                  <span class="badge ${a.checkedIn ? 'badge-success' : 'badge-warning'}">
                    ${a.checkedIn ? 'CHECKED IN' : 'PENDING'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="closeModal('viewEventModal'); viewAttendeeDetails('${a.id}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : `<p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">No attendees registered yet for this event.</p>`;

    document.getElementById('viewEvContent').innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Event ID</div>
          <code style="font-family: monospace; font-size: 12px;">${ev.id}</code>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Date & Location</div>
          <div style="font-weight: 600;">${escapeHtml(ev.date)} &bull; ${escapeHtml(ev.location || 'N/A')}</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Description</div>
        <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(ev.description || 'No description provided.')}</p>
      </div>

      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card" style="padding: 14px;">
          <span class="stat-title">Capacity</span>
          <span class="stat-value" style="font-size: 20px;">${capDisplay}</span>
        </div>
        <div class="stat-card" style="padding: 14px;">
          <span class="stat-title">Registered</span>
          <span class="stat-value" style="font-size: 20px;">${stats.totalRegistrations}</span>
        </div>
        <div class="stat-card" style="padding: 14px;">
          <span class="stat-title">Checked In</span>
          <span class="stat-value" style="font-size: 20px; color: var(--success);">${stats.totalCheckedIn}</span>
        </div>
        <div class="stat-card" style="padding: 14px;">
          <span class="stat-title">Attendance</span>
          <span class="stat-value" style="font-size: 20px;">${stats.attendancePercentage}%</span>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-size: 14px; font-weight: 700;">Registered Participants (${ev.attendees ? ev.attendees.length : 0})</h4>
          <button class="btn btn-primary btn-sm" onclick="closeModal('viewEventModal'); openRegisterForEvent('${ev.id}')">Register New</button>
        </div>
        ${attendeesHtml}
      </div>
    `;

    openModal('viewEventModal');
  } catch (err) {
    showToast(`Failed to load event details: ${err.message}`, 'error');
  }
}

async function openEditEventModal(eventId) {
  try {
    const res = await apiRequest(`/api/events/${eventId}`);
    const ev = res.data;

    document.getElementById('editEvId').value = ev.id;
    document.getElementById('editEvName').value = ev.name;
    document.getElementById('editEvDate').value = ev.date;
    document.getElementById('editEvCapacity').value = ev.capacity !== null ? ev.capacity : '';
    document.getElementById('editEvLocation').value = ev.location || '';
    document.getElementById('editEvDescription').value = ev.description || '';

    openModal('editEventModal');
  } catch (err) {
    showToast(`Failed to fetch event: ${err.message}`, 'error');
  }
}

async function handleEditEventSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editEvId').value;
  const name = document.getElementById('editEvName').value.trim();
  const date = document.getElementById('editEvDate').value;
  const capacity = document.getElementById('editEvCapacity').value;
  const location = document.getElementById('editEvLocation').value.trim();
  const description = document.getElementById('editEvDescription').value.trim();

  try {
    const res = await apiRequest(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        date,
        capacity: capacity ? Number(capacity) : null,
        location,
        description
      })
    });

    closeModal('editEventModal');
    showToast(`Event '${res.data.name}' updated!`, 'success');
    await loadAllData();
  } catch (err) {
    showToast(`Failed to update event: ${err.message}`, 'error');
  }
}

function confirmDeleteEvent(eventId, eventName) {
  confirmDialog(
    'Delete Event',
    `Are you sure you want to delete event "${eventName}"? EventKit will cascade-delete all registered attendees and their associated tickets permanently from JSON storage.`,
    async () => {
      try {
        await apiRequest(`/api/events/${eventId}`, { method: 'DELETE' });
        showToast(`Event "${eventName}" and all linked records deleted.`, 'success');
        await loadAllData();
      } catch (err) {
        showToast(`Failed to delete event: ${err.message}`, 'error');
      }
    }
  );
}

// =================== SECTION 3: ATTENDEE MANAGEMENT ===================
let searchDebounceTimer = null;

function handleAttendeeSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    const query = document.getElementById('attendeeSearchInput')?.value || '';
    const eventId = document.getElementById('attendeeEventFilter')?.value || '';
    const checkedIn = document.getElementById('attendeeStatusFilter')?.value || '';

    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (eventId) params.append('eventId', eventId);
    if (checkedIn !== '') params.append('checkedIn', checkedIn);

    try {
      const res = await apiRequest(`/api/search/attendees?${params.toString()}`);
      renderAttendeesList(res.data || []);
    } catch (err) {
      console.error('Failed to search attendees:', err);
    }
  }, 200);
}

function renderAttendeesList(attendees) {
  const tbody = document.getElementById('attendeesListBody');
  if (attendees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <p class="empty-title">No attendees found</p>
            <p class="empty-text">No attendees match your filter or search criteria.</p>
            <button class="btn btn-primary btn-sm" onclick="openRegisterAttendeeModal()">Register Attendee</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = attendees.map(a => {
    const ticketId = a.ticket ? a.ticket.id : 'N/A';
    const isChecked = a.checkedIn;

    return `
      <tr>
        <td><code style="font-family: monospace; font-size: 11.5px; color: var(--text-secondary);">${a.id}</code></td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td>${escapeHtml(a.email)}</td>
        <td>${escapeHtml(a.eventName || 'N/A')}</td>
        <td>
          <a href="javascript:void(0)" onclick="viewTicketDetails('${ticketId}')" style="font-family: monospace; font-weight: 600; color: var(--primary-blue);">
            ${ticketId}
          </a>
        </td>
        <td>
          <span class="badge ${isChecked ? 'badge-success' : 'badge-warning'}">
            ${isChecked ? 'CHECKED IN' : 'PENDING'}
          </span>
        </td>
        <td style="font-size: 12px; color: var(--text-secondary);">${formatTime(a.registeredAt)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewAttendeeDetails('${a.id}')">View</button>
            <button class="btn btn-danger btn-sm" onclick="confirmRemoveAttendee('${a.id}', '${escapeHtml(a.name)}')">Remove</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openRegisterAttendeeModal() {
  document.getElementById('registerAttendeeForm').reset();
  openModal('registerAttendeeModal');
}

function openRegisterForEvent(eventId) {
  openRegisterAttendeeModal();
  const select = document.getElementById('regEventSelect');
  if (select) select.value = eventId;
}

async function handleRegisterAttendeeSubmit(e) {
  e.preventDefault();
  const eventId = document.getElementById('regEventSelect').value;
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();

  try {
    const res = await apiRequest('/api/attendees', {
      method: 'POST',
      body: JSON.stringify({ eventId, name, email, phone })
    });

    closeModal('registerAttendeeModal');
    showToast(`Registered '${res.data.name}'! Ticket: ${res.data.ticket ? res.data.ticket.id : ''}`, 'success');
    await loadAllData();

    // Auto open ticket view for the new ticket
    if (res.data.ticket) {
      viewTicketDetails(res.data.ticket.id);
    }
  } catch (err) {
    showToast(`Registration failed: ${err.message}`, 'error');
  }
}

async function viewAttendeeDetails(attendeeId) {
  try {
    const res = await apiRequest(`/api/attendees/${attendeeId}`);
    const a = res.data;
    const ticket = a.ticket;
    const ev = a.event;

    document.getElementById('viewAttendeeContent').innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background-color: #FAFAFC; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 18px; font-weight: 700; color: var(--primary-dark);">${escapeHtml(a.name)}</div>
          <div style="color: var(--text-secondary); font-size: 13.5px; margin-top: 2px;">${escapeHtml(a.email)} ${a.phone ? `&bull; ${escapeHtml(a.phone)}` : ''}</div>
          <div style="margin-top: 8px;">
            <span class="badge ${a.checkedIn ? 'badge-success' : 'badge-warning'}">
              ${a.checkedIn ? `Admitted at ${formatTime(a.checkedInAt)}` : 'Admission Pending'}
            </span>
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Associated Event</div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">${escapeHtml(ev ? ev.name : a.eventId)}</div>
          <div style="font-size: 12.5px; color: var(--text-secondary);">${escapeHtml(ev ? ev.date : '')} &bull; ${escapeHtml(ev ? ev.location : '')}</div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Issued Digital Ticket</div>
          ${ticket ? `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md); margin-top: 6px;">
              <div>
                <code style="font-family: monospace; font-size: 14px; font-weight: 700; color: var(--primary-blue);">${ticket.id}</code>
                <div style="font-size: 12px; color: var(--text-secondary);">Status: <strong>${ticket.status}</strong></div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="closeModal('viewAttendeeModal'); viewTicketDetails('${ticket.id}')">View Ticket &amp; QR</button>
            </div>
          ` : '<p style="color: var(--text-secondary); font-size: 13px;">No ticket record found.</p>'}
        </div>

        <div style="font-size: 11.5px; color: var(--text-muted);">
          Registered at: ${formatTime(a.registeredAt)} &bull; Attendee ID: <code>${a.id}</code>
        </div>
      </div>
    `;

    openModal('viewAttendeeModal');
  } catch (err) {
    showToast(`Failed to load attendee details: ${err.message}`, 'error');
  }
}

function confirmRemoveAttendee(attendeeId, attendeeName) {
  confirmDialog(
    'Remove Attendee',
    `Are you sure you want to remove attendee "${attendeeName}"? EventKit will remove their record and cascade-delete their issued ticket.`,
    async () => {
      try {
        await apiRequest(`/api/attendees/${attendeeId}`, { method: 'DELETE' });
        showToast(`Attendee "${attendeeName}" removed.`, 'success');
        await loadAllData();
      } catch (err) {
        showToast(`Failed to remove attendee: ${err.message}`, 'error');
      }
    }
  );
}

// =================== SECTION 4: DIGITAL TICKETS ===================
async function loadTickets() {
  const eventFilter = document.getElementById('ticketEventFilter')?.value || '';
  const url = eventFilter ? `/api/tickets?eventId=${eventFilter}` : '/api/tickets';

  try {
    const res = await apiRequest(url);
    state.tickets = res.data || [];
    filterTicketStatus();
  } catch (err) {
    showToast(`Failed to load tickets: ${err.message}`, 'error');
  }
}

function filterTicketStatus() {
  const statusFilter = document.getElementById('ticketStatusFilter')?.value || '';
  const filtered = statusFilter
    ? state.tickets.filter(t => t.status === statusFilter)
    : state.tickets;

  renderTicketsTable(filtered);
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsListBody');
  if (tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <p class="empty-title">No tickets issued yet</p>
            <p class="empty-text">Tickets are automatically generated when attendees register.</p>
            <button class="btn btn-primary btn-sm" onclick="openRegisterAttendeeModal()">Register an Attendee</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    let badgeClass = 'badge-success';
    if (t.status === 'USED') badgeClass = 'badge-info';
    if (t.status === 'CANCELLED') badgeClass = 'badge-danger';

    return `
      <tr>
        <td>
          <code style="font-family: monospace; font-weight: 700; color: var(--primary-blue); font-size: 13px;">${t.id}</code>
        </td>
        <td><strong>${escapeHtml(t.eventName || t.eventId)}</strong></td>
        <td>${escapeHtml(t.attendeeName || 'Unknown')}</td>
        <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(t.attendeeEmail || '')}</td>
        <td><span class="badge ${badgeClass}">${t.status}</span></td>
        <td style="font-size: 12px; color: var(--text-secondary);">${formatTime(t.createdAt)}</td>
        <td>
          <span class="badge ${t.checkedInAt ? 'badge-success' : 'badge-neutral'}">
            ${t.checkedInAt ? 'ADMITTED' : 'NOT ARRIVED'}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewTicketDetails('${t.id}')">Inspect &amp; QR</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function viewTicketDetails(ticketId) {
  try {
    const res = await apiRequest(`/api/tickets/${ticketId}`);
    const t = res.data;
    const a = t.attendee || { name: 'Unknown', email: '' };
    const ev = t.event || { name: 'Unknown', date: '', location: '' };

    document.getElementById('viewTicketTitle').textContent = `Ticket: ${t.id}`;

    let statusBadge = 'badge-success';
    if (t.status === 'USED') statusBadge = 'badge-info';
    if (t.status === 'CANCELLED') statusBadge = 'badge-danger';

    document.getElementById('viewTicketContent').innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <div style="background-color: #FAFAFC; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <code style="font-family: monospace; font-size: 15px; font-weight: 700; color: var(--primary-blue);">${t.id}</code>
              <span class="badge ${statusBadge}">${t.status}</span>
            </div>
            <div style="font-size: 14px; font-weight: 600;">${escapeHtml(a.name)}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(a.email)}</div>
          </div>

          <div style="font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
            <div><strong>Event:</strong> ${escapeHtml(ev.name)}</div>
            <div><strong>Date:</strong> ${escapeHtml(ev.date)}</div>
            <div><strong>Location:</strong> ${escapeHtml(ev.location || 'N/A')}</div>
            <div><strong>Issued:</strong> ${formatTime(t.createdAt)}</div>
            <div><strong>Admitted:</strong> ${t.checkedInAt ? formatTime(t.checkedInAt) : 'Not checked in'}</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="validateTicketQuick('${t.eventId}', '${t.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              Run Non-Destructive Validation
            </button>
            ${t.status === 'ACTIVE' ? `
              <button class="btn btn-primary btn-sm" onclick="checkInTicketQuick('${t.eventId}', '${t.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Check In Attendee Now
              </button>
              <button class="btn btn-danger btn-sm" onclick="confirmCancelTicket('${t.id}')">
                Cancel Ticket
              </button>
            ` : ''}
          </div>
        </div>

        <div>
          <div style="text-align: center;">
            <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">
              EventKit QR Code
            </div>
            
            <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <button class="btn btn-sm ${state.activeQRFormat === 'png' ? 'btn-primary' : 'btn-secondary'}" onclick="setTicketQRFormat('${t.id}', 'png')">PNG</button>
              <button class="btn btn-sm ${state.activeQRFormat === 'svg' ? 'btn-primary' : 'btn-secondary'}" onclick="setTicketQRFormat('${t.id}', 'svg')">SVG</button>
            </div>

            <div class="qr-preview-box" id="ticketQrPreviewContainer">
              <img src="/api/tickets/${t.id}/qr?format=${state.activeQRFormat}&width=240" alt="Ticket QR" class="qr-image" id="ticketQrImg">
            </div>

            <a href="/api/tickets/${t.id}/qr?format=${state.activeQRFormat}&width=400&download=true" class="btn btn-secondary btn-sm" style="width: 100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download QR Code (${state.activeQRFormat.toUpperCase()})
            </a>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Encodes non-PII { ticketId, eventId }</div>
          </div>
        </div>
      </div>
    `;

    openModal('viewTicketModal');
  } catch (err) {
    showToast(`Failed to load ticket details: ${err.message}`, 'error');
  }
}

function setTicketQRFormat(ticketId, format) {
  state.activeQRFormat = format;
  viewTicketDetails(ticketId);
}

function confirmCancelTicket(ticketId) {
  confirmDialog(
    'Cancel Ticket',
    `Are you sure you want to cancel ticket "${ticketId}"? Once cancelled by EventKit, the ticket will be permanently rejected during gate validation and check-in.`,
    async () => {
      try {
        await apiRequest(`/api/tickets/${ticketId}/cancel`, { method: 'POST' });
        showToast(`Ticket "${ticketId}" marked as CANCELLED in EventKit.`, 'success');
        closeModal('viewTicketModal');
        await loadAllData();
      } catch (err) {
        showToast(`Cancellation failed: ${err.message}`, 'error');
      }
    }
  );
}

// =================== SECTION 5: GATE CHECK-IN ===================
function updateCheckInDropdowns() {
  const select = document.getElementById('checkInEventSelect');
  if (select && select.value) {
    loadEventQuickTickets(select.value);
  }
  loadGateHistory();
}

async function loadEventQuickTickets(eventId) {
  const tbody = document.getElementById('quickPickTicketsBody');
  if (!eventId) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 16px;">Select an event on the left to see tickets.</td></tr>`;
    return;
  }

  try {
    const res = await apiRequest(`/api/tickets?eventId=${eventId}`);
    const active = (res.data || []).filter(t => t.status === 'ACTIVE');

    if (active.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 16px;">No pending active tickets for this event.</td></tr>`;
      return;
    }

    tbody.innerHTML = active.map(t => `
      <tr>
        <td><strong>${escapeHtml(t.attendeeName)}</strong></td>
        <td><code style="font-family: monospace; font-weight: 600; color: var(--primary-blue);">${t.id}</code></td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="selectQuickTicket('${t.id}')">Select</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color: var(--danger); text-align: center;">Error loading tickets</td></tr>`;
  }
}

function selectQuickTicket(ticketId) {
  document.getElementById('checkInTicketId').value = ticketId;
  document.getElementById('checkInTicketId').focus();
}

async function handleCheckInSubmit(e) {
  e.preventDefault();
  const eventId = document.getElementById('checkInEventSelect').value;
  const ticketId = document.getElementById('checkInTicketId').value.trim().toUpperCase();
  const resultBox = document.getElementById('checkInResultBox');

  resultBox.style.display = 'none';

  try {
    const res = await apiRequest('/api/tickets/check-in', {
      method: 'POST',
      body: JSON.stringify({ eventId, ticketId })
    });

    const d = res.data;
    resultBox.className = 'result-card result-valid';
    resultBox.innerHTML = `
      <div class="result-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        ADMISSION SUCCESSFUL
      </div>
      <div class="result-message">${escapeHtml(res.message)}</div>
      <div style="font-size: 13px; line-height: 1.6;">
        <div><strong>Attendee:</strong> ${escapeHtml(d.attendeeName)}</div>
        <div><strong>Ticket ID:</strong> <code>${d.ticketId}</code></div>
        <div><strong>Time:</strong> ${formatTime(d.checkedInAt)}</div>
      </div>
    `;
    resultBox.style.display = 'block';

    showToast(`Checked in: ${d.attendeeName}`, 'success');

    // Refresh data
    await loadAllData();
    loadEventQuickTickets(eventId);
    loadGateHistory();
  } catch (err) {
    resultBox.className = 'result-card result-invalid';
    resultBox.innerHTML = `
      <div class="result-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
        CHECK-IN REJECTED
      </div>
      <div class="result-message">${escapeHtml(err.message)}</div>
    `;
    resultBox.style.display = 'block';
    showToast(`Admission rejected: ${err.message}`, 'error');
  }
}

async function checkInTicketQuick(eventId, ticketId) {
  closeModal('viewTicketModal');
  navigateToPage('checkin');
  document.getElementById('checkInEventSelect').value = eventId;
  document.getElementById('checkInTicketId').value = ticketId;
  loadEventQuickTickets(eventId);
}

async function loadGateHistory() {
  const tbody = document.getElementById('checkInHistoryBody');
  const allTickets = state.tickets || [];
  const used = allTickets.filter(t => t.checkedInAt).sort((a, b) => new Date(b.checkedInAt) - new Date(a.checkedInAt));

  if (used.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 16px; color: var(--text-muted);">No admissions recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = used.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.attendeeName || 'Unknown')}</strong></td>
      <td><code style="font-family: monospace; font-weight: 600; color: var(--primary-blue);">${t.id}</code></td>
      <td>${escapeHtml(t.eventName || t.eventId)}</td>
      <td style="font-size: 12.5px;">${formatTime(t.checkedInAt)}</td>
      <td><span class="badge badge-success">ADMITTED</span></td>
    </tr>
  `).join('');
}

// =================== SECTION 6: TICKET VALIDATION ===================
function updateValidationDropdowns() {
  // dropdowns already populated
}

async function handleValidationSubmit(e) {
  e.preventDefault();
  const eventId = document.getElementById('valEventSelect').value;
  const ticketId = document.getElementById('valTicketId').value.trim().toUpperCase();
  const resultBox = document.getElementById('validationResultBox');

  resultBox.style.display = 'none';

  try {
    const res = await apiRequest('/api/tickets/validate', {
      method: 'POST',
      body: JSON.stringify({ eventId, ticketId })
    });

    const d = res.data;
    let cardClass = 'result-card ';
    let badgeClass = 'badge ';

    if (d.status === 'VALID') {
      cardClass += 'result-valid';
      badgeClass += 'badge-success';
    } else if (d.status === 'ALREADY_CHECKED_IN' || d.status === 'WRONG_EVENT') {
      cardClass += 'result-warning';
      badgeClass += 'badge-warning';
    } else {
      cardClass += 'result-invalid';
      badgeClass += 'badge-danger';
    }

    resultBox.className = cardClass;
    resultBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="result-title">
          STATUS: <span class="${badgeClass}">${d.status}</span>
        </span>
        <span style="font-size: 12px; font-weight: 600;">Valid: ${d.valid ? 'YES' : 'NO'}</span>
      </div>
      <div class="result-message" style="font-size: 14px; font-weight: 500;">${escapeHtml(d.message)}</div>
      ${d.attendee ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 13px;">
          <div><strong>Attendee Name:</strong> ${escapeHtml(d.attendee.name)}</div>
          <div><strong>Email:</strong> ${escapeHtml(d.attendee.email)}</div>
          <div><strong>Ticket ID:</strong> <code>${d.ticket ? d.ticket.id : ticketId}</code></div>
          ${d.valid ? `
            <div style="margin-top: 12px;">
              <button class="btn btn-primary btn-sm" onclick="checkInTicketQuick('${eventId}', '${ticketId}')">
                Admit Attendee at Check-in Gate
              </button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;
    resultBox.style.display = 'block';
  } catch (err) {
    resultBox.className = 'result-card result-invalid';
    resultBox.innerHTML = `
      <div class="result-title">VALIDATION FAILED</div>
      <div class="result-message">${escapeHtml(err.message)}</div>
    `;
    resultBox.style.display = 'block';
  }
}

function validateTicketQuick(eventId, ticketId) {
  closeModal('viewTicketModal');
  navigateToPage('validation');
  document.getElementById('valEventSelect').value = eventId;
  document.getElementById('valTicketId').value = ticketId;
  document.getElementById('validationForm').dispatchEvent(new Event('submit'));
}

// =================== SECTION 7: ANALYTICS ===================
async function renderAnalyticsPage() {
  const tbody = document.getElementById('analyticsTableBody');
  if (state.events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No events created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.events.map(ev => {
    const s = ev.stats || { totalRegistrations: 0, totalCheckedIn: 0, attendancePercentage: 0, registrationPercentage: null };
    const capText = ev.capacity !== null ? ev.capacity : 'Unlimited';
    const capFillText = s.registrationPercentage !== null ? `${s.registrationPercentage}%` : 'N/A';

    return `
      <tr>
        <td><strong>${escapeHtml(ev.name)}</strong></td>
        <td>${escapeHtml(ev.date)}</td>
        <td><span class="badge badge-neutral">${capText}</span></td>
        <td>${s.totalRegistrations}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="progress-bar-container" style="width: 80px; margin: 0;">
              <div class="progress-bar-fill" style="width: ${s.registrationPercentage || 0}%;"></div>
            </div>
            <span style="font-size: 12px;">${capFillText}</span>
          </div>
        </td>
        <td><strong>${s.totalCheckedIn}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="progress-bar-container" style="width: 80px; margin: 0;">
              <div class="progress-bar-fill" style="width: ${s.attendancePercentage}%; background-color: var(--success);"></div>
            </div>
            <span style="font-size: 12px; font-weight: 600;">${s.attendancePercentage}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadEventAnalytics(eventId) {
  const container = document.getElementById('eventAnalyticsDetails');
  if (!eventId) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">Select an event from the dropdown above</p>
        <p class="empty-text">Detailed attendance rates, capacity utilization, and admittance charts will be calculated.</p>
      </div>
    `;
    return;
  }

  try {
    const res = await apiRequest(`/api/analytics/events/${eventId}`);
    const s = res.data;

    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 16px; font-weight: 700; color: var(--primary-dark);">${escapeHtml(s.eventName)}</h4>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Event ID: <code>${s.eventId}</code></div>
      </div>

      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <span class="stat-title">Capacity Limit</span>
          <span class="stat-value">${s.capacity !== null ? s.capacity : 'Unlimited'}</span>
          <span class="stat-subtext">Max attendees allowed</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Total Registrations</span>
          <span class="stat-value">${s.totalRegistrations}</span>
          <span class="stat-subtext">Capacity Fill: ${s.registrationPercentage !== null ? s.registrationPercentage + '%' : 'N/A'}</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Gate Checked In</span>
          <span class="stat-value" style="color: var(--success);">${s.totalCheckedIn}</span>
          <span class="stat-subtext">Admitted participants</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Pending Arrival</span>
          <span class="stat-value" style="color: var(--warning);">${s.totalPending}</span>
          <span class="stat-subtext">Awaiting gate check-in</span>
        </div>
        <div class="stat-card">
          <span class="stat-title">Attendance Rate</span>
          <span class="stat-value" style="color: var(--primary-blue);">${s.attendancePercentage}%</span>
          <span class="stat-subtext">(Checked In / Registered)</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; background: #FAFAFC;">
          <h5 style="font-size: 13px; font-weight: 600; margin-bottom: 12px;">Attendance Ratio Breakdown</h5>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span>Checked In (${s.totalCheckedIn})</span>
            <strong>${s.attendancePercentage}%</strong>
          </div>
          <div class="progress-bar-container" style="height: 10px; margin-bottom: 14px;">
            <div class="progress-bar-fill" style="width: ${s.attendancePercentage}%; background-color: var(--success);"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span>Pending (${s.totalPending})</span>
            <strong>${s.totalRegistrations > 0 ? (100 - s.attendancePercentage).toFixed(2) : 0}%</strong>
          </div>
          <div class="progress-bar-container" style="height: 10px;">
            <div class="progress-bar-fill" style="width: ${s.totalRegistrations > 0 ? (100 - s.attendancePercentage) : 0}%; background-color: var(--warning);"></div>
          </div>
        </div>

        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; background: #FAFAFC;">
          <h5 style="font-size: 13px; font-weight: 600; margin-bottom: 12px;">Capacity Utilization</h5>
          ${s.capacity !== null ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span>Registered (${s.totalRegistrations} / ${s.capacity})</span>
              <strong>${s.registrationPercentage}%</strong>
            </div>
            <div class="progress-bar-container" style="height: 10px; margin-bottom: 14px;">
              <div class="progress-bar-fill" style="width: ${Math.min(100, s.registrationPercentage)}%;"></div>
            </div>
            <div style="font-size: 12.5px; color: var(--text-secondary);">
              Remaining Available Seats: <strong>${Math.max(0, s.capacity - s.totalRegistrations)}</strong>
            </div>
          ` : `
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
              This event has no capacity limit configured (unlimited capacity).
            </p>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="result-card result-invalid">${escapeHtml(err.message)}</div>`;
  }
}

// =================== SECTION 8: DATA EXPORT ===================
function updateExportDropdowns() {
  // handled by populateAllEventDropdowns
}

async function handleExportAttendees(e) {
  e.preventDefault();
  const eventId = document.getElementById('exportAttendeesEventSelect').value;
  const format = document.querySelector('input[name="attendeesFormat"]:checked')?.value || 'csv';

  try {
    const url = `/api/export/attendees?eventId=${eventId}&format=${format}&download=false`;
    const content = await apiRequest(url);

    document.getElementById('exportPreviewArea').textContent = content;

    // Trigger download
    const downloadUrl = `/api/export/attendees?eventId=${eventId}&format=${format}&download=true`;
    window.location.href = downloadUrl;
    showToast(`Exported attendees as ${format.toUpperCase()}`, 'success');
  } catch (err) {
    showToast(`Export failed: ${err.message}`, 'error');
  }
}

async function handleExportEvent(e) {
  e.preventDefault();
  const eventId = document.getElementById('exportEventSelect').value;
  const format = document.querySelector('input[name="eventFormat"]:checked')?.value || 'json';

  try {
    const url = `/api/export/event?eventId=${eventId}&format=${format}&download=false`;
    const content = await apiRequest(url);

    document.getElementById('exportPreviewArea').textContent = content;

    // Trigger download
    const downloadUrl = `/api/export/event?eventId=${eventId}&format=${format}&download=true`;
    window.location.href = downloadUrl;
    showToast(`Exported event snapshot as ${format.toUpperCase()}`, 'success');
  } catch (err) {
    showToast(`Export failed: ${err.message}`, 'error');
  }
}

// =================== STANDALONE TICKET GENERATION ===================
async function openStandaloneTicketModal() {
  const select = document.getElementById('standaloneAttendeeSelect');
  select.innerHTML = '<option value="">-- Choose Attendee --</option>';

  try {
    const res = await apiRequest('/api/attendees');
    const attendees = res.data || [];
    attendees.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name} (${a.email}) - Event: ${a.eventName || a.eventId}`;
      select.appendChild(opt);
    });

    openModal('standaloneTicketModal');
  } catch (err) {
    showToast(`Failed to load attendees: ${err.message}`, 'error');
  }
}

async function handleStandaloneTicketSubmit(e) {
  e.preventDefault();
  const attendeeId = document.getElementById('standaloneAttendeeSelect').value;
  const returnExisting = document.getElementById('standaloneReturnExisting').checked;

  try {
    const res = await apiRequest('/api/tickets/generate', {
      method: 'POST',
      body: JSON.stringify({ attendeeId, returnExisting })
    });

    closeModal('standaloneTicketModal');
    showToast(`Ticket '${res.data.id}' ready!`, 'success');
    await loadAllData();
    viewTicketDetails(res.data.id);
  } catch (err) {
    showToast(`Standalone generation failed: ${err.message}`, 'error');
  }
}

// =================== UI HELPERS (MODALS, TOASTS, CONFIRM) ===================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

// ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

function confirmDialog(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;

  const btn = document.getElementById('confirmExecuteBtn');
  // Clean listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', async () => {
    closeModal('confirmModal');
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  });

  openModal('confirmModal');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}
