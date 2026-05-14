import { registerWebModule, NativeModule } from 'expo';

import { PermissionResultEvent, SmsMessage } from './SmsPermission.types';

type SmsPermissionModuleWebEvents = {
  onPermissionResult: (params: PermissionResultEvent) => void;
}

class SmsPermissionModuleWeb extends NativeModule<SmsPermissionModuleWebEvents> {
  async requestSmsPermission(): Promise<boolean> {
    return false;
  }

  checkSmsPermission(): boolean {
    return false;
  }

  async getSmsMessages(limit?: number): Promise<SmsMessage[]> {
    return [];
  }
}

export default registerWebModule(SmsPermissionModuleWeb, 'SmsPermission');