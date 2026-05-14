import * as React from 'react';

import { SmsPermissionViewProps } from './SmsPermission.types';

export default function SmsPermissionView(props: SmsPermissionViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
