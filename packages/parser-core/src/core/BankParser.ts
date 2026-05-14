import { ParsedTransaction, MandateInfo } from './ParsedTransaction';
import { TransactionType } from './TransactionType';
import { CompiledPatterns } from './CompiledPatterns';
import { Parsing } from './Constants';

export abstract class BankParser {
  abstract getBankName(): string;
  abstract canHandle(sender: string): boolean;

  getCurrency(): string {
    return 'INR';
  }

  parse(
    smsBody: string,
    sender: string,
    timestamp: number
  ): ParsedTransaction | null {
    if (!this.isTransactionMessage(smsBody)) {
      return null;
    }

    const amount = this.extractAmount(smsBody);
    if (!amount) return null;

    const type = this.extractTransactionType(smsBody);
    if (!type) return null;

    const creditLimit =
      type === TransactionType.CREDIT ? this.extractAvailableLimit(smsBody) : null;

    const currency = this.extractCurrency(smsBody) ?? this.getCurrency();

    const rawAccountLast4 = this.extractAccountLast4(smsBody);
    const safeAccountLast4 = rawAccountLast4 ? this.extractLast4Digits(rawAccountLast4) : rawAccountLast4;

    return {
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: safeAccountLast4,
      balance: this.extractBalance(smsBody),
      creditLimit,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      transactionHash: null,
      isFromCard: this.detectIsCard(smsBody),
      currency,
      fromAccount: null,
      toAccount: null,
    };
  }

