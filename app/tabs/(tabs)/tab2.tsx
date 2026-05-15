import { useState, useCallback } from 'react';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertText } from '@/components/ui/alert';
import SmsPermissionModule from '@chelav/sms-permission';
import { fetchAndParseMessages, filterCurrentMonthMessages, FetchMessagesResult } from '@/lib/smsService';

export default function Tab2() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FetchMessagesResult | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleFetchMessages = useCallback(async () => {
    setIsLoading(true);
    setResult(null);
    setPermissionDenied(false);

    try {
      const hasPermission = await SmsPermissionModule.checkSmsPermission();
      if (!hasPermission) {
        const granted = await SmsPermissionModule.requestSmsPermission();
        if (!granted) {
          setPermissionDenied(true);
          setIsLoading(false);
          return;
        }
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
          <Heading size="sm" className="text-typography-700">SMS Sync</Heading>
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
                SMS permission denied. Please enable it in app settings.
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