import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchOpenWishes } from "@/services/wish.service";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = request.nextUrl;

  const wishes = await searchOpenWishes({
    fromCity: searchParams.get("fromCity") ?? undefined,
    toCity: searchParams.get("toCity") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    alongRoute: searchParams.get("alongRoute") === "true",
    driverId: session?.user?.id,
  });

  return NextResponse.json(wishes);
}
