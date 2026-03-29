"use client";

import { AppMenu } from "@/components/app-menu";

type Props = {
  email: string;
  displayName: string;
  avatarUrl: string;
  totalScore: number;
  totalStreak: number;
  isOrganizer?: boolean;
};

export function AppHeaderNav({
  email,
  displayName,
  avatarUrl,
  totalScore,
  totalStreak,
  isOrganizer = false,
}: Props) {
  return (
    <AppMenu
      email={email}
      displayName={displayName}
      avatarUrl={avatarUrl}
      totalScore={totalScore}
      totalStreak={totalStreak}
      isOrganizer={isOrganizer}
    />
  );
}
