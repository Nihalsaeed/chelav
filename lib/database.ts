import * as SQLite from 'expo-sqlite';

export interface TransactionEntity {
  id: number;
  amount: string;
  merchantName: string;
  category: string;
  transactionType: 'INCOME' | 'EXPENSE' | 'CREDIT' | 'TRANSFER' | 'INVESTMENT';
  dateTime: string;
  description: string | null;
  smsBody: string | null;
  bankName: string | null;
  smsSender: string | null;
  accountNumber: string | null;
  balanceAfter: string | null;
  transactionHash: string;
  isRecurring: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
  currency: string;
  fromAccount: string | null;
  toAccount: string | null;
  reference: string | null;
  accountId: number | null;
}

export interface AccountEntity {
  id: number;
  name: string;
  type: 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'WALLET';
  currency: string;
  lastTransactionDate: string | null;
  sourceType: 'AUTO' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceEntity {
  id: number;
  accountId: number;
  balance: string;
  isManualOverride: number;
  transactionId: number | null;
  createdAt: string;
}

export interface AccountWithBalance extends AccountEntity {
  balance: string;
  monthlySpent?: string;
  lastTransactionDate: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('transactions.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount TEXT NOT NULL,
      merchantName TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Others',
      transactionType TEXT NOT NULL,
      dateTime TEXT NOT NULL,
      description TEXT,
      smsBody TEXT,
      bankName TEXT,
      smsSender TEXT,
      accountNumber TEXT,
      balanceAfter TEXT,
      transactionHash TEXT UNIQUE,
      isRecurring INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      fromAccount TEXT,
      toAccount TEXT,
      reference TEXT,
      accountId INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(dateTime);
    CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transactionHash);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transactionType);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('BANK_ACCOUNT', 'CREDIT_CARD', 'WALLET')),
      currency TEXT NOT NULL DEFAULT 'INR',
      lastTransactionDate TEXT,
      sourceType TEXT NOT NULL DEFAULT 'AUTO' CHECK (sourceType IN ('AUTO', 'MANUAL')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name_type ON accounts(name, type);

    CREATE TABLE IF NOT EXISTS account_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER NOT NULL,
      balance TEXT NOT NULL,
      isManualOverride INTEGER DEFAULT 0,
      transactionId INTEGER,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(accountId);
  `);
  await runMigrations(database);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'"
  );
  if (result && !result.sql.includes('accountId')) {
    await database.execAsync('ALTER TABLE transactions ADD COLUMN accountId INTEGER');
  }
  const accountsResult = await database.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'"
  );
  if (!accountsResult) {
    return;
  }
  if (!accountsResult.sql.includes('lastTransactionDate')) {
    await database.execAsync('ALTER TABLE accounts ADD COLUMN lastTransactionDate TEXT');
  }
  if (!accountsResult.sql.includes('sourceType')) {
    await database.execAsync('ALTER TABLE accounts ADD COLUMN sourceType TEXT DEFAULT AUTO CHECK (sourceType IN ("AUTO", "MANUAL"))');
  }
}

export async function insertTransaction(transaction: Omit<TransactionEntity, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT OR IGNORE INTO transactions (
      amount, merchantName, category, transactionType, dateTime, description,
      smsBody, bankName, smsSender, accountNumber, balanceAfter, transactionHash,
      isRecurring, isDeleted, createdAt, updatedAt, currency, fromAccount, toAccount, reference, accountId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.amount,
      transaction.merchantName,
      transaction.category,
      transaction.transactionType,
      transaction.dateTime,
      transaction.description,
      transaction.smsBody,
      transaction.bankName,
      transaction.smsSender,
      transaction.accountNumber,
      transaction.balanceAfter,
      transaction.transactionHash,
      transaction.isRecurring,
      transaction.isDeleted,
      transaction.createdAt,
      transaction.updatedAt,
      transaction.currency,
      transaction.fromAccount,
      transaction.toAccount,
      transaction.reference,
      transaction.accountId,
    ]
  );
  return result.lastInsertRowId;
}

export async function insertTransactions(transactions: Omit<TransactionEntity, 'id'>[]): Promise<void> {
  const database = await getDatabase();
  for (const transaction of transactions) {
    await insertTransaction(transaction);
  }
}

export async function getAllTransactions(): Promise<TransactionEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE isDeleted = 0 ORDER BY dateTime DESC'
  );
  return result;
}

export async function getTransactionsByAccount(accountId: number): Promise<TransactionEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE isDeleted = 0 AND accountId = ? ORDER BY dateTime DESC',
    [accountId]
  );
  return result;
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<TransactionEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE isDeleted = 0 AND dateTime BETWEEN ? AND ? ORDER BY dateTime DESC',
    [startDate, endDate]
  );
  return result;
}

export async function getCurrentMonthTransactions(): Promise<TransactionEntity[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return getTransactionsByDateRange(startDate, endDate);
}

export async function getTransactionByHash(hash: string): Promise<TransactionEntity | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE transactionHash = ? LIMIT 1',
    [hash]
  );
  return result;
}

export async function getTransactionById(id: number): Promise<TransactionEntity | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE id = ? LIMIT 1',
    [id]
  );
  return result;
}

export async function deleteAllTransactions(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM transactions');
}

export async function getTransactionCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE isDeleted = 0'
  );
  return result?.count ?? 0;
}

export async function setManualBalance(accountId: number, balance: string): Promise<void> {
  await insertAccountBalance({
    accountId,
    balance,
    isManualOverride: 1,
    transactionId: null,
    createdAt: new Date().toISOString(),
  });
}

export async function calculateNewBalance(accountId: number): Promise<string> {
  return getAccountBalance(accountId);
}

export async function onNewTransaction(transaction: TransactionEntity): Promise<void> {
  if (transaction.accountId) {
    const latest = await getLatestBalanceRecord(transaction.accountId);
    if (latest && latest.isManualOverride === 1) {
      await consumeManualOverride(
        transaction.accountId,
        await calculateNewBalance(transaction.accountId),
        transaction.id
      );
    }
  }
}

export async function createAccount(account: Omit<AccountEntity, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT OR IGNORE INTO accounts (name, type, currency, lastTransactionDate, sourceType, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      account.name,
      account.type,
      account.currency,
      account.lastTransactionDate,
      account.sourceType,
      account.createdAt,
      account.updatedAt,
    ]
  );
  return result.lastInsertRowId;
}

export async function insertAccount(account: Omit<AccountEntity, 'id'>): Promise<number> {
  return createAccount(account);
}

export async function createWalletAccount(name: string, initialBalance: string): Promise<number> {
  const now = new Date().toISOString();
  const accountId = await createAccount({
    name,
    type: 'WALLET',
    currency: 'INR',
    lastTransactionDate: now,
    sourceType: 'MANUAL',
    createdAt: now,
    updatedAt: now,
  });

  await insertAccountBalance({
    accountId,
    balance: initialBalance,
    isManualOverride: 0,
    transactionId: null,
    createdAt: now,
  });

  return accountId;
}

export async function getAllAccounts(): Promise<AccountEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<AccountEntity>('SELECT * FROM accounts ORDER BY name');
  return result;
}

export async function getAccountById(id: number): Promise<AccountEntity | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<AccountEntity>(
    'SELECT * FROM accounts WHERE id = ? LIMIT 1',
    [id]
  );
  return result;
}

export async function getAccount(id: number): Promise<AccountEntity | null> {
  return getAccountById(id);
}

export async function getAccountByNameAndType(name: string, type: string): Promise<AccountEntity | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<AccountEntity>(
    'SELECT * FROM accounts WHERE name = ? AND type = ? LIMIT 1',
    [name, type]
  );
  return result;
}

export async function getAccountsByType(type: string): Promise<AccountEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<AccountEntity>(
    'SELECT * FROM accounts WHERE type = ? ORDER BY name',
    [type]
  );
  return result;
}

export async function deleteAccount(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function updateAccount(id: number, updates: Partial<AccountEntity>): Promise<void> {
  const database = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];
  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
  if (updates.type !== undefined) { sets.push('type = ?'); values.push(updates.type); }
  if (updates.currency !== undefined) { sets.push('currency = ?'); values.push(updates.currency); }
  if (updates.lastTransactionDate !== undefined) { sets.push('lastTransactionDate = ?'); values.push(updates.lastTransactionDate); }
  if (updates.sourceType !== undefined) { sets.push('sourceType = ?'); values.push(updates.sourceType); }
  sets.push('updatedAt = ?');
  values.push(new Date().toISOString());
  values.push(id);
  await database.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function insertAccountBalance(balance: Omit<AccountBalanceEntity, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO account_balances (accountId, balance, isManualOverride, transactionId, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [balance.accountId, balance.balance, balance.isManualOverride, balance.transactionId, balance.createdAt]
  );
  return result.lastInsertRowId;
}

export async function getLatestAccountBalance(accountId: number): Promise<AccountBalanceEntity | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<AccountBalanceEntity>(
    'SELECT * FROM account_balances WHERE accountId = ? ORDER BY createdAt DESC LIMIT 1',
    [accountId]
  );
  return result;
}

export async function getLatestBalanceRecord(accountId: number): Promise<AccountBalanceEntity | null> {
  return getLatestAccountBalance(accountId);
}

export async function getAccountTransactions(accountId: number): Promise<TransactionEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE isDeleted = 0 AND accountId = ? ORDER BY dateTime DESC',
    [accountId]
  );
  return result;
}

export async function getAccountBalances(accountId: number): Promise<AccountBalanceEntity[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<AccountBalanceEntity>(
    'SELECT * FROM account_balances WHERE accountId = ? ORDER BY createdAt DESC',
    [accountId]
  );
  return result;
}

export async function getAccountBalance(accountId: number): Promise<string> {
  const latestBalance = await getLatestBalanceRecord(accountId);

  if (latestBalance && latestBalance.isManualOverride === 1) {
    return latestBalance.balance;
  }

  const transactions = await getAccountTransactions(accountId);
  const account = await getAccountById(accountId);

  if (!account) return '0';

  if (account.type === 'CREDIT_CARD') {
    return calculateCreditCardBalance(transactions).outstanding.toString();
  } else {
    return calculateBankBalance(transactions).toString();
  }
}

export async function getAccountMonthlySpent(accountId: number, month: string): Promise<string> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1).toISOString();
  const endDate = new Date(year, monthNum, 0, 23, 59, 59).toISOString();
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM transactions
     WHERE isDeleted = 0 AND accountId = ? AND transactionType = 'EXPENSE'
     AND dateTime >= ? AND dateTime <= ?`,
    [accountId, startDate, endDate]
  );
  return result?.total.toString() ?? '0';
}

