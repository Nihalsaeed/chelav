import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function Stats() {
  return (
    <Center className="flex-1 bg-background-100">
      <Heading className="font-bold text-2xl">Stats</Heading>
      <Text className="text-typography-500 mt-2">Your statistics coming soon</Text>
    </Center>
  );
}