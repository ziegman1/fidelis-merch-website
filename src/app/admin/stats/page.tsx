import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function AdminStatsPage() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  let totalViews = 0;
  let uniqueVisitors = 0;
  let byPath: { path: string; _count: { id: number } }[] = [];
  let byDay: { date: Date; cnt?: bigint; count?: bigint }[] = [];

  try {
    const [views, visitors, paths, daily] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: {
        createdAt: { gte: since },
        visitorId: { not: null },
      },
    }).then((r) => r.length),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw<{ date: Date; cnt: bigint }[]>`
      SELECT date_trunc('day', "createdAt")::date AS date, COUNT(*)::bigint AS cnt
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY date_trunc('day', "createdAt")::date
      ORDER BY date ASC
    `,
    ]);
    totalViews = views;
    uniqueVisitors = visitors;
    byPath = paths;
    byDay = Array.isArray(daily) ? daily : [];
  } catch (e) {
    console.error("[AdminStatsPage]", e);
  }

  const viewsByDay = Object.fromEntries(
    byDay.map((r) => {
      const n = Number(r?.cnt ?? (r as { count?: bigint })?.count ?? 0);
      return [r?.date?.toISOString?.()?.slice(0, 10) ?? "", n];
    }).filter(([k]) => k)
  );

  // Fill in missing days with 0
  const dailyData: { date: string; views: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyData.push({ date: key, views: viewsByDay[key] ?? 0 });
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide">Traffic & Stats</h1>
      <p className="text-zinc-400 text-sm">Storefront page views from the last {DAYS} days.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-primary/25 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-cream">Page views</CardTitle>
            <CardDescription>Last {DAYS} days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-primary">{totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-brand-primary/25 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-cream">Unique visitors</CardTitle>
            <CardDescription>Estimated (by IP hash)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-primary">{uniqueVisitors.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-brand-primary/25 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-cream">Views by day</CardTitle>
          <CardDescription>Daily page view count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dailyData.map(({ date, views }) => (
              <div
                key={date}
                className="flex flex-col items-center rounded border border-zinc-700 px-2 py-1 min-w-[3rem]"
                title={`${date}: ${views} views`}
              >
                <span className="text-xs text-zinc-500">{date.slice(5)}</span>
                <span className="text-sm font-medium text-brand-primary">{views}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-brand-primary/25 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-cream">Top pages</CardTitle>
          <CardDescription>Most viewed paths</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {byPath.length === 0 ? (
              <li className="text-zinc-500 text-sm">No data yet. Traffic will appear as visitors browse the storefront.</li>
            ) : (
              byPath.map(({ path, _count }) => (
                <li key={path} className="flex justify-between text-sm">
                  <span className="text-cream font-mono">{path || "/"}</span>
                  <span className="text-brand-primary">{(_count?.id ?? 0).toLocaleString()} views</span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
