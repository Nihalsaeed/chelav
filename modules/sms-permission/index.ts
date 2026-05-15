// Reexport the native module. On web, it will be resolved to SmsPermissionModule.web.ts
// and on native platforms to SmsPermissionModule.ts
export { default } from './src/SmsPermissionModule';
export * from  './src/SmsPermission.types';
