type Variant = 'full' | 'tech' | 'finance' | 'happy' | 'commodity' | 'wrdo';

const VALID_VARIANTS = new Set<Variant>(['full', 'tech', 'finance', 'happy', 'commodity', 'wrdo']);

function isValidVariant(v: string): v is Variant {
  return VALID_VARIANTS.has(v as Variant);
}

const buildVariant: Variant = (() => {
  try {
    const env = import.meta.env?.VITE_VARIANT;
    return env && isValidVariant(env) ? env : 'full';
  } catch {
    return 'full';
  }
})();

export const SITE_VARIANT: Variant = (() => {
  if (typeof window === 'undefined') return buildVariant;

  const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
  if (isTauri) {
    const stored = localStorage.getItem('worldmonitor-variant');
    if (stored && isValidVariant(stored)) return stored;
    return buildVariant;
  }

  const h = location.hostname;
  if (h.startsWith('tech.')) return 'tech';
  if (h.startsWith('finance.')) return 'finance';
  if (h.startsWith('happy.')) return 'happy';
  if (h.startsWith('commodity.')) return 'commodity';
  if (h === 'cave.wrdo.co.za' || h.startsWith('wrdo.')) return 'wrdo';

  if (h === 'localhost' || h === '127.0.0.1') {
    const stored = localStorage.getItem('worldmonitor-variant');
    if (stored && isValidVariant(stored)) return stored;
    return buildVariant;
  }

  return 'full';
})();
