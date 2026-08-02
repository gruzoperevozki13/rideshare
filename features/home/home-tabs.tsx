"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearUserRoleAction } from "@/features/actions";
import { DriverTab } from "@/features/trips/driver-tab";
import { PassengerTab } from "@/features/trips/passenger-tab";
import { CarrierTab } from "@/features/cargo/carrier-tab";
import { ShipperTab } from "@/features/cargo/shipper-tab";
import { WishCardData } from "@/features/wishes/wish-card";
import { ProposalCardData } from "@/features/proposals/proposal-card";
import { CargoRequestCardData } from "@/features/cargo/cargo-request-card";
import { Button } from "@/components/ui/button";

type AppRole = "DRIVER" | "PASSENGER" | "CARGO_CARRIER" | "CARGO_SHIPPER";

type DriverTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  date: Date;
  time: string;
  seats: number;
  price: number;
  comment: string | null;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  routePolyline?: string | null;
  bookings: {
    id?: string;
    status?: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      phone: string | null;
    };
  }[];
};

type CarrierTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  date: Date | string;
  time: string;
  vehicleType: string;
  maxWeightKg: number;
  maxVolumeM3?: number | null;
  price: number;
  comment: string | null;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  routePolyline?: string | null;
  bookings: {
    id: string;
    status: string;
    shipper: {
      id: string;
      name: string | null;
      image: string | null;
      phone: string | null;
      rating: number;
    } | null;
  }[];
};

const ROLE_LABEL: Record<AppRole, string> = {
  DRIVER: "Водитель",
  PASSENGER: "Пассажир",
  CARGO_CARRIER: "Грузоперевозчик",
  CARGO_SHIPPER: "Отправитель груза",
};

const ROLE_HINT: Record<AppRole, string> = {
  DRIVER: "Рейсы, пассажиры и поиск попутчиков",
  PASSENGER: "Поиск поездок, запросы и входящие предложения",
  CARGO_CARRIER: "Грузовые рейсы и поиск заявок на перевозку",
  CARGO_SHIPPER: "Заявки на груз и бронирование рейсов",
};

interface HomeTabsProps {
  role: AppRole;
  driverTrips: DriverTrip[];
  nearbyWishes: WishCardData[];
  passengerWishes: WishCardData[];
  myProposals: ProposalCardData[];
  incomingProposals: ProposalCardData[];
  carrierTrips: CarrierTrip[];
  shipperRequests: CargoRequestCardData[];
}

export function HomeTabs({
  role,
  driverTrips,
  nearbyWishes,
  passengerWishes,
  myProposals,
  incomingProposals,
  carrierTrips,
  shipperRequests,
}: HomeTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingIn = incomingProposals.filter((p) => p.status === "PENDING").length;

  const changeRole = () => {
    startTransition(async () => {
      await clearUserRoleAction();
      router.push("/onboarding");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Текущая роль
          </p>
          <p className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
            {ROLE_LABEL[role]}
            {role === "PASSENGER" && pendingIn > 0 && (
              <span className="ml-2 align-middle rounded-lg bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {pendingIn} новых
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{ROLE_HINT[role]}</p>
        </div>
        <Button variant="outline" size="sm" disabled={isPending} onClick={changeRole}>
          {isPending ? "..." : "Сменить роль"}
        </Button>
      </div>

      {role === "DRIVER" && (
        <DriverTab
          trips={driverTrips as never}
          nearbyWishes={nearbyWishes}
          myProposals={myProposals}
        />
      )}

      {role === "PASSENGER" && (
        <PassengerTab
          wishes={passengerWishes}
          incomingProposals={incomingProposals}
        />
      )}

      {role === "CARGO_CARRIER" && <CarrierTab trips={carrierTrips} />}

      {role === "CARGO_SHIPPER" && <ShipperTab myRequests={shipperRequests} />}
    </div>
  );
}
