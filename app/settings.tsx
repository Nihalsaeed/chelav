import { useState, useCallback, useEffect } from 'react';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertText } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { HStack } from '@/components/ui/hstack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsPermissionModule from '@chelav/sms-permission';
import { fetchAndParseMessages, filterCurrentMonthMessages, FetchMessagesResult } from '@/lib/smsService';
import { autoSmsService, AutoSyncState } from '@/lib/autoSmsService';

const AUTO_SYNC_ENABLED_KEY = 'auto_sync_enabled';
const AUTO_SYNC_STATE_KEY = 'auto_sync_state';

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FetchMessagesResult | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncState, setAutoSyncState] = useState<AutoSyncState>('idle');
  const [newTransactions, setNewTransactions] = useState(0);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const saved = await AsyncStorage.getItem(AUTO_SYNC_ENABLED_KEY);
        if (saved === 'true') {
          const currentState = autoSmsService.getState();
          if (currentState === 'listening') {
            setAutoSyncEnabled(true);
            setAutoSyncState('listening');
          } else {
            const started = await autoSmsService.start({
              onStateChange: (state) => {
                setAutoSyncState(state);
                if (state === 'listening') {
                  setAutoSyncEnabled(true);
                }
              },
              onNewTransaction: (count) => setNewTransactions(prev => prev + count),
              onError: (error) => console.error('[AutoSync]', error),
            });
            setAutoSyncEnabled(started);
          }
        }
      } catch (e) {
        console.error('Failed to restore auto sync state', e);
      }
    };
    loadSavedState();
  }, []);

  const handleToggleAutoSync = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const started = await autoSmsService.start({
        onStateChange: setAutoSyncState,
        onNewTransaction: (count) => setNewTransactions(prev => prev + count),
        onError: (error) => console.error('[AutoSync]', error),
      });
      setAutoSyncEnabled(started);
      if (started) {
        await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, 'true');
      }
    } else {
      await autoSmsService.stop();
      setAutoSyncEnabled(false);
      await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, 'false');
    }
  }, []);

  const handleFetchMessages = useCallback(async () => {
    setIsLoading(true);
    setResult(null);
    setPermissionDenied(false);

    try {
      let hasPermission = await SmsPermissionModule.checkSmsPermission();
      if (!hasPermission) {
        const granted = await SmsPermissionModule.requestSmsPermission();
        hasPermission = granted;
      }

      if (!hasPermission) {
        setPermissionDenied(true);
        setIsLoading(false);
        return;
      }

      const messages = await SmsPermissionModule.getSmsMessages(1000);
      const currentMonthMessages = filterCurrentMonthMessages(messages);
      const parseResult = await fetchAndParseMessages(currentMonthMessages);
      setResult(parseResult);
    } catch (error) {
      setResult({
        totalMessages: 0,
        parsedTransactions: 0,
        savedTransactions: 0,
        errors: [String(error)],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Center className="flex-1 bg-background-100 px-6">
      <VStack space="lg" className="w-full max-w-md">
        <Heading className="font-bold text-2xl text-center">Settings</Heading>
        <Divider className="my-4" />

        <VStack space="md" className="items-center">
          <Heading size="sm" className="text-typography-700">Auto-Sync</Heading>
          <Text className="text-typography-500 text-center">
            Automatically update transactions when you receive bank SMS messages.
          </Text>

          <HStack space="md" className="items-center mt-2">
            <Switch
              value={autoSyncEnabled}
              onValueChange={handleToggleAutoSync}
              size="md"
            />
            <Text className="text-typography-600">
              {autoSyncEnabled
                ? autoSyncState === 'processing'
                  ? 'Processing new SMS...'
                  : 'Listening for new messages'
                : 'Disabled'}
            </Text>
          </HStack>

          {newTransactions > 0 && (
            <Text className="text-success-600 font-medium">
              {newTransactions} new transaction{newTransactions > 1 ? 's' : ''} added!
            </Text>
          )}

          <Divider className="my-4 w-full" />

          <Heading size="sm" className="text-typography-700">Manual Sync</Heading>
          <Text className="text-typography-500 text-center">
            Fetch and parse bank SMS messages from this month to populate your transactions.
          </Text>

          <Button
            onPress={handleFetchMessages}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <ButtonText>Fetch This Month's Messages</ButtonText>
            )}
          </Button>

          {permissionDenied && (
            <Alert className="w-full" variant="solid" action="error">
              <AlertText>
                SMS permission denied. Tap the button above to request access again.
              </AlertText>
            </Alert>
          )}

          {result && (
            <VStack space="sm" className="w-full mt-4 p-4 bg-background-0 rounded-lg">
              <Text className="font-semibold text-lg">Sync Complete</Text>
              <Text>Messages processed: {result.totalMessages}</Text>
              <Text>Transactions parsed: {result.parsedTransactions}</Text>
              <Text>Saved to database: {result.savedTransactions}</Text>
              {result.errors.length > 0 && (
                <VStack space="xs" className="mt-2">
                  <Text className="text-error-600 font-medium">Errors:</Text>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <Text key={i} className="text-error-600 text-sm">{err}</Text>
                  ))}
                  {result.errors.length > 5 && (
                    <Text className="text-error-600 text-sm">
                      ...and {result.errors.length - 5} more
                    </Text>
                  )}
                </VStack>
              )}
            </VStack>
          )}
        </VStack>
      </VStack>
    </Center>
  );
}