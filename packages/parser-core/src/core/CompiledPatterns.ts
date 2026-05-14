export const Amount = {
  RS_PATTERN: /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
  INR_PATTERN: /INR\s*([0-9,]+(?:\.\d{2})?)/gi,
  RUPEE_SYMBOL_PATTERN: /₹\s*([0-9,]+(?:\.\d{2})?)/gi,
  ALL_PATTERNS: [
    /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
    /INR\s*([0-9,]+(?:\.\d{2})?)/gi,
    /₹\s*([0-9,]+(?:\.\d{2})?)/gi,
  ],
};

export const Reference = {
  GENERIC_REF: /(?:Ref|Reference|Txn|Transaction)(?:\s+No)?[:\s]+([A-Z0-9]+)/gi,
  UPI_REF: /UPI[:\s]+([0-9]+)/gi,
  REF_NUMBER: /Reference\s+Number[:\s]+([A-Z0-9]+)/gi,
  ALL_PATTERNS: [
    /(?:Ref|Reference|Txn|Transaction)(?:\s+No)?[:\s]+([A-Z0-9]+)/gi,
    /UPI[:\s]+([0-9]+)/gi,
    /Reference\s+Number[:\s]+([A-Z0-9]+)/gi,
  ],
};

export const Account = {
  AC_WITH_MASK: /(?:A\/c|Account|Acct)(?:\s+No)?\.?\s*(\S+)/gi,
  CARD_WITH_MASK: /Card\s+(\S+)/gi,
  ENDING_PATTERN: /(?:ending|ends with|ending with)\s+(\d{4})/gi,
  AC_NO_SLASH: /(?<!\/)AC\s+(\S+)/gi,
  DEBIT_CREDIT_CARD: /(?:debit|credit)\s+card\s+(\S+)/gi,
  YOUR_ACCOUNT: /Your\s+(?:a\/c|account|acct|card|#)\s*(\S+)/gi,
  LINKED_ACCOUNT: /linked\s+(?:a\/c|account|acct)\s+(\S+)/gi,
  ALL_PATTERNS: [
    /(?:A\/c|Account|Acct)(?:\s+No)?\.?\s*(\S+)/gi,
    /Card\s+(\S+)/gi,
    /(?:ending|ends with|ending with)\s+(\d{4})/gi,
    /(?<!\/)AC\s+(\S+)/gi,
    /(?:debit|credit)\s+card\s+(\S+)/gi,
    /Your\s+(?:a\/c|account|acct|card|#)\s*(\S+)/gi,
    /linked\s+(?:a\/c|account|acct)\s+(\S+)/gi,
  ],
};

export const Balance = {
  AVL_BAL_RS: /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
  AVL_BAL_INR: /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/gi,
  AVL_BAL_RUPEE: /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+₹\s*([0-9,]+(?:\.\d{2})?)/gi,
  AVL_BAL_NO_CURRENCY: /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+([0-9,]+(?:\.\d{2})?)/gi,
  UPDATED_BAL_RS: /(?:Updated Balance|Remaining Balance)[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
  UPDATED_BAL_INR: /(?:Updated Balance|Remaining Balance)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/gi,
  ALL_PATTERNS: [
    /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
    /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/gi,
    /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+₹\s*([0-9,]+(?:\.\d{2})?)/gi,
    /(?:Bal|Balance|Avl Bal|Available Balance)[:\s]+([0-9,]+(?:\.\d{2})?)/gi,
    /(?:Updated Balance|Remaining Balance)[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/gi,
    /(?:Updated Balance|Remaining Balance)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/gi,
  ],
};

export const Merchant = {
  TO_PATTERN: /to\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref|\s+UPI)/gi,
  FROM_PATTERN: /from\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref|\s+UPI)/gi,
  AT_PATTERN: /at\s+([^\.\n]+?)(?:\s+on|\s+Ref)/gi,
  FOR_PATTERN: /for\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref)/gi,
  ALL_PATTERNS: [
    /to\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref|\s+UPI)/gi,
    /from\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref|\s+UPI)/gi,
    /at\s+([^\.\n]+?)(?:\s+on|\s+Ref)/gi,
    /for\s+([^\.\n]+?)(?:\s+on|\s+at|\s+Ref)/gi,
  ],
};

