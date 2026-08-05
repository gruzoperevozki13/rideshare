import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchOpenWishes } from "@/services/wish.service";
import { tripSearchSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = request.nextUrl;

  const parsed = tripSearchSchema.safeParse({
    fromCity: searchParams.get("fromCity") ?? undefined,
    toCity: searchParams.get("toCity") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    seatsMin: searchParams.get("seatsMin") ?? undefined,
    priceMin: searchParams.get("priceMin") ?? undefined,
    priceMax: searchParams.get("priceMax") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    alongRoute: searchParams.get("alongRoute") === "true",
  });

  const filters = parsed.success ? parsed.data : {};

  const wishes = await searchOpenWishes({
    ...filters,
    driverId: session?.user?.id,
  });

  return NextResponse.json(wishes);
}