export async function getAccountBalanceHistory(accountId: number): Promise<AccountBalanceEntity[]> {
  return getAccountBalances(accountId);
}

export async function linkTransactionToAccount(transactionId: number, accountId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE transactions SET accountId = ?, updatedAt = ? WHERE id = ?',
    [accountId, new Date().toISOString(), transactionId]
  );
}

export async function consumeManualOverride(accountId: number, newBalance: string, transactionId: number): Promise<void> {
  await insertAccountBalance({
    accountId,
    balance: newBalance,
    isManualOverride: 0,
    transactionId,
    createdAt: new Date().toISOString(),
  });
}

export async function migrateExistingTransactions(): Promise<number> {
  const database = await getDatabase();
  const transactions = await database.getAllAsync<TransactionEntity>(
    'SELECT * FROM transactions WHERE accountId IS NULL AND isDeleted = 0'
  );

  let migrated = 0;
  for (const txn of transactions) {
    if (txn.bankName) {
      const isFromCard = txn.smsSender?.toUpperCase().includes('CR') ||
                         txn.smsSender?.toUpperCase().includes('CREDIT') ||
                         txn.accountNumber?.startsWith('XXXX');
      const type = isFromCard ? 'CREDIT_CARD' : 'BANK_ACCOUNT';
      const existing = await getAccountByNameAndType(txn.bankName, type);
      if (existing) {
        await linkTransactionToAccount(txn.id, existing.id);
        migrated++;
      }
    }
  }
  return migrated;
}

