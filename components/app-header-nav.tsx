"use client";

import { AppMenu } from "@/components/app-menu";

type Props = {
  email: string;
};

export function AppHeaderNav({ email }: Props) {
  return <AppMenu email={email} />;
}
