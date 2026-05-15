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
      reference TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(dateTime);
    CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transactionHash);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transactionType);
  `);
}

export async function insertTransaction(transaction: Omit<TransactionEntity, 'id'>): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT OR IGNORE INTO transactions (
      amount, merchantName, category, transactionType, dateTime, description,
      smsBody, bankName, smsSender, accountNumber, balanceAfter, transactionHash,
      isRecurring, isDeleted, createdAt, updatedAt, currency, fromAccount, toAccount, reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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