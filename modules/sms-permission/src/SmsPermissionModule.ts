import { NativeModule, requireNativeModule } from 'expo';

import { SmsPermissionModuleEvents, SmsMessage } from './SmsPermission.types';

declare class SmsPermissionModule extends NativeModule<SmsPermissionModuleEvents> {
  requestSmsPermission(): Promise<boolean>;
  checkSmsPermission(): boolean;
  getSmsMessages(limit?: number): Promise<SmsMessage[]>;
}

export default requireNativeModule<SmsPermissionModule>('SmsPermission');

export type { SmsMessage, PermissionResultEvent } from './SmsPermission.types';