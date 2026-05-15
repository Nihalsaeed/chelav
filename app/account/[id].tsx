import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Input, InputField } from '@/components/ui/input';
import { FlatList } from '@/components/ui/flat-list';
import {
  getAccount,
  getAccountBalance,
  getAccountTransactions,
  getAccountBalances,
  getAccountMonthlySpent,
  deleteAccount,
  setManualBalance,
  AccountEntity,
  TransactionEntity,
  AccountBalanceEntity,
} from '@/lib/database';

function formatCurrency(amount: string) {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<AccountEntity | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [monthlySpent, setMonthlySpent] = useState<string>('0');
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [balances, setBalances] = useState<AccountBalanceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBalance, setEditBalance] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const accountData = await getAccount(parseInt(id));
      setAccount(accountData);

      if (accountData) {
        const balanceData = await getAccountBalance(accountData.id);
        setBalance(balanceData);
        setEditBalance(balanceData);

        if (accountData.type === 'CREDIT_CARD') {
          const now = new Date();
          const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const spent = await getAccountMonthlySpent(accountData.id, month);
          setMonthlySpent(spent);
        }

        const txns = await getAccountTransactions(accountData.id);
        setTransactions(txns);

        const balanceHistory = await getAccountBalances(accountData.id);
        setBalances(balanceHistory);
      }
    } catch (error) {
      console.error('Failed to load account:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account?.name}"? This will not delete the transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!account) return;
            await deleteAccount(account.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleEditBalance = async () => {
    if (!account) return;
    await setManualBalance(account.id, editBalance);
    setBalance(editBalance);
    setShowEditModal(false);
    loadData();
  };

  const TransactionItem = ({ item }: { item: TransactionEntity }) => (
    <Pressable
      onPress={() => router.push(`/transaction/${item.id}`)}
      className="py-3 border-b border-background-200"
    >
      <HStack className="justify-between items-center">
        <VStack className="flex-1">
          <Text className="text-typography-900 font-medium">{item.merchantName}</Text>
          <Text className="text-typography-500 text-xs">{formatDateTime(item.dateTime)}</Text>
          {item.category && item.category !== 'Others' && (
            <Text className="text-typography-400 text-xs">{item.category}</Text>
          )}
        </VStack>
        <Text className={`font-semibold ${item.transactionType === 'INCOME' || item.transactionType === 'CREDIT' ? 'text-success-500' : 'text-typography-900'}`}>
          {item.transactionType === 'INCOME' || item.transactionType === 'CREDIT' ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
      </HStack>
    </Pressable>
  );

  const BalanceHistoryItem = ({ item }: { item: AccountBalanceEntity }) => (
    <View className="py-3 border-b border-background-200">
      <HStack className="justify-between items-center">
        <VStack>
          <Text className="text-typography-900">{formatCurrency(item.balance)}</Text>
          <Text className="text-typography-500 text-xs">{formatDateTime(item.createdAt)}</Text>
        </VStack>
        {item.isManualOverride === 1 && (
          <Text className="text-xs bg-warning-100 text-warning-700 px-2 py-1 rounded">Manual</Text>
        )}
      </HStack>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background-100 items-center justify-center">
        <Text className="text-typography-500">Loading...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-background-100 items-center justify-center">
        <Text className="text-typography-500">Account not found</Text>
      </View>
    );
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'BANK_ACCOUNT': return 'Bank Account';
      case 'CREDIT_CARD': return 'Credit Card';
      case 'WALLET': return 'Wallet';
      default: return type;
    }
  };

  return (
    <View className="flex-1 bg-background-100">
      <ScrollView className="flex-1">
        <VStack className="p-4 pb-8">
          <VStack className="mb-6">
            <Text className="text-typography-500 text-sm">{getAccountTypeLabel(account.type)}</Text>
            <Heading className="text-2xl font-bold">{account.name}</Heading>
          </VStack>

          <Card className="p-4 mb-4 bg-background-50">
            <VStack className="space-y-3">
              <HStack className="justify-between items-center">
                <Text className="text-typography-600">Balance</Text>
                <Text className={`text-xl font-bold ${account.type === 'CREDIT_CARD' ? 'text-error-600' : 'text-typography-900'}`}>
                  {account.type === 'CREDIT_CARD' ? '-' : ''}{formatCurrency(balance)}
                </Text>
              </HStack>

              {account.type === 'CREDIT_CARD' && (
                <HStack className="justify-between items-center">
                  <Text className="text-typography-600">Monthly Spent</Text>
                  <Text className="text-lg font-semibold text-typography-900">
                    {formatCurrency(monthlySpent)}
                  </Text>
                </HStack>
              )}

              <HStack className="justify-between items-center">
                <Text className="text-typography-600">Source</Text>
                <Text className="text-typography-500">{account.sourceType}</Text>
              </HStack>
            </VStack>
          </Card>

          <HStack className="space-x-3 mb-4">
            <Button
              variant="outline"
              onPress={() => setShowEditModal(true)}
              className="flex-1"
            >
              <Text className="text-typography-700">Edit Balance</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => setShowHistory(!showHistory)}
              className="flex-1"
            >
              <Text className="text-typography-700">{showHistory ? 'Hide History' : 'View History'}</Text>
            </Button>
          </HStack>

          {showHistory && (
            <Card className="p-4 mb-4 bg-background-50">
              <Text className="text-typography-600 font-medium mb-3">Balance History</Text>
              {balances.length > 0 ? (
                balances.map((item) => (
                  <BalanceHistoryItem key={item.id} item={item} />
                ))
              ) : (
                <Text className="text-typography-400 text-center py-2">No history yet</Text>
              )}
            </Card>
          )}

          <Card className="p-4 mb-4 bg-background-50">
            <Text className="text-typography-600 font-medium mb-3">Transactions</Text>
            {transactions.length > 0 ? (
              transactions.map((item) => (
                <TransactionItem key={item.id} item={item} />
              ))
            ) : (
              <Text className="text-typography-400 text-center py-2">No transactions yet</Text>
            )}
          </Card>

          <Button
            variant="outline"
            onPress={handleDelete}
            className="border-error-200"
          >
            <Text className="text-error-600">Delete Account</Text>
          </Button>
        </VStack>
      </ScrollView>

      {showEditModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center p-4">
          <Card className="w-full bg-background-0 p-6">
            <Heading className="text-xl mb-4">Edit Balance</Heading>
            <VStack className="space-y-4">
              <Input className="border-border-300">
                <InputField
                  placeholder="Enter balance"
                  value={editBalance}
                  onChangeText={setEditBalance}
                  keyboardType="numeric"
                />
              </Input>
              <HStack className="space-x-3 justify-end">
                <Button variant="outline" onPress={() => setShowEditModal(false)}>
                  <Text className="text-typography-600">Cancel</Text>
                </Button>
                <Button onPress={handleEditBalance}>
                  <Text className="text-typography-50">Save</Text>
                </Button>
              </HStack>
            </VStack>
          </Card>
        </View>
      )}
    </View>
  );
}