export const HDFC = {
  DLT_PATTERNS: [
    /^[A-Z]{2}-HDFCBK.*$/,
    /^[A-Z]{2}-HDFC.*$/,
    /^HDFC-[A-Z]+$/,
    /^[A-Z]{2}-HDFCB.*$/,
  ],
  SALARY_PATTERN: /for\s+[^-]+-[^-]+-[^-]+\s+[A-Z]+\s+SALARY-([^\.\n]+)/gi,
  SIMPLE_SALARY_PATTERN: /SALARY[- ]([^\.\n]+?)(?:\s+Info|$)/gi,
  INFO_PATTERN: /Info:\s*(?:UPI\/)?([^\/\.\n]+?)(?:\/|$)/gi,
  VPA_WITH_NAME: /VPA\s+[^@\s]+@[^\s]+\s*\(([^)]+)\)/gi,
  VPA_PATTERN: /VPA\s+([^@\s]+)@/gi,
  SPENT_PATTERN: /at\s+([^\.\n]+?)\s+on\s+\d{2}/gi,
  DEBIT_FOR_PATTERN: /debited\s+for\s+([^\.\n]+?)\s+on\s+\d{2}/gi,
  MANDATE_PATTERN: /To\s+([^\n]+?)\s*(?:\n|\d{2}\/\d{2})/gi,
  REF_SIMPLE: /Ref\s+(\d{9,12})/gi,
  UPI_REF_NO: /UPI\s+Ref\s+No\s+(\d{12})/gi,
  REF_NO: /Ref\s+No\.?\s+([A-Z0-9]+)/gi,
  REF_END: /(?:Ref|Reference)[:.\s]+([A-Z0-9]{6,})(?:\s*$|\s*Not\s+You)/gi,
  ACCOUNT_DEPOSITED: /deposited\s+in\s+(?:HDFC\s+Bank\s+)?A\/c\s+(?:XX+)?(\d{3,6})/gi,
  ACCOUNT_FROM: /from\s+(?:HDFC\s+Bank\s+)?A\/c\s+(?:XX+)?(\d{3,6})/gi,
  ACCOUNT_SIMPLE: /HDFC\s+Bank\s+A\/c\s+(\d{3,6})/gi,
  ACCOUNT_GENERIC: /A\/c\s+(?:XX+)(\d{3,4})/gi,
  AMOUNT_WILL_DEDUCT: /Rs\.?\s*([0-9,]+(?:\.\d{2})?)\s+will\s+be\s+deducted/gi,
  DEDUCTION_DATE: /deducted\s+on\s+(\d{2}\/\d{2}\/\d{2}),?\s*\d{2}:\d{2}:\d{2}/gi,
  MANDATE_MERCHANT: /For\s+([^\n]+?)\s+mandate/gi,
  UMN_PATTERN: /UMN\s+([a-zA-Z0-9@]+)/gi,
};

export const Cleaning = {
  TRAILING_PARENTHESES: /\s*\(.*?\)\s*$/,
  REF_NUMBER_SUFFIX: /\s+Ref\s+No.*/gi,
  DATE_SUFFIX: /\s+on\s+\d{2}.*/,
  UPI_SUFFIX: /\s+UPI.*/gi,
  TIME_SUFFIX: /\s+at\s+\d{2}:\d{2}.*/gi,
  TRAILING_DASH: /\s*-\s*$/,
  PVT_LTD: /(\s+PVT\.?\s*LTD\.?|\s+PRIVATE\s+LIMITED)$/gi,
  LTD: /(\s+LTD\.?|\s+LIMITED)$/gi,
};

export const Currency = {
  ISO_CODE: /[A-Z]{3}/,
  SPECIFIC_ISO: (code: string) => new RegExp(code, 'i'),
  COMMON_CURRENCIES: /(?:INR|Rs\.?|₹|USD|EUR|GBP|AED|SAR)/gi,
};

export const DatePatterns = {
  DD_MM_YY: /\d{1,2}\/\d{1,2}\/\d{2}/,
  DD_MM_YYYY: /\d{1,2}\/\d{1,2}\/\d{4}/,
  DD_MMM_YY: /\d{1,2}-[A-Za-z]{3}-\d{2}/i,
  DD_MM_YYYY_DASH: /\d{1,2}-\d{1,2}-\d{4}/,
};

export const TimePatterns = {
  HH_MM_SS: /\d{1,2}:\d{2}:\d{2}/,
  HH_MM: /\d{1,2}:\d{2}/,
};

export const CompiledPatterns = {
  Amount,
  Reference,
  Account,
  Balance,
  Merchant,
  HDFC,
  Cleaning,
  Currency,
  Date: DatePatterns,
  Time: TimePatterns,
};