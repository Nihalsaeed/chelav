import { NativeModule, requireNativeModule } from 'expo';

import { SmsPermissionModuleEvents, SmsMessage } from './SmsPermission.types';

declare class SmsPermissionModule extends NativeModule<SmsPermissionModuleEvents> {
  requestSmsPermission(): Promise<boolean>;
  checkSmsPermission(): boolean;
  getSmsMessages(limit?: number): Promise<SmsMessage[]>;
  startSmsListener(): Promise<boolean>;
  stopSmsListener(): Promise<boolean>;
  startForegroundService(): Promise<boolean>;
  stopForegroundService(): Promise<boolean>;
  showTransactionNotification(amount: string, merchant: string): Promise<boolean>;
}

export default requireNativeModule<SmsPermissionModule>('SmsPermission');

export type { SmsMessage, PermissionResultEvent, SmsReceivedEvent } from './SmsPermission.types';