export function calculateBankBalance(transactions: TransactionEntity[]): number {
  return transactions.reduce((sum, txn) => {
    const amount = parseFloat(txn.amount);
    if (txn.transactionType === 'INCOME' || txn.transactionType === 'CREDIT') {
      return sum + amount;
    } else {
      return sum - amount;
    }
  }, 0);
}

export function calculateMonthlySpent(transactions: TransactionEntity[], accountId: number): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return transactions
    .filter(txn => txn.accountId === accountId && txn.dateTime >= startOfMonth)
    .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
}

export function calculateCreditCardBalance(transactions: TransactionEntity[]): { outstanding: number; monthlySpent: number } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let outstanding = 0;
  let monthlySpent = 0;

  transactions.forEach(txn => {
    const amount = parseFloat(txn.amount);
    const txnDate = new Date(txn.dateTime);

    if (txn.transactionType === 'EXPENSE') {
      outstanding += amount;
      if (txnDate >= startOfMonth) {
        monthlySpent += amount;
      }
    } else if (txn.transactionType === 'INCOME' || txn.transactionType === 'CREDIT') {
      outstanding -= amount;
    }
  });

  return { outstanding, monthlySpent };
}

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const accounts = await getAllAccounts();
  const result: AccountWithBalance[] = [];
  for (const account of accounts) {
    const latestBalance = await getLatestAccountBalance(account.id);
    const balance = latestBalance?.balance ?? '0';
    result.push({
      ...account,
      balance,
      lastTransactionDate: account.lastTransactionDate,
    });
  }
  return result;
}