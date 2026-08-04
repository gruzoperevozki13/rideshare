"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/session";
import { tripSchema, profileSchema, roleSchema, wishSchema } from "@/lib/validations";
import { buildTripGeo } from "@/services/route.service";

export async function setUserRole(formData: FormData) {
  const user = await requireAuth();
  const parsed = roleSchema.safeParse({
    role: formData.get("role"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Неверные данные" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true },
  });

  const phone = parsed.data.phone ?? dbUser?.phone ?? undefined;
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return { error: "Укажите номер телефона" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: parsed.data.role, phone },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function clearUserRoleAction() {
  const user = await requireAuth();
  await prisma.user.update({
    where: { id: user.id },
    data: { role: null },
  });
  revalidatePath("/");
  revalidatePath("/onboarding");
  return { success: true };
}

export async function createTrip(formData: FormData) {
  try {
    const user = await requireRole("DRIVER");

    const parsed = tripSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      seats: formData.get("seats"),
      price: formData.get("price"),
      comment: formData.get("comment") || undefined,
      routePolyline: formData.get("routePolyline") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }

    const { routePolyline: selectedRoute, ...tripFields } = parsed.data;
    const geo = await buildTripGeo(
      tripFields.fromCity,
      tripFields.toCity,
      selectedRoute
    );

    await prisma.trip.create({
      data: {
        ...tripFields,
        date: new Date(tripFields.date),
        driverId: user.id,
        fromLat: geo.fromLat,
        fromLng: geo.fromLng,
        toLat: geo.toLat,
        toLng: geo.toLng,
        routePolyline: geo.routePolyline,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { tripsCount: { increment: 1 } },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function updateTrip(tripId: string, formData: FormData) {
  const user = await requireAuth();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: user.id },
  });

  if (!trip) {
    return { error: "Поездка не найдена" };
  }

  const parsed = tripSchema.safeParse({
    fromCity: formData.get("fromCity"),
    toCity: formData.get("toCity"),
    date: formData.get("date"),
    time: formData.get("time"),
    seats: formData.get("seats"),
    price: formData.get("price"),
    comment: formData.get("comment") || undefined,
    routePolyline: formData.get("routePolyline") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  const { routePolyline: selectedRoute, ...tripFields } = parsed.data;
  const geo = await buildTripGeo(
    tripFields.fromCity,
    tripFields.toCity,
    selectedRoute
  );

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...tripFields,
      date: new Date(tripFields.date),
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      routePolyline: geo.routePolyline,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTrip(tripId: string) {
  const user = await requireAuth();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: user.id },
  });

  if (!trip) {
    return { error: "Поездка не найдена" };
  }

  await prisma.trip.delete({ where: { id: tripId } });

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();

  const yearRaw = formData.get("carYear");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    bio: formData.get("bio") || undefined,
    carBrand: formData.get("carBrand") || undefined,
    carModel: formData.get("carModel") || undefined,
    carColor: formData.get("carColor") || undefined,
    carPlate: formData.get("carPlate") || undefined,
    carYear: yearRaw && String(yearRaw).length > 0 ? yearRaw : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  const data: Record<string, unknown> = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    bio: parsed.data.bio || null,
    carBrand: parsed.data.carBrand || null,
    carModel: parsed.data.carModel || null,
    carColor: parsed.data.carColor || null,
    carPlate: parsed.data.carPlate || null,
    carYear:
      typeof parsed.data.carYear === "number" ? parsed.data.carYear : null,
  };

  try {
    const { saveUpload } = await import("@/lib/upload");

    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      data.image = await saveUpload(avatar, "avatars", user.id);
    }

    const carImage = formData.get("carImage");
    if (carImage instanceof File && carImage.size > 0) {
      data.carImage = await saveUpload(carImage, "cars", user.id);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка загрузки фото" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bookTrip(tripId: string) {
  try {
    const user = await requireRole("PASSENGER");

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });

    if (!dbUser?.phone || dbUser.phone.replace(/\D/g, "").length < 10) {
      return { error: "Укажите телефон в профиле перед бронированием" };
    }

    const { createBooking } = await import("@/services/booking.service");
    const booking = await createBooking(tripId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true, pending: true, bookingId: booking.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка бронирования" };
  }
}

export async function confirmBookingAction(bookingId: string) {
  const user = await requireAuth();
  const { confirmBooking } = await import("@/services/booking.service");

  try {
    const booking = await confirmBooking(bookingId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return {
      success: true,
      passengerPhone: booking.user.phone,
      driverPhone: booking.trip.driver.phone,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function rejectBookingAction(bookingId: string) {
  const user = await requireAuth();
  const { rejectBooking } = await import("@/services/booking.service");

  try {
    await rejectBooking(bookingId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function cancelBookingAction(bookingId: string, reason: string) {
  const user = await requireAuth();
  try {
    const { cancelBooking } = await import("@/services/booking.service");
    await cancelBooking(bookingId, user.id, reason);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка отмены" };
  }
}

export async function createWishAction(formData: FormData) {
  try {
    const user = await requireRole("PASSENGER");

    const parsed = wishSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      seats: formData.get("seats") || 1,
      comment: formData.get("comment") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }

    const { createWish } = await import("@/services/wish.service");
    await createWish(user.id, {
      ...parsed.data,
      date: new Date(parsed.data.date),
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function updateWishAction(wishId: string, formData: FormData) {
  try {
    const user = await requireRole("PASSENGER");

    const parsed = wishSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      seats: formData.get("seats") || 1,
      comment: formData.get("comment") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }

    const { updateWish } = await import("@/services/wish.service");
    await updateWish(wishId, user.id, {
      ...parsed.data,
      date: new Date(parsed.data.date),
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function cancelWishAction(wishId: string) {
  const user = await requireAuth();
  const { cancelWish } = await import("@/services/wish.service");

  try {
    await cancelWish(wishId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function createProposalAction(formData: FormData) {
  const user = await requireAuth();
  const { proposalSchema } = await import("@/lib/validations");

  const tripIdRaw = formData.get("tripId");
  const parsed = proposalSchema.safeParse({
    wishId: formData.get("wishId"),
    tripId: tripIdRaw && String(tripIdRaw).length > 0 ? String(tripIdRaw) : undefined,
    price: formData.get("price"),
    time: formData.get("time") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  const { createProposal } = await import("@/services/proposal.service");

  try {
    await createProposal({
      driverId: user.id,
      ...parsed.data,
    });
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка предложения" };
  }
}

export async function acceptProposalAction(proposalId: string) {
  const user = await requireAuth();
  const { acceptProposal } = await import("@/services/proposal.service");

  try {
    const result = await acceptProposal(proposalId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return {
      success: true,
      bookingId: result.bookingId,
      driverPhone: result.driverPhone,
      passengerPhone: result.passengerPhone,
      driverName: result.driverName,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка принятия" };
  }
}

export async function declineProposalAction(proposalId: string) {
  const user = await requireAuth();
  const { declineProposal } = await import("@/services/proposal.service");

  try {
    await declineProposal(proposalId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function cancelProposalAction(proposalId: string) {
  const user = await requireAuth();
  const { cancelProposal } = await import("@/services/proposal.service");

  try {
    await cancelProposal(proposalId, user.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function registerAction(formData: FormData) {
  const { registerSchema } = await import("@/lib/validations");
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  try {
    const { registerUser } = await import("@/services/auth.service");
    const { acceptTerms: _ok, ...userData } = parsed.data;
    const result = await registerUser(userData);
    return {
      success: true as const,
      needsVerification: result.needsVerification,
      email: parsed.data.email.toLowerCase().trim(),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка регистрации" };
  }
}

export async function resendVerificationAction(email: string) {
  try {
    const { resendVerificationEmail } = await import("@/services/auth.service");
    await resendVerificationEmail(email);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось отправить письмо" };
  }
}

export async function verifyEmailCodeAction(email: string, code: string) {
  try {
    const { verifyEmailCode } = await import("@/services/auth.service");
    await verifyEmailCode(email, code);
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Не удалось подтвердить email",
    };
  }
}

/** Проверка перед входом: пароль и статус подтверждения почты */
export async function checkCredentialsAction(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase().trim();
  const { prisma } = await import("@/lib/prisma");
  const { verifyPassword } = await import("@/services/auth.service");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { error: "Неверный email или пароль" as const };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Неверный email или пароль" as const };
  }

  if (!user.emailVerified) {
    return { needsVerification: true as const };
  }

  return { ok: true as const };
}

export async function requestPasswordResetAction(emailRaw: string) {
  const { forgotPasswordSchema } = await import("@/lib/validations");
  const parsed = forgotPasswordSchema.safeParse({ email: emailRaw });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Некорректный email" };
  }

  try {
    const { requestPasswordReset } = await import("@/services/auth.service");
    await requestPasswordReset(parsed.data.email);
    return {
      success: true as const,
      email: parsed.data.email.toLowerCase().trim(),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не удалось отправить письмо. Проверьте настройки почты.",
    };
  }
}

export async function resetPasswordAction(
  emailRaw: string,
  code: string,
  password: string
) {
  const { resetPasswordSchema } = await import("@/lib/validations");
  const parsed = resetPasswordSchema.safeParse({
    email: emailRaw,
    code,
    password,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  try {
    const { resetPasswordWithCode } = await import("@/services/auth.service");
    await resetPasswordWithCode(
      parsed.data.email,
      parsed.data.code,
      parsed.data.password
    );
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Не удалось сменить пароль",
    };
  }
}

export async function getMessagesAction(bookingId: string) {
  const user = await requireAuth();
  try {
    const { getBookingMessages } = await import("@/services/message.service");
    const messages = await getBookingMessages(bookingId, user.id);
    return { success: true as const, messages };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
      messages: [] as never[],
    };
  }
}

export async function sendMessageAction(bookingId: string, body: string) {
  const user = await requireAuth();
  try {
    const { sendBookingMessage } = await import("@/services/message.service");
    const message = await sendBookingMessage(bookingId, user.id, body);
    revalidatePath("/dashboard");
    return { success: true as const, message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка отправки" };
  }
}

export async function getCargoMessagesAction(bookingId: string) {
  const user = await requireAuth();
  try {
    const { getCargoBookingMessages } = await import(
      "@/services/cargo-message.service"
    );
    const messages = await getCargoBookingMessages(bookingId, user.id);
    return { success: true as const, messages };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
      messages: [] as never[],
    };
  }
}

export async function sendCargoMessageAction(bookingId: string, body: string) {
  const user = await requireAuth();
  try {
    const { sendCargoBookingMessage } = await import(
      "@/services/cargo-message.service"
    );
    const message = await sendCargoBookingMessage(bookingId, user.id, body);
    return { success: true as const, message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка отправки" };
  }
}

export async function createReviewAction(formData: FormData) {
  const user = await requireAuth();
  const { reviewSchema } = await import("@/lib/validations");
  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  try {
    const { createReview } = await import("@/services/review.service");
    await createReview({ ...parsed.data, authorId: user.id });
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка оценки" };
  }
}

export async function createCargoTripAction(formData: FormData) {
  try {
    const user = await requireRole("CARGO_CARRIER");
    const { cargoTripSchema } = await import("@/lib/validations");
    const parsed = cargoTripSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      vehicleType: formData.get("vehicleType"),
      maxWeightKg: formData.get("maxWeightKg"),
      maxVolumeM3: formData.get("maxVolumeM3") || undefined,
      price: formData.get("price"),
      comment: formData.get("comment") || undefined,
      routePolyline: formData.get("routePolyline") || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }
    const { createCargoTrip } = await import("@/services/cargo.service");
    const { routePolyline, ...rest } = parsed.data;
    await createCargoTrip(user.id, {
      ...rest,
      date: new Date(parsed.data.date),
      routePolyline,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function updateCargoTripAction(tripId: string, formData: FormData) {
  try {
    const user = await requireRole("CARGO_CARRIER");
    const { cargoTripSchema } = await import("@/lib/validations");
    const parsed = cargoTripSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      vehicleType: formData.get("vehicleType"),
      maxWeightKg: formData.get("maxWeightKg"),
      maxVolumeM3: formData.get("maxVolumeM3") || undefined,
      price: formData.get("price"),
      comment: formData.get("comment") || undefined,
      routePolyline: formData.get("routePolyline") || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }
    const { updateCargoTrip } = await import("@/services/cargo.service");
    const { routePolyline, ...rest } = parsed.data;
    await updateCargoTrip(tripId, user.id, {
      ...rest,
      date: new Date(parsed.data.date),
      routePolyline,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function deleteCargoTripAction(tripId: string) {
  const user = await requireAuth();
  try {
    const { deleteCargoTrip } = await import("@/services/cargo.service");
    await deleteCargoTrip(tripId, user.id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function createCargoRequestAction(formData: FormData) {
  try {
    const user = await requireRole("CARGO_SHIPPER");
    const { cargoRequestSchema } = await import("@/lib/validations");
    const parsed = cargoRequestSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      title: formData.get("title"),
      weightKg: formData.get("weightKg"),
      volumeM3: formData.get("volumeM3") || undefined,
      comment: formData.get("comment") || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }

    let image: string | null = null;
    const photo = formData.get("image");
    if (photo instanceof File && photo.size > 0) {
      const { saveUpload } = await import("@/lib/upload");
      image = await saveUpload(photo, "cargo", user.id);
    }

    const { createCargoRequest } = await import("@/services/cargo.service");
    await createCargoRequest(user.id, {
      ...parsed.data,
      date: new Date(parsed.data.date),
      image,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
    };
  }
}

export async function updateCargoRequestAction(
  requestId: string,
  formData: FormData
) {
  try {
    const user = await requireRole("CARGO_SHIPPER");
    const { cargoRequestSchema } = await import("@/lib/validations");
    const parsed = cargoRequestSchema.safeParse({
      fromCity: formData.get("fromCity"),
      toCity: formData.get("toCity"),
      date: formData.get("date"),
      time: formData.get("time"),
      title: formData.get("title"),
      weightKg: formData.get("weightKg"),
      volumeM3: formData.get("volumeM3") || undefined,
      comment: formData.get("comment") || undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
    }

    let image: string | undefined;
    const photo = formData.get("image");
    if (photo instanceof File && photo.size > 0) {
      const { saveUpload } = await import("@/lib/upload");
      image = await saveUpload(photo, "cargo", user.id);
    }

    const { updateCargoRequest } = await import("@/services/cargo.service");
    await updateCargoRequest(requestId, user.id, {
      ...parsed.data,
      date: new Date(parsed.data.date),
      ...(image !== undefined ? { image } : {}),
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
    };
  }
}

export async function cancelCargoRequestAction(requestId: string) {
  const user = await requireAuth();
  try {
    const { cancelCargoRequest } = await import("@/services/cargo.service");
    await cancelCargoRequest(requestId, user.id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function bookCargoTripAction(tripId: string) {
  try {
    const user = await requireRole("CARGO_SHIPPER");
    const { bookCargoTrip } = await import("@/services/cargo.service");
    const booking = await bookCargoTrip(tripId, user.id);
    revalidatePath("/");
    return { success: true, bookingId: booking.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка бронирования" };
  }
}

export async function takeCargoRequestAction(requestId: string) {
  try {
    const user = await requireRole("CARGO_CARRIER");
    const { takeCargoRequest } = await import("@/services/cargo.service");
    const booking = await takeCargoRequest(requestId, user.id);
    revalidatePath("/");
    return { success: true, bookingId: booking.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function confirmCargoBookingAction(bookingId: string) {
  const user = await requireAuth();
  try {
    const { confirmCargoBooking } = await import("@/services/cargo.service");
    await confirmCargoBooking(bookingId, user.id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function rejectCargoBookingAction(bookingId: string) {
  const user = await requireAuth();
  try {
    const { rejectCargoBooking } = await import("@/services/cargo.service");
    await rejectCargoBooking(bookingId, user.id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

export async function cancelCargoBookingAction(bookingId: string, reason: string) {
  const user = await requireAuth();
  try {
    const { cancelCargoBooking } = await import("@/services/cargo.service");
    await cancelCargoBooking(bookingId, user.id, reason);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка отмены" };
  }
}