  protected extractCurrency(message: string): string | null {
    const currencyPattern = /([A-Z]{3})\s*[0-9,]+(?:\.\d{2})?/gi;
    const match = currencyPattern.exec(message);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    if (
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('win ')
    ) {
      return false;
    }

    if (
      lowerMessage.includes('has requested') ||
      lowerMessage.includes('payment request') ||
      lowerMessage.includes('collect request') ||
      lowerMessage.includes('requesting payment') ||
      lowerMessage.includes('requests rs') ||
      lowerMessage.includes('ignore if already paid')
    ) {
      return false;
    }

    if (lowerMessage.includes('have received payment')) {
      return false;
    }

    if (
      lowerMessage.includes('is due') ||
      lowerMessage.includes('min amount due') ||
      lowerMessage.includes('minimum amount due') ||
      lowerMessage.includes('in arrears') ||
      lowerMessage.includes('is overdue') ||
      lowerMessage.includes('ignore if paid') ||
      (lowerMessage.includes('pls pay') && lowerMessage.includes('min of'))
    ) {
      return false;
    }

    const transactionKeywords = [
      'debited',
      'credited',
      'withdrawn',
      'deposited',
      'spent',
      'received',
      'transferred',
      'paid',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected extractAmount(message: string): string | null {
    for (const pattern of CompiledPatterns.Amount.ALL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const amountStr = match[1].replace(',', '');
        try {
          return amountStr;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('deducted')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback'))
      return TransactionType.INCOME;

    return null;
  }

  protected isInvestmentTransaction(lowerMessage: string): boolean {
    const investmentKeywords = [
      'iccl',
      'indian clearing corporation',
      'nsccl',
      'nse clearing',
      'clearing corporation',
      'nach',
      'ach',
      'ecs',
      'groww',
      'zerodha',
      'upstox',
      'kite',
      'kuvera',
      'paytm money',
      'etmoney',
      'coin by zerodha',
      'smallcase',
      'angel one',
      'angel broking',
      '5paisa',
      'icici securities',
      'icici direct',
      'hdfc securities',
      'kotak securities',
      'motilal oswal',
      'sharekhan',
      'edelweiss',
      'axis direct',
      'sbi securities',
      'mutual fund',
      'sip',
      'elss',
      'ipo',
      'folio',
      'demat',
      'stockbroker',
      'digital gold',
      'sovereign gold',
      'nse',
      'bse',
      'cdsl',
      'nsdl',
    ];

    return investmentKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected extractMerchant(message: string, sender: string): string | null {
    for (const pattern of CompiledPatterns.Merchant.ALL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    for (const pattern of CompiledPatterns.Reference.ALL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  protected extractLast4Digits(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return last4.length >= 3 ? last4 : null;
  }

  protected extractAccountLast4(message: string): string | null {
    for (const pattern of CompiledPatterns.Account.ALL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const rawCapture = match[1];
        const last4 = this.extractLast4Digits(rawCapture);
        if (last4 && this.isValidAccountLast4(last4, match[0], message)) {
          return last4;
        }
      }
    }
    return null;
  }

  private isValidAccountLast4(last4: string, matchedText: string, fullMessage: string): boolean {
    const escapedLast4 = last4.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const datePatterns = [
      new RegExp(`\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`),
      new RegExp(`${escapedLast4}[/-]\\d{1,2}[/-]\\d{1,2}`),
      new RegExp(`\\bon\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
      new RegExp(`\\bdated\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
    ];

    for (const datePattern of datePatterns) {
      if (datePattern.test(fullMessage)) return false;
    }

    const year = parseInt(last4, 10);
    if (year >= 2000 && year <= 2099) {
      const yearContextPatterns = [
        new RegExp(`\\bon\\s+\\d{1,2}[/-]\\d{1,2}[/-]${escapedLast4}`, 'i'),
        new RegExp(`\\bdated\\s+.*?${escapedLast4}`, 'i'),
        new RegExp(`${escapedLast4}(?:\\s|$)`),
      ];

      for (const yearPattern of yearContextPatterns) {
        if (yearPattern.test(fullMessage)) {
          const accountBeforeYear = new RegExp(
            `(?:A/c|Account|Acct).{0,25}${escapedLast4}`,
            'i'
          );
          if (!accountBeforeYear.test(fullMessage)) return false;
        }
      }
    }

    return true;
  }

  protected extractBalance(message: string): string | null {
    for (const pattern of CompiledPatterns.Balance.ALL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const balanceStr = match[1].replace(',', '');
        try {
          return balanceStr;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  protected extractAvailableLimit(message: string): string | null {
    const creditLimitPatterns = [
      /Available\s+limit\s+Rs\.([0-9,]+(?:\.\d{2})?)/gi,
      /Available\s+limit:?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
      /Avl\s+Lmt:?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
      /Avail\s+Limit:?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
      /Available\s+Credit\s+Limit:?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
      /(?:^|\s)Limit:?\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
    ];

    for (const pattern of creditLimitPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(message);
      if (match) {
        const limitStr = match[1].replace(',', '');
        try {
          return limitStr;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const accountPatterns = [
      'a/c',
      'account',
      'ac ',
      'acc ',
      'saving account',
      'current account',
      'savings a/c',
      'current a/c',
    ];

    for (const pattern of accountPatterns) {
      if (lowerMessage.includes(pattern)) return false;
    }

    const cardPatterns = [
      'card ending',
      'card xx',
      'debit card',
      'credit card',
      'card no.',
      'card number',
      'card *',
      'card x',
    ];

    for (const pattern of cardPatterns) {
      if (lowerMessage.includes(pattern)) return true;
    }

    const maskedCardRegex = /(?:xx|XX|\*{2,})?\d{4}/;
    if (lowerMessage.includes('ending') && maskedCardRegex.test(message)) {
      return true;
    }

    return false;
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant
      .replace(CompiledPatterns.Cleaning.TRAILING_PARENTHESES, '')
      .replace(CompiledPatterns.Cleaning.REF_NUMBER_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.DATE_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.UPI_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.TIME_SUFFIX, '')
      .replace(CompiledPatterns.Cleaning.TRAILING_DASH, '')
      .replace(CompiledPatterns.Cleaning.PVT_LTD, '')
      .replace(CompiledPatterns.Cleaning.LTD, '')
      .trim();
  }

  protected isValidMerchantName(name: string): boolean {
    const commonWords = new Set([
      'USING',
      'VIA',
      'THROUGH',
      'BY',
      'WITH',
      'FOR',
      'TO',
      'FROM',
      'AT',
      'THE',
    ]);

    return (
      name.length >= Parsing.MIN_MERCHANT_NAME_LENGTH &&
      name.split('').some((c) => /[a-zA-Z]/.test(c)) &&
      !commonWords.has(name.toUpperCase()) &&
      !name.split('').every((c) => /\d/.test(c)) &&
      !name.includes('@')
    );
  }
}