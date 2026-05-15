import { SmsMessage } from '@chelav/sms-permission';
import ParserCore, { ParsedTransactionResult } from '@chelav/parser-core';
import {
  insertTransaction,
  TransactionEntity,
  getTransactionByHash,
  createAccount,
  getAllAccounts,
  AccountEntity,
  getAccountBalance,
  insertAccountBalance,
  calculateBankBalance,
  calculateCreditCardBalance,
  getTransactionsByAccount,
} from './database';

export interface FetchMessagesResult {
  totalMessages: number;
  parsedTransactions: number;
  savedTransactions: number;
  errors: string[];
}

function mapParsedToEntity(
  parsed: ParsedTransactionResult,
  transactionHash: string,
  accountId: number | null
): Omit<TransactionEntity, 'id'> {
  const now = new Date().toISOString();
  return {
    amount: parsed.amount,
    merchantName: parsed.merchant || 'Unknown',
    category: 'Others',
    transactionType: parsed.type as 'INCOME' | 'EXPENSE' | 'CREDIT' | 'TRANSFER' | 'INVESTMENT',
    dateTime: new Date(parsed.timestamp).toISOString(),
    description: parsed.reference,
    smsBody: parsed.smsBody,
    bankName: parsed.bankName,
    smsSender: parsed.sender,
    accountNumber: parsed.accountLast4,
    balanceAfter: parsed.balance,
    transactionHash,
    isRecurring: 0,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
    currency: parsed.currency,
    fromAccount: parsed.fromAccount,
    toAccount: parsed.toAccount,
    reference: parsed.reference,
    accountId,
  };
}

export async function getOrCreateAccountFromParsed(parsed: ParsedTransactionResult): Promise<AccountEntity | null> {
  const accountLast4 = parsed.accountLast4 || 'XXXX';
  const type = parsed.isFromCard ? 'CREDIT_CARD' : 'BANK_ACCOUNT';
  const name = parsed.bankName || 'Unknown Bank';

  const existing = await getAllAccounts();
  const found = existing.find(
    a => a.name === name && a.type === type
  );
  if (found) return found;

  const now = new Date().toISOString();
  const id = await createAccount({
    name,
    type,
    currency: parsed.currency || 'INR',
    lastTransactionDate: now,
    sourceType: 'AUTO',
    createdAt: now,
    updatedAt: now,
  });

  return { id, name, type, currency: parsed.currency || 'INR', lastTransactionDate: now, sourceType: 'AUTO', createdAt: now, updatedAt: now };
}

export async function fetchAndParseMessages(messages: SmsMessage[]): Promise<FetchMessagesResult> {
  const result: FetchMessagesResult = {
    totalMessages: messages.length,
    parsedTransactions: 0,
    savedTransactions: 0,
    errors: [],
  };

  for (const message of messages) {
    try {
      const parsed = await ParserCore.parseSms(message.body, message.address, message.date);
      if (!parsed) {
        continue;
      }

      result.parsedTransactions++;

      const transactionHash = await ParserCore.generateTransactionId(
        parsed.sender,
        parsed.amount,
        parsed.smsBody
      );

      if (!transactionHash) {
        result.errors.push(`Failed to generate hash for message ${message.id}`);
        continue;
      }

      const existing = await getTransactionByHash(transactionHash);
      if (existing) continue;

      const account = await getOrCreateAccountFromParsed(parsed);

      const entity = mapParsedToEntity(parsed, transactionHash, account?.id ?? null);
      const txnId = await insertTransaction(entity);
      result.savedTransactions++;

      if (account) {
        const transactions = await getTransactionsByAccount(account.id);
        const balance = account.type === 'CREDIT_CARD'
          ? calculateCreditCardBalance(transactions).outstanding.toString()
          : calculateBankBalance(transactions).toString();
        await insertAccountBalance({
          accountId: account.id,
          balance,
          isManualOverride: 0,
          transactionId: txnId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      result.errors.push(`Error processing message ${message.id}: ${error}`);
    }
  }

  return result;
}

export function filterCurrentMonthMessages(messages: SmsMessage[]): SmsMessage[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  return messages.filter((msg) => {
    const msgDate = msg.date;
    return msgDate >= startOfMonth && msgDate <= endOfMonth;
  });
}