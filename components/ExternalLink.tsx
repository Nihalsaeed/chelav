import { Link } from 'expo-router';
import React from 'react';

export function ExternalLink({
  href,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      target="_blank"
      {...props}
      href={href}
    />
  );
}