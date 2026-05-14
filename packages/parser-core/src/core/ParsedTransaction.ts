import { md5Hex } from './Hashing';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'CREDIT' | 'TRANSFER' | 'INVESTMENT' | 'BALANCE_UPDATE';

export interface ParsedTransaction {
  amount: string;
  type: TransactionType;
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

export interface MandateInfo {
  amount: string;
  nextDeductionDate: string | null;
  merchant: string;
  umn: string | null;
  dateFormat: string;
}

export async function generateTransactionId(
  sender: string,
  amount: string,
  smsBody: string
): Promise<string> {
  const normalizedAmount = parseFloat(amount).toFixed(2);
  const smsBodyHash = (await md5Hex(smsBody)).slice(0, 16);
  const data = `${sender}|${normalizedAmount}|${smsBodyHash}`;
  return md5Hex(data);
}