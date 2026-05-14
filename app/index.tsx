import React, { useState, useEffect } from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import SmsPermission, { SmsMessage } from '@/modules/sms-permission';

const PRIVACY_POINTS = [
  'Only transaction messages are processed',
  'All data stays on your device',
  'No personal messages are read',
  'You can revoke access anytime in Settings',
];

export default function Onboarding() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const granted = SmsPermission.checkSmsPermission();
      setHasPermission(granted);
    } catch (error) {
      console.error('Error checking permission:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      await SmsPermission.requestSmsPermission();
      const granted = SmsPermission.checkSmsPermission();
      setHasPermission(granted);

      if (granted) {
        router.push('/tabs/tab1');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const handleSkip = () => {
    router.push('/tabs/tab1');
  };

  if (isChecking) {
    return (
      <Box className="flex-1 bg-background-100 justify-center items-center p-6">
        <Text className="text-typography-600">Checking permissions...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-background-100 justify-center items-center p-6">
      <VStack space="xl" className="w-full max-w-[320px]">
        <Text className="text-3xl font-bold text-center text-typography-900">
          Your Privacy Matters
        </Text>

        {hasPermission ? (
          <Box className="bg-green-100 p-4 rounded-lg">
            <Text className="text-green-700 text-center font-semibold">
              Permission Granted
            </Text>
            <Text className="text-green-600 text-center text-sm mt-2">
              SMS access is enabled. Tap continue to proceed.
            </Text>
          </Box>
        ) : (
          <>
            <VStack space="md" className="mt-4">
              {PRIVACY_POINTS.map((point, index) => (
                <Box key={index} className="flex-row items-start">
                  <Text className="text-typography-500 mr-3">•</Text>
                  <Text className="text-typography-600 flex-1">{point}</Text>
                </Box>
              ))}
            </VStack>

            <Button
              size="lg"
              className="mt-6 bg-primary-500"
              onPress={handleRequestPermission}
            >
              <ButtonText className="text-typography-0 font-semibold">
                Allow Messages Access
              </ButtonText>
            </Button>
          </>
        )}

        <Button
          size="md"
          variant="outline"
          className="mt-4"
          onPress={handleSkip}
        >
          <ButtonText className="text-typography-500">
            Skip for now
          </ButtonText>
        </Button>

        {hasPermission && (
          <Button
            size="lg"
            className="mt-4 bg-green-600"
            onPress={() => router.push('/tabs/tab1')}
          >
            <ButtonText className="text-typography-0 font-semibold">
              Continue
            </ButtonText>
          </Button>
        )}
      </VStack>
    </Box>
  );
}