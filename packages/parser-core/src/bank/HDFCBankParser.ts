import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/TransactionType';
import { CompiledPatterns } from '../core/CompiledPatterns';

export class HDFCBankParser extends BankParser {
  getBankName(): string {
    return 'HDFC Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    const hdfcSenders = new Set(['HDFCBK', 'HDFCBANK', 'HDFC', 'HDFCB']);

    if (hdfcSenders.has(upperSender)) return true;

    return CompiledPatterns.HDFC.DLT_PATTERNS.some((p) => p.test(upperSender));
  }

  override extractMerchant(message: string, sender: string): string | null {
    if (
      message.includes('From HDFC Bank Card') &&
      message.includes(' At ') &&
      message.includes(' On ')
    ) {
      const atIndex = message.indexOf(' At ');
      const onIndex = message.indexOf(' On ');
      if (atIndex !== -1 && onIndex !== -1 && onIndex > atIndex) {
        const merchant = message.substring(atIndex + 4, onIndex).trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if (message.includes('Txn') && message.includes('At ') && message.includes('Card')) {
      const txnAtPattern = /At\s+(.+?)\s*(?:by\s+UPI|on\s+\d|$)/gi;
      txnAtPattern.lastIndex = 0;
      const match = txnAtPattern.exec(message);
      if (match) {
        const merchant = match[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if (message.toLowerCase().includes('withdrawn')) {
      const atLocationPattern = /At\s+\+?([^O]+?)\s+On/gi;
      atLocationPattern.lastIndex = 0;
      const match = atLocationPattern.exec(message);
      if (match) {
        const location = match[1].trim();
        return location.length > 0 ? `ATM at ${this.cleanMerchantName(location)}` : 'ATM';
      }
      return 'ATM';
    }

    if (message.toLowerCase().includes('atm')) {
      return 'ATM';
    }

    if (
      message.toLowerCase().includes('card') &&
      message.toLowerCase().includes(' at ') &&
      (message.toLowerCase().includes('block cc') || message.toLowerCase().includes('block pcc'))
    ) {
      const atPattern = /at\s+([^@\s]+(?:@[^\s]+)?(?:\s+[^\s]+)?)(?:\s+by\s+|\s+on\s+|$)/gi;
      atPattern.lastIndex = 0;
      const match = atPattern.exec(message);
      if (match) {
        let merchant = match[1].trim();
        if (merchant.includes('@')) {
          merchant = merchant.split('@')[0];
          if (merchant.endsWith('qr')) merchant = merchant.slice(0, -2);
        }
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if ((message.includes('NEFT') || message.includes('RTGS')) && message.includes('deposited')) {
      const neftPattern = /(?:NEFT|RTGS)\s+Cr-[A-Z]{4}0[A-Z0-9]{6}-([^-]+)/gi;
      neftPattern.lastIndex = 0;
      const match = neftPattern.exec(message);
      if (match) {
        const merchant = match[1].trim();
        if (merchant.length > 0 && !merchant.split('').every((c: string) => /\d/.test(c))) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if (message.includes('SALARY') && message.includes('deposited')) {
      CompiledPatterns.HDFC.SALARY_PATTERN.lastIndex = 0;
      const salaryMatch = CompiledPatterns.HDFC.SALARY_PATTERN.exec(message);
      if (salaryMatch) return this.cleanMerchantName(salaryMatch[1].trim());

      CompiledPatterns.HDFC.SIMPLE_SALARY_PATTERN.lastIndex = 0;
      const simpleMatch = CompiledPatterns.HDFC.SIMPLE_SALARY_PATTERN.exec(message);
      if (simpleMatch) {
        const merchant = simpleMatch[1].trim();
        if (merchant.length > 0 && !merchant.split('').every((c: string) => /\d/.test(c))) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if (message.includes('Info:')) {
      CompiledPatterns.HDFC.INFO_PATTERN.lastIndex = 0;
      const infoMatch = CompiledPatterns.HDFC.INFO_PATTERN.exec(message);
      if (infoMatch) {
        const merchant = infoMatch[1].trim();
        if (merchant.length > 0 && !merchant.toUpperCase().includes('UPI')) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    if (message.includes('VPA')) {
      CompiledPatterns.HDFC.VPA_WITH_NAME.lastIndex = 0;
      const vpaWithNameMatch = CompiledPatterns.HDFC.VPA_WITH_NAME.exec(message);
      if (vpaWithNameMatch) return this.cleanMerchantName(vpaWithNameMatch[1].trim());

      CompiledPatterns.HDFC.VPA_PATTERN.lastIndex = 0;
      const vpaMatch = CompiledPatterns.HDFC.VPA_PATTERN.exec(message);
      if (vpaMatch) {
        const vpaName = vpaMatch[1].trim();
        if (vpaName.length > 3 && !vpaMatch[1].split('').every((c: string) => /\d/.test(c))) {
          return this.cleanMerchantName(vpaName);
        }
      }
    }

    if (message.includes('spent on Card')) {
      CompiledPatterns.HDFC.SPENT_PATTERN.lastIndex = 0;
      const spentMatch = CompiledPatterns.HDFC.SPENT_PATTERN.exec(message);
      if (spentMatch) return this.cleanMerchantName(spentMatch[1].trim());
    }

    if (message.includes('debited for')) {
      CompiledPatterns.HDFC.DEBIT_FOR_PATTERN.lastIndex = 0;
      const debitMatch = CompiledPatterns.HDFC.DEBIT_FOR_PATTERN.exec(message);
      if (debitMatch) return this.cleanMerchantName(debitMatch[1].trim());
    }

    if (message.includes('UPI Mandate')) {
      CompiledPatterns.HDFC.MANDATE_PATTERN.lastIndex = 0;
      const mandateMatch = CompiledPatterns.HDFC.MANDATE_PATTERN.exec(message);
      if (mandateMatch) return this.cleanMerchantName(mandateMatch[1].trim());
    }

    if (message.includes('towards')) {
      const towardsPattern = /towards\s+([^\n]+?)(?:\s+UMRN|\s+ID:|\s+Alert:|$)/gi;
      towardsPattern.lastIndex = 0;
      const match = towardsPattern.exec(message);
      if (match) {
        const merchant = match[1].trim();
        if (merchant.length > 0) return this.cleanMerchantName(merchant);
      }
    }

    if (message.includes('For:')) {
      const forColonPattern = /For:\s+([^\n]+?)(?:\s+From|\s+Via|$)/gi;
      forColonPattern.lastIndex = 0;
      const match = forColonPattern.exec(message);
      if (match) {
        const merchant = match[1].trim();
        if (merchant.length > 0) return this.cleanMerchantName(merchant);
      }
    }

    if (message.includes('for ') && message.includes('will be debited')) {
      const forPattern = /for\s+([^\n]+?)(?:\s+mandate|\s+will\s+be|\s+ID:|\s+Act:|$)/gi;
      forPattern.lastIndex = 0;
      const match = forPattern.exec(message);
      if (match) {
        const merchant = match[1].trim();
        if (merchant.length > 0) return this.cleanMerchantName(merchant);
      }
    }

    return super.extractMerchant(message, sender);
  }

  override extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    if (lowerMessage.includes('block cc') || lowerMessage.includes('block pcc')) {
      return TransactionType.CREDIT;
    }

    if (lowerMessage.includes('spent on card') && !lowerMessage.includes('block dc')) {
      return TransactionType.CREDIT;
    }

    if (lowerMessage.includes('payment') && lowerMessage.includes('credit card')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('towards') && lowerMessage.includes('credit card')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('sent') && lowerMessage.includes('from hdfc')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('spent') && lowerMessage.includes('from hdfc bank card')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn') && !lowerMessage.includes('block cc')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent') && !lowerMessage.includes('card')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback')) return TransactionType.INCOME;

    return null;
  }

  override extractReference(message: string): string | null {
    const patterns = [
      CompiledPatterns.HDFC.REF_SIMPLE,
      CompiledPatterns.HDFC.UPI_REF_NO,
      CompiledPatterns.HDFC.REF_NO,
      CompiledPatterns.HDFC.REF_END,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) return match[1].trim();
    }

    return super.extractReference(message);
  }

  override extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult) return superResult;

    const cardPattern = /Card\s+x(\d{4})/gi;
    cardPattern.lastIndex = 0;
    const cardMatch = cardPattern.exec(message);
    if (cardMatch) return cardMatch[1];

    const blockDCPattern = /BLOCK\s+DC\s+(\d{4})/gi;
    blockDCPattern.lastIndex = 0;
    const blockDCMatch = blockDCPattern.exec(message);
    if (blockDCMatch) return blockDCMatch[1];

    const hdfcBankPattern = /HDFC\s+Bank\s+([X\*]+\d{3,6})/gi;
    hdfcBankPattern.lastIndex = 0;
    const hdfcMatch = hdfcBankPattern.exec(message);
    if (hdfcMatch) return this.extractLast4Digits(hdfcMatch[1]);

    const hdfcPatterns = [
      CompiledPatterns.HDFC.ACCOUNT_DEPOSITED,
      CompiledPatterns.HDFC.ACCOUNT_FROM,
      CompiledPatterns.HDFC.ACCOUNT_SIMPLE,
      CompiledPatterns.HDFC.ACCOUNT_GENERIC,
    ];

    for (const pattern of hdfcPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  override extractBalance(message: string): string | null {
    const avlBalINRPattern = /Avl\s+bal:?\s*INR\s*([0-9,]+(?:\.\d{2})?)/gi;
    avlBalINRPattern.lastIndex = 0;
    const avlMatch = avlBalINRPattern.exec(message);
    if (avlMatch) {
      const balanceStr = avlMatch[1].replace(',', '');
      try {
        return balanceStr;
      } catch {
        // fall through
      }
    }

    const availableBalINRPattern = /Available\s+Balance:?\s*INR\s*([0-9,]+(?:\.\d{2})?)/gi;
    availableBalINRPattern.lastIndex = 0;
    const availableMatch = availableBalINRPattern.exec(message);
    if (availableMatch) {
      const balanceStr = availableMatch[1].replace(',', '');
      try {
        return balanceStr;
      } catch {
        // fall through
      }
    }

    const balRsPattern = /Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi;
    balRsPattern.lastIndex = 0;
    const balMatch = balRsPattern.exec(message);
    if (balMatch) {
      const balanceStr = balMatch[1].replace(',', '');
      try {
        return balanceStr;
      } catch {
        // fall through
      }
    }

    return super.extractBalance(message);
  }

  override isTransactionMessage(message: string): boolean {
    if (this.isEMandateNotification(message)) return false;
    if (this.isFutureDebitNotification(message)) return false;

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('nach mandate') && lowerMessage.includes('received') && lowerMessage.includes('for processing')) {
      return false;
    }

    if (lowerMessage.includes('bill alert') || (lowerMessage.includes('bill') && lowerMessage.includes('is due on'))) {
      return false;
    }

    if (lowerMessage.includes('payment alert') && !lowerMessage.includes('will be')) {
      return true;
    }

    if (
      lowerMessage.includes('has requested') ||
      lowerMessage.includes('payment request') ||
      lowerMessage.includes('to pay, download') ||
      lowerMessage.includes('collect request') ||
      lowerMessage.includes('ignore if already paid')
    ) {
      return false;
    }

    if (lowerMessage.includes('received towards your credit card')) return false;
    if (lowerMessage.includes('payment') && lowerMessage.includes('credited to your card')) return false;

    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code') ||
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('win ')
    ) {
      return false;
    }

    const hdfcTransactionKeywords = [
      'debited',
      'credited',
      'withdrawn',
      'deposited',
      'spent',
      'received',
      'transferred',
      'paid',
      'sent',
      'deducted',
      'txn',
    ];

    return hdfcTransactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  isEMandateNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('e-mandate') ||
      lowerMessage.includes('upi-mandate') ||
      (lowerMessage.includes('mandate') && lowerMessage.includes('successfully created'))
    );
  }

  isFutureDebitNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('will be debited') ||
      lowerMessage.includes('mandate set for') ||
      (lowerMessage.includes('upcoming') && lowerMessage.includes('mandate'))
    );
  }
}