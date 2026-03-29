import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StandingsPlaceholderPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Standings</CardTitle>
        <CardDescription>Points & streak leaderboards — Phase 5.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Placeholder route.</CardContent>
    </Card>
  );
}
