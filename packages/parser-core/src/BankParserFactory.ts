import { BankParser } from './core/BankParser';
import { HDFCBankParser } from './bank/HDFCBankParser';

const parsers: BankParser[] = [
  new HDFCBankParser(),
];

export class BankParserFactory {
  static getParser(sender: string): BankParser | null {
    return parsers.find((p) => p.canHandle(sender)) ?? null;
  }

  static getParserByName(bankName: string): BankParser | null {
    return parsers.find((p) => p.getBankName() === bankName) ?? null;
  }

  static getAllParsers(): BankParser[] {
    return parsers;
  }

  static isKnownBankSender(sender: string): boolean {
    return parsers.some((p) => p.canHandle(sender));
  }
}

export { BankParser } from './core/BankParser';
export { ParsedTransaction, MandateInfo } from './core/ParsedTransaction';
export { TransactionType } from './core/TransactionType';
export { CompiledPatterns } from './core/CompiledPatterns';
export { md5Hex } from './core/Hashing';