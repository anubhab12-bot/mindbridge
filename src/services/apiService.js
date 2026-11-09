const API_BASE = 'https://mindbridge-api-x99i.onrender.com/api/v1';

export const apiService = {
  baseUrl: API_BASE,

  // Check health and latency
  async checkHealth() {
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      const latency = Date.now() - start;
      const data = await res.json();
      return { ok: res.ok, status: data?.data?.status || 'ok', latency };
    } catch (err) {
      return { ok: false, status: 'offline', latency: 0, error: err.message };
    }
  },

  // Fetch real doctors from MongoDB
  async getDoctors(page = 1, pageSize = 50) {
    try {
      const res = await fetch(`${API_BASE}/doctors?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return {
        items: json?.data || [],
        meta: json?.meta || { total: json?.data?.length || 0, page, pageSize },
      };
    } catch (err) {
      console.error('Failed fetching live doctors:', err);
      return { items: [], meta: { total: 0 } };
    }
  },

  // Fetch real governance settings (announcement banner, dynamic features, maintenance mode)
  async getSettings() {
    try {
      const res = await fetch(`${API_BASE}/governance/settings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.data || null;
    } catch (err) {
      console.error('Failed fetching live settings:', err);
      return null;
    }
  },

  // Update dynamic site settings in live MongoDB backend (reflects immediately on main app)
  async updateSettings(settingsData) {
    try {
      let res = await fetch(`${API_BASE}/governance/admin-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/governance/admin-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData),
        });
      }
      if (!res.ok) {
        // Fallback to legacy PUT /governance/settings
        res = await fetch(`${API_BASE}/governance/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData),
        });
      }
      return await res.json();
    } catch (err) {
      console.error('Failed updating live settings:', err);
      throw err;
    }
  },

  // Fetch real telemetry statistics (registered users, active patients, verified doctors)
  async getStats() {
    try {
      const res = await fetch(`${API_BASE}/governance/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.data || null;
    } catch (err) {
      console.error('Failed fetching live telemetry stats:', err);
      return null;
    }
  },

  // Delete a doctor profile from backend database
  async deleteDoctor(id) {
    try {
      const res = await fetch(`${API_BASE}/governance/doctors/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch (err) {
      console.error(`Failed deleting doctor ${id}:`, err);
      throw err;
    }
  },

  // Purge all test doctors and users from backend database
  async resetAllData() {
    try {
      const res = await fetch(`${API_BASE}/governance/reset-all-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch (err) {
      console.error('Failed purging test backend data:', err);
      throw err;
    }
  },

  // Register real doctor into live MongoDB backend
  async registerDoctor({ name, email, password, category, specialty, regNumber, experienceYears, fee, bio }) {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name,
        email: email.trim().toLowerCase(),
        password: password || 'SecureMindBridge#2026',
        role: 'doctor',
      }),
    });

    const regJson = await regRes.json();
    if (!regRes.ok) {
      throw new Error(regJson?.message || regJson?.error || 'Registration failed');
    }

    // Auto verify email in staging/demo environment
    try {
      await fetch(`${API_BASE}/auth/instant-verify-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch (e) {
      console.warn('Instant verify non-fatal error:', e);
    }

    return regJson;
  },

  // Register real patient into live MongoDB backend
  async registerPatient({ name, email, password }) {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name,
        email: email.trim().toLowerCase(),
        password: password || 'SecurePatient#2026',
        role: 'patient',
      }),
    });

    const regJson = await regRes.json();
    if (!regRes.ok) {
      throw new Error(regJson?.message || regJson?.error || 'Patient registration failed');
    }

    try {
      await fetch(`${API_BASE}/auth/instant-verify-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch (e) {
      console.warn('Instant verify non-fatal error:', e);
    }

    return regJson;
  },

  // Submit candidate application for Council / Specialist / Influencer
  async submitCouncilApplication({ fullName, email, category, phone, credentials }) {
    const res = await fetch(`${API_BASE}/governance/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        category, // 'SPECIALIST' | 'NGO' | 'INFLUENCER'
        credentials,
      }),
    });
    return await res.json();
  },
};
