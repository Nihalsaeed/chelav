export type SmsMessage = {
  id: number;
  address: string;
  body: string;
  date: number;
  type: number;
};

export type PermissionResultEvent = {
  granted: boolean;
};

export type SmsReceivedEvent = {
  address: string;
  body: string;
  date: number;
  type: number;
};

export type SmsPermissionModuleEvents = {
  onPermissionResult: (params: PermissionResultEvent) => void;
  onSmsReceived: (params: SmsReceivedEvent) => void;
};