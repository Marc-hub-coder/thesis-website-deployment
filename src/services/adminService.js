import { db, ensureEmailPasswordAuth } from './firebaseClient';

class AdminService {
  async initAuth() {
    try {
      await ensureEmailPasswordAuth();
    } catch (_) {
      // ignore; reads may still work for public data depending on rules
    }
  }

  // Maintenance Settings
  async getMaintenanceSettings() {
    await this.initAuth();
    try {
      const snap = await db.ref('admin/maintenanceSettings').once('value');
      return snap.exists() ? snap.val() : null;
    } catch (_) {
      return null;
    }
  }

  async setMaintenanceSettings(settings) {
    await this.initAuth();
    const safe = {
      dashboard: !!settings.dashboard,
      pm25Chart: !!settings.pm25Chart,
      pm10Chart: !!settings.pm10Chart,
      coChart: !!settings.coChart,
      no2Chart: !!settings.no2Chart,
      aqiDisplay: !!settings.aqiDisplay,
      updatedAt: Date.now(),
    };
    try {
      await db.ref('admin/maintenanceSettings').set(safe);
      localStorage.setItem('maintenanceSettings', JSON.stringify(safe));
    } catch (_) {}
    return safe;
  }

  onMaintenanceSettings(cb) {
    const ref = db.ref('admin/maintenanceSettings');
    const unsub = ref.on('value', (snap) => {
      const val = snap.exists() ? snap.val() : {};
      try { localStorage.setItem('maintenanceSettings', JSON.stringify(val || {})); } catch (_) {}
      if (typeof cb === 'function') cb(val || {});
    });
    return () => {
      try { ref.off('value', unsub); } catch (_) {}
    };
  }

  // Public Alert
  async getPublicAlert() {
    await this.initAuth();
    try {
      const snap = await db.ref('admin/publicAlert').once('value');
      return snap.exists() ? snap.val() : null;
    } catch (_) {
      return null;
    }
  }

  async setPublicAlert(alertOrNull) {
    await this.initAuth();
    if (alertOrNull) {
      const payload = {
        type: alertOrNull.type || 'info',
        message: String(alertOrNull.message || ''),
        time: Number(alertOrNull.time || Date.now()),
        enabled: alertOrNull.enabled !== false,
        updatedAt: Date.now(),
      };
      try {
        await db.ref('admin/publicAlert').set(payload);
        localStorage.setItem('publicAlert', JSON.stringify(payload));
        localStorage.setItem('publicAlertVersion', String(Date.now()));
      } catch (_) {}
      return payload;
    } else {
      try {
        await db.ref('admin/publicAlert').set({ enabled: false, updatedAt: Date.now() });
        localStorage.removeItem('publicAlert');
        localStorage.setItem('publicAlertVersion', String(Date.now()));
      } catch (_) {}
      return null;
    }
  }

  onPublicAlert(cb) {
    const ref = db.ref('admin/publicAlert');
    const unsub = ref.on('value', (snap) => {
      const val = snap.exists() ? snap.val() : null;
      try {
        if (val && val.enabled !== false) localStorage.setItem('publicAlert', JSON.stringify(val));
        else localStorage.removeItem('publicAlert');
      } catch (_) {}
      if (typeof cb === 'function') cb(val && val.enabled !== false ? val : null);
    });
    return () => {
      try { ref.off('value', unsub); } catch (_) {}
    };
  }
}

export const adminService = new AdminService();


