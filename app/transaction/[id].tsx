import { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  getTransactionById,
  getAllAccounts,
  getAccount,
  TransactionEntity,
  AccountEntity,
  linkTransactionToAccount,
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionEntity | null>(null);
  const [accounts, setAccounts] = useState<AccountEntity[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const txn = await getTransactionById(parseInt(id));
        setTransaction(txn);
        setSelectedAccountId(txn?.accountId ?? null);

        const allAccounts = await getAllAccounts();
        setAccounts(allAccounts);
      } catch (error) {
        console.error('Failed to load transaction:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      if (selectedAccountId) {
        await linkTransactionToAccount(transaction.id, selectedAccountId);
      }
      router.back();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      Alert.alert('Error', 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const getAccountLabel = (account: AccountEntity) => {
    const typeLabel = account.type === 'BANK_ACCOUNT' ? 'Bank' : account.type === 'CREDIT_CARD' ? 'Card' : 'Wallet';
    return `${account.name} (${typeLabel})`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-100 items-center justify-center">
        <Text className="text-typography-500">Loading...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View className="flex-1 bg-background-100 items-center justify-center">
        <Text className="text-typography-500">Transaction not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-100">
      <ScrollView className="flex-1">
        <VStack className="p-4 pb-8">
          <Heading className="text-xl mb-4">Edit Transaction</Heading>

          <Card className="p-4 mb-4 bg-background-50">
            <VStack className="space-y-3">
              <HStack className="justify-between">
                <Text className="text-typography-500">Merchant</Text>
                <Text className="text-typography-900 font-medium">{transaction.merchantName}</Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-typography-500">Amount</Text>
                <Text className={`font-semibold ${transaction.transactionType === 'INCOME' || transaction.transactionType === 'CREDIT' ? 'text-success-500' : 'text-typography-900'}`}>
                  {transaction.transactionType === 'INCOME' || transaction.transactionType === 'CREDIT' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-typography-500">Type</Text>
                <Text className="text-typography-900">{transaction.transactionType}</Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-typography-500">Date</Text>
                <Text className="text-typography-900">{formatDateTime(transaction.dateTime)}</Text>
              </HStack>
              {transaction.category && (
                <HStack className="justify-between">
                  <Text className="text-typography-500">Category</Text>
                  <Text className="text-typography-900">{transaction.category}</Text>
                </HStack>
              )}
              {transaction.bankName && (
                <HStack className="justify-between">
                  <Text className="text-typography-500">Bank</Text>
                  <Text className="text-typography-900">{transaction.bankName}</Text>
                </HStack>
              )}
              {transaction.accountNumber && (
                <HStack className="justify-between">
                  <Text className="text-typography-500">Account</Text>
                  <Text className="text-typography-900">****{transaction.accountNumber}</Text>
                </HStack>
              )}
            </VStack>
          </Card>

          <VStack className="space-y-2 mb-4">
            <Text className="text-typography-600 font-medium">Account</Text>
            <Select
              selectedValue={selectedAccountId?.toString() ?? ''}
              onValueChange={(val: string) => setSelectedAccountId(val ? parseInt(val) : null)}
            >
              <SelectTrigger className="border-border-300">
                <SelectInput placeholder="Select account" />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectItem label="No account" value="" />
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      label={getAccountLabel(account)}
                      value={account.id.toString()}
                    />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
            <Text className="text-typography-400 text-xs">
              Link this transaction to a different account
            </Text>
          </VStack>

          <HStack className="space-x-3">
            <Button
              variant="outline"
              onPress={() => router.back()}
              className="flex-1"
            >
              <Text className="text-typography-600">Cancel</Text>
            </Button>
            <Button
              onPress={handleSave}
              disabled={saving}
              className="flex-1"
            >
              <Text className="text-typography-50">{saving ? 'Saving...' : 'Save'}</Text>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </View>
  );
}