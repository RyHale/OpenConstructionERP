import { create } from 'zustand';

const STORAGE_KEY = 'oe_widget_settings';

interface WidgetSettings {
  projectMapEnabled: boolean;
  projectWeatherEnabled: boolean;
}

interface WidgetSettingsState extends WidgetSettings {
  setProjectMapEnabled: (enabled: boolean) => void;
  setProjectWeatherEnabled: (enabled: boolean) => void;
  toggleProjectMap: () => void;
  toggleProjectWeather: () => void;
}

const DEFAULTS: WidgetSettings = {
  projectMapEnabled: true,
  projectWeatherEnabled: true,
};

function readSettings(): WidgetSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function persist(settings: WidgetSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical browser storage failure.
  }
}

export const useWidgetSettingsStore = create<WidgetSettingsState>((set, get) => ({
  ...readSettings(),

  setProjectMapEnabled: (projectMapEnabled) => {
    const next = { ...get(), projectMapEnabled };
    persist({
      projectMapEnabled: next.projectMapEnabled,
      projectWeatherEnabled: next.projectWeatherEnabled,
    });
    set({ projectMapEnabled });
  },

  setProjectWeatherEnabled: (projectWeatherEnabled) => {
    const next = { ...get(), projectWeatherEnabled };
    persist({
      projectMapEnabled: next.projectMapEnabled,
      projectWeatherEnabled: next.projectWeatherEnabled,
    });
    set({ projectWeatherEnabled });
  },

  toggleProjectMap: () => {
    const projectMapEnabled = !get().projectMapEnabled;
    const projectWeatherEnabled = get().projectWeatherEnabled;
    persist({ projectMapEnabled, projectWeatherEnabled });
    set({ projectMapEnabled });
  },

  toggleProjectWeather: () => {
    const projectMapEnabled = get().projectMapEnabled;
    const projectWeatherEnabled = !get().projectWeatherEnabled;
    persist({ projectMapEnabled, projectWeatherEnabled });
    set({ projectWeatherEnabled });
  },
}));

