import { useState, useEffect, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Fab } from '@/components/ui/fab';
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
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from '@/components/ui/modal';
import { Divider } from '@/components/ui/divider';
import {
  getAllAccounts,
  getAccountBalance,
  getAccountMonthlySpent,
  AccountEntity,
  createWalletAccount,
  createAccount,
} from '@/lib/database';
import { Icon } from '@/components/ui/icon';

interface AccountWithBalance extends AccountEntity {
  balance: string;
  monthlySpent?: string;
}

export default function Wallet() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountType, setNewAccountType] = useState<'BANK_ACCOUNT' | 'CREDIT_CARD' | 'WALLET'>('WALLET');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const allAccounts = await getAllAccounts();
      const withBalances: AccountWithBalance[] = await Promise.all(
        allAccounts.map(async (account) => {
          const balance = await getAccountBalance(account.id);
          let monthlySpent: string | undefined;
          if (account.type === 'CREDIT_CARD') {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            monthlySpent = await getAccountMonthlySpent(account.id, month);
          }
          return { ...account, balance, monthlySpent };
        })
      );
      setAccounts(withBalances);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const bankAccounts = accounts.filter((a) => a.type === 'BANK_ACCOUNT');
  const creditCards = accounts.filter((a) => a.type === 'CREDIT_CARD');
  const wallets = accounts.filter((a) => a.type === 'WALLET');

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No transactions';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    setCreating(true);
    try {
      if (newAccountType === 'WALLET') {
        await createWalletAccount(newAccountName.trim(), newAccountBalance || '0');
      } else {
        const now = new Date().toISOString();
        await createAccount({
          name: newAccountName.trim(),
          type: newAccountType,
          currency: 'INR',
          lastTransactionDate: null,
          sourceType: 'MANUAL',
          createdAt: now,
          updatedAt: now,
        });
      }
      setShowAddModal(false);
      setNewAccountName('');
      setNewAccountBalance('');
      setNewAccountType('WALLET');
      loadAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setCreating(false);
    }
  };

  const AccountCard = ({ account }: { account: AccountWithBalance }) => (
    <Pressable
      onPress={() => router.push(`/account/${account.id}`)}
      className="mb-3"
    >
      <Card className="p-4 bg-background-50">
        <HStack className="justify-between items-center">
          <VStack className="flex-1">
            <Text className="text-typography-900 font-medium">{account.name}</Text>
            <Text className="text-typography-500 text-sm">
              Last: {formatDate(account.lastTransactionDate)}
            </Text>
          </VStack>
          <VStack className="items-end">
            <Text className={`font-semibold ${account.type === 'CREDIT_CARD' ? 'text-error-600' : 'text-typography-900'}`}>
              {account.type === 'CREDIT_CARD' ? '-' : ''}{formatCurrency(account.balance)}
            </Text>
            {account.type === 'CREDIT_CARD' && account.monthlySpent && (
              <Text className="text-typography-500 text-xs">
                Spent: {formatCurrency(account.monthlySpent)}
              </Text>
            )}
          </VStack>
        </HStack>
      </Card>
    </Pressable>
  );

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <HStack className="justify-between items-center py-2">
      <Heading className="text-lg">{title}</Heading>
      <Text className="text-typography-500 text-sm">{count} accounts</Text>
    </HStack>
  );

  return (
    <View className="flex-1 bg-background-100">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {loading ? (
          <Text className="text-typography-500 text-center py-8">Loading...</Text>
        ) : (
          <VStack className="pb-20">
            {bankAccounts.length > 0 && (
              <VStack className="mb-6">
                <SectionHeader title="Bank Accounts" count={bankAccounts.length} />
                {bankAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </VStack>
            )}

            {creditCards.length > 0 && (
              <VStack className="mb-6">
                <SectionHeader title="Credit Cards" count={creditCards.length} />
                {creditCards.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </VStack>
            )}

            {wallets.length > 0 && (
              <VStack className="mb-6">
                <SectionHeader title="Wallets" count={wallets.length} />
                {wallets.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </VStack>
            )}

            {accounts.length === 0 && (
              <VStack className="items-center py-12">
                <Text className="text-typography-500 mb-2">No accounts yet</Text>
                <Text className="text-typography-400 text-sm text-center">
                  Tap the + button to add your first account
                </Text>
              </VStack>
            )}
          </VStack>
        )}
      </ScrollView>

      <Fab onPress={() => setShowAddModal(true)}>
        <Text className="text-typography-50 font-bold text-xl">+</Text>
      </Fab>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <ModalBackdrop />
        <ModalContent className="bg-background-100">
          <ModalHeader>
            <Heading className="text-xl">Add Account</Heading>
          </ModalHeader>
          <ModalBody className="py-4">
            <VStack className="space-y-4">
              <VStack className="space-y-2">
                <Text className="text-sm text-typography-600">Account Type</Text>
                <Select
                  selectedValue={newAccountType}
                  onValueChange={(val: any) => setNewAccountType(val)}
                >
                  <SelectTrigger className="border-border-300">
                    <SelectInput />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectItem label="Bank Account" value="BANK_ACCOUNT" />
                      <SelectItem label="Credit Card" value="CREDIT_CARD" />
                      <SelectItem label="Wallet" value="WALLET" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>

              <VStack className="space-y-2">
                <Text className="text-sm text-typography-600">Account Name</Text>
                <Input className="border-border-300">
                  <InputField
                    placeholder="e.g., HDFC Savings"
                    value={newAccountName}
                    onChangeText={setNewAccountName}
                  />
                </Input>
              </VStack>

              {newAccountType === 'WALLET' && (
                <VStack className="space-y-2">
                  <Text className="text-sm text-typography-600">Initial Balance</Text>
                  <Input className="border-border-300">
                    <InputField
                      placeholder="0"
                      value={newAccountBalance}
                      onChangeText={setNewAccountBalance}
                      keyboardType="numeric"
                    />
                  </Input>
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter className="flex-row justify-end space-x-3">
            <Button
              variant="outline"
              onPress={() => setShowAddModal(false)}
              className="px-4 py-2"
            >
              <Text className="text-typography-600">Cancel</Text>
            </Button>
            <Button
              onPress={handleCreateAccount}
              disabled={creating || !newAccountName.trim()}
              className="px-4 py-2"
            >
              <Text className="text-typography-50">
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}