import React, { useCallback, useState } from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { FlatList } from '@/components/ui/flat-list';
import { Pressable } from '@/components/ui/pressable';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { getCurrentMonthTransactions, TransactionEntity } from '@/lib/database';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TransactionItem({ title, amount, date, onPress }: { title: string; amount: number; date: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className="py-4 border-b border-background-200">
        <HStack className="justify-between items-center">
          <VStack space="xs">
            <Text className="text-typography-900 font-medium">{title}</Text>
            <Text className="text-typography-500 text-sm">{date}</Text>
          </VStack>
          <Text className={`font-semibold ${amount >= 0 ? 'text-success-500' : 'text-typography-900'}`}>
            {amount >= 0 ? '+' : ''}${Math.abs(amount).toFixed(2)}
          </Text>
        </HStack>
      </Box>
    </Pressable>
  );
}

export default function Dashboard() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [balance, setBalance] = useState('$0.00');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const txns = await getCurrentMonthTransactions();
      setTransactions(txns);

      const total = txns.reduce((sum, txn) => {
        const amount = parseFloat(txn.amount);
        return sum + (txn.transactionType === 'INCOME' ? amount : -amount);
      }, 0);
      setBalance(`$${total.toFixed(2)}`);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadTransactions();
    }, [])
  );

  const displayTransactions = transactions.length > 0 ? transactions : [];
  const displayBalance = transactions.length > 0 ? balance : '$12,450.00';

  return (
    <Box className="flex-1 bg-background-100">
      <Box className="pt-16 pb-6 px-6 bg-primary-500">
        <Text className="text-typography-0 text-2xl font-bold">
          {getGreeting()}, {name || 'User'}
        </Text>
      </Box>

      <Box className="px-6 -mt-6">
        <Card size="lg" variant="elevated" className="bg-background-0">
          <VStack space="sm">
            <Text className="text-typography-500 text-sm">Current Balance</Text>
            <Text className="text-3xl font-bold text-typography-900">{displayBalance}</Text>
          </VStack>
        </Card>
      </Box>

      <Box className="px-6 mt-8">
        <Text className="text-xl font-semibold text-typography-900 mb-4">Transactions</Text>
        <Card variant="filled" className="bg-background-0 p-2">
          {displayTransactions.length > 0 ? (
            <FlatList
              data={displayTransactions}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TransactionItem
                  title={item.merchantName}
                  amount={item.transactionType === 'INCOME' ? parseFloat(item.amount) : -parseFloat(item.amount)}
                  date={formatDate(item.dateTime)}
                  onPress={() => router.push(`/transaction/${item.id}`)}
                />
              )}
            />
          ) : (
            <VStack space="sm" className="p-4">
              <Text className="text-typography-500 text-center">
                No transactions yet
              </Text>
              <Text className="text-typography-400 text-sm text-center">
                Go to Settings to fetch your bank SMS messages
              </Text>
            </VStack>
          )}
        </Card>
      </Box>
    </Box>
  );
}