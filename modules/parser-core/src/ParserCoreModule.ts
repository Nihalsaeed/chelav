import { NativeModule, requireNativeModule } from 'expo';

export interface ParsedTransactionResult {
  amount: string;
  type: 'INCOME' | 'EXPENSE' | 'CREDIT' | 'TRANSFER' | 'INVESTMENT' | 'BALANCE_UPDATE';
  merchant: string | null;
  reference: string | null;
  accountLast4: string | null;
  balance: string | null;
  creditLimit: string | null;
  smsBody: string;
  sender: string;
  timestamp: number;
  bankName: string;
  transactionHash: string | null;
  isFromCard: boolean;
  currency: string;
  fromAccount: string | null;
  toAccount: string | null;
}

declare class ParserCoreModule extends NativeModule {
  parseSms(smsBody: string, sender: string, timestamp: number): Promise<ParsedTransactionResult | null>;
  isKnownBankSender(sender: string): boolean;
  getAllSupportedBanks(): string[];
  generateTransactionId(sender: string, amount: string, smsBody: string): Promise<string | null>;
}

export default requireNativeModule<ParserCoreModule>('ParserCore');

export type { ParsedTransactionResult };