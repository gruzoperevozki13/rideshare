import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/session";
import { getDriverTrips } from "@/services/trip.service";
import {
  getPassengerWishes,
  getWishesAlongDriverTrips,
} from "@/services/wish.service";
import {
  getDriverProposals,
  getPassengerPendingProposalsCount,
} from "@/services/proposal.service";
import {
  getCarrierCargoTrips,
  getShipperCargoRequests,
} from "@/services/cargo.service";
import { prisma } from "@/lib/prisma";
import { HomeTabs } from "@/features/home/home-tabs";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await getCurrentUser();

  if (!user?.role) {
    redirect("/onboarding");
  }

  if (!user.phone) {
    redirect("/onboarding");
  }

  const role = user.role;
  const isDriver = role === "DRIVER";
  const isPassenger = role === "PASSENGER";
  const isCarrier = role === "CARGO_CARRIER";
  const isShipper = role === "CARGO_SHIPPER";

  const [
    driverTrips,
    passengerWishes,
    nearbyWishes,
    myProposals,
    incomingProposals,
    pendingCount,
    carrierTrips,
    shipperRequests,
  ] = await Promise.all([
    isDriver ? getDriverTrips(user.id) : Promise.resolve([]),
    isPassenger ? getPassengerWishes(user.id) : Promise.resolve([]),
    isDriver ? getWishesAlongDriverTrips(user.id) : Promise.resolve([]),
    isDriver ? getDriverProposals(user.id) : Promise.resolve([]),
    isPassenger
      ? prisma.proposal
          .findMany({
            where: {
              wish: { passengerId: user.id },
              status: { in: ["PENDING", "ACCEPTED"] },
            },
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  rating: true,
                  phone: true,
                },
              },
              wish: {
                select: { fromCity: true, toCity: true, date: true },
              },
              trip: {
                select: {
                  id: true,
                  fromCity: true,
                  toCity: true,
                  time: true,
                  price: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
          .then(async (proposals) => {
            const acceptedTripIds = proposals
              .filter((p) => p.status === "ACCEPTED" && p.tripId)
              .map((p) => p.tripId as string);
            const bookings =
              acceptedTripIds.length > 0
                ? await prisma.booking.findMany({
                    where: {
                      userId: user.id,
                      tripId: { in: acceptedTripIds },
                      status: { in: ["PENDING", "CONFIRMED"] },
                    },
                    select: { id: true, tripId: true },
                  })
                : [];
            const byTrip = new Map(bookings.map((b) => [b.tripId, b.id]));
            return proposals.map((p) => ({
              ...p,
              bookingId: p.tripId ? byTrip.get(p.tripId) ?? null : null,
            }));
          })
      : Promise.resolve([]),
    isPassenger ? getPassengerPendingProposalsCount(user.id) : Promise.resolve(0),
    isCarrier ? getCarrierCargoTrips(user.id) : Promise.resolve([]),
    isShipper ? getShipperCargoRequests(user.id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,hsl(199_89%_55%/_0.5),transparent_55%),linear-gradient(165deg,#0b3d6b_0%,#0b6bcb_50%,#7dd3fc_100%)]" />
        <div className="absolute inset-0 hero-scrim" />
        <div className="relative container mx-auto max-w-4xl px-4 pb-14 pt-16 sm:pb-16 sm:pt-24">
          <p className="animate-fade-in text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
            RideShare
          </p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl animate-fade-up">
            Привет, {user.name ?? "попутчик"}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 animate-fade-up stagger-1">
            Маршруты, бронирования и связь — всё в одном месте под вашу роль.
          </p>
          {pendingCount > 0 && (
            <p className="mt-5 inline-flex rounded-xl bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-md animate-soft-pulse">
              {pendingCount} новых предложений от водителей
            </p>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <HomeTabs
          role={role}
          driverTrips={driverTrips}
          nearbyWishes={nearbyWishes as never}
          passengerWishes={passengerWishes as never}
          myProposals={myProposals as never}
          incomingProposals={incomingProposals as never}
          carrierTrips={carrierTrips as never}
          shipperRequests={shipperRequests as never}
        />
      </div>
    </div>
  );
}
