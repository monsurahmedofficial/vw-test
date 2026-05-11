import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const DEFAULTS = {
  stage_1_name: 'Pending',
  stage_2_name: 'On-Process',
  stage_3_name: 'Completed',
};

const SettingsContext = createContext({ settings: DEFAULTS, reload: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  async function reload() {
    try {
      const { data } = await api.get('/settings');
      setSettings({ ...DEFAULTS, ...data });
    } catch {}
  }

  useEffect(() => { reload(); }, []);

  return (
    <SettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
