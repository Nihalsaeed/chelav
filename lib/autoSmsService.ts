import SmsPermissionModule, { SmsMessage, SmsReceivedEvent } from '@chelav/sms-permission';
import ParserCore, { ParsedTransactionResult } from '@chelav/parser-core';
import {
  insertTransaction,
  TransactionEntity,
  getTransactionByHash,
  createAccount,
  getAllAccounts,
  AccountEntity,
  getLatestAccountBalance,
  insertAccountBalance,
  calculateIncrementalBalance,
} from './database';

export type AutoSyncState = 'idle' | 'listening' | 'processing';

interface AutoSyncCallbacks {
  onStateChange?: (state: AutoSyncState) => void;
  onNewTransaction?: (count: number) => void;
  onError?: (error: string) => void;
}

class AutoSmsService {
  private state: AutoSyncState = 'idle';
  private callbacks: AutoSyncCallbacks = {};
  private processedMessageIds = new Set<string>();

  async start(callbacks: AutoSyncCallbacks = {}): Promise<boolean> {
    if (this.state === 'listening') {
      return true;
    }

    this.callbacks = callbacks;

    const hasPermission = await SmsPermissionModule.checkSmsPermission();
    if (!hasPermission) {
      const granted = await SmsPermissionModule.requestSmsPermission();
      if (!granted) {
        this.callbacks.onError?.('SMS permission denied');
        return false;
      }
    }

    SmsPermissionModule.addListener('onSmsReceived', (event: SmsReceivedEvent) => {
      this.handleIncomingSms(event);
    });

    await SmsPermissionModule.startSmsListener();
    await SmsPermissionModule.startForegroundService();

    this.state = 'listening';
    this.callbacks.onStateChange?.(this.state);
    return true;
  }

  async stop(): Promise<void> {
    if (this.state === 'idle') return;

    await SmsPermissionModule.stopSmsListener();
    await SmsPermissionModule.stopForegroundService();
    SmsPermissionModule.removeAllListeners('onSmsReceived');
    this.state = 'idle';
    this.callbacks.onStateChange?.(this.state);
  }

  getState(): AutoSyncState {
    return this.state;
  }

  private async handleIncomingSms(event: SmsReceivedEvent): Promise<void> {
    if (this.state === 'processing') return;

    this.state = 'processing';
    this.callbacks.onStateChange?.(this.state);

    const messageKey = `${event.address}-${event.date}`;
    if (this.processedMessageIds.has(messageKey)) {
      this.state = 'listening';
      this.callbacks.onStateChange?.(this.state);
      return;
    }
    this.processedMessageIds.add(messageKey);

    try {
      const parsed = await ParserCore.parseSms(event.body, event.address, event.date);
      if (!parsed) {
        this.state = 'listening';
        this.callbacks.onStateChange?.(this.state);
        return;
      }

      const transactionHash = await ParserCore.generateTransactionId(
        parsed.sender,
        parsed.amount,
        parsed.smsBody
      );

      if (!transactionHash) {
        this.state = 'listening';
        this.callbacks.onStateChange?.(this.state);
        return;
      }

      const existing = await getTransactionByHash(transactionHash);
      if (existing) {
        this.state = 'listening';
        this.callbacks.onStateChange?.(this.state);
        return;
      }

      const account = await this.getOrCreateAccountFromParsed(parsed);

      const entity = this.mapParsedToEntity(parsed, transactionHash, account?.id ?? null);
      const txnId = await insertTransaction(entity);
      this.callbacks.onNewTransaction?.(1);

      await SmsPermissionModule.showTransactionNotification(
        parsed.amount || '0',
        parsed.merchant || parsed.bankName || 'Unknown'
      );

      if (account) {
        const latestBalance = await getLatestAccountBalance(account.id);
        const currentBalance = latestBalance?.balance ?? '0';
        const isCreditCard = account.type === 'CREDIT_CARD' || latestBalance?.isCreditCard === 1;

        const newBalance = calculateIncrementalBalance(
          currentBalance,
          entity.transactionType,
          entity.amount,
          account.type,
          parsed.balance,
          isCreditCard
        );

        await insertAccountBalance({
          accountId: account.id,
          balance: newBalance,
          isManualOverride: 0,
          transactionId: txnId,
          createdAt: new Date().toISOString(),
          sourceType: 'TRANSACTION',
          smsSource: parsed.smsBody?.substring(0, 500) || null,
          isCreditCard: isCreditCard ? 1 : 0,
        });
      }
    } catch (error) {
      this.callbacks.onError?.(`Error processing SMS: ${error}`);
    }

    this.state = 'listening';
    this.callbacks.onStateChange?.(this.state);
  }

  private async getOrCreateAccountFromParsed(parsed: ParsedTransactionResult): Promise<AccountEntity | null> {
    const accountLast4 = parsed.accountLast4 || 'XXXX';
    const type = parsed.isFromCard ? 'CREDIT_CARD' : 'BANK_ACCOUNT';
    const name = parsed.bankName || 'Unknown Bank';

    const existing = await getAllAccounts();
    const found = existing.find(a => a.name === name && a.type === type);
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

  private mapParsedToEntity(
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
}

export const autoSmsService = new AutoSmsService();