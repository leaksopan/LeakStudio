export const config = {
    appName: import.meta.env.VITE_APP_NAME || 'LeakStudio',
    storageMode: import.meta.env.VITE_STORAGE_MODE || 'supabase',
    apiMode: import.meta.env.VITE_API_MODE || 'supabase',
    vpsApiUrl: import.meta.env.VITE_VPS_API_URL,
    vpsStorageUrl: import.meta.env.VITE_VPS_STORAGE_URL,
}
