import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function Wallet() {
  return (
    <Center className="flex-1 bg-background-100">
      <Heading className="font-bold text-2xl">Wallet</Heading>
      <Text className="text-typography-500 mt-2">Your wallet coming soon</Text>
    </Center>
  );
}