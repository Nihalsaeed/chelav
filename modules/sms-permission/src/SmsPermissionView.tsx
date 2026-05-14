import { requireNativeView } from 'expo';
import * as React from 'react';

import { SmsPermissionViewProps } from './SmsPermission.types';

const NativeView: React.ComponentType<SmsPermissionViewProps> =
  requireNativeView('SmsPermission');

export default function SmsPermissionView(props: SmsPermissionViewProps) {
  return <NativeView {...props} />;
}
