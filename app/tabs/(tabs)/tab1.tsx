import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { FlatList } from '@/components/ui/flat-list';
import { useLocalSearchParams } from 'expo-router';

const TRANSACTIONS = [
  { id: '1', title: 'Grocery Shopping', amount: -45.99, date: 'Today' },
  { id: '2', title: 'Salary Deposit', amount: 2500.0, date: 'Yesterday' },
  { id: '3', title: 'Electric Bill', amount: -89.99, date: 'May 12' },
  { id: '4', title: 'Restaurant', amount: -32.50, date: 'May 10' },
  { id: '5', title: 'Freelance Work', amount: 500.0, date: 'May 8' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function TransactionItem({ title, amount, date }: { title: string; amount: number; date: string }) {
  return (
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
  );
}

export default function Dashboard() {
  const { name } = useLocalSearchParams<{ name: string }>();

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
            <Text className="text-3xl font-bold text-typography-900">$12,450.00</Text>
          </VStack>
        </Card>
      </Box>

      <Box className="px-6 mt-8">
        <Text className="text-xl font-semibold text-typography-900 mb-4">Transactions</Text>
        <Card variant="filled" className="bg-background-0 p-2">
          <FlatList
            data={TRANSACTIONS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionItem
                title={item.title}
                amount={item.amount}
                date={item.date}
              />
            )}
          />
        </Card>
      </Box>
    </Box>
  );
}