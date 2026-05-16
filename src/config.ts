/// <reference types="vite/client" />
// GAS ウェブアプリのURLをここに設定するか、GitHub Secrets の VITE_GAS_URL を使う
export const GAS_URL: string = import.meta.env.VITE_GAS_URL ?? '';

export const STORAGE_KEY = 'mochimon_orgs';
export const ADMIN_TRIGGER = 'namakanri';
