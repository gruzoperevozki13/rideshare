import { z } from "zod";

export const tripSchema = z.object({
  fromCity: z
    .string()
    .min(2, "Укажите адрес отправления")
    .max(200, "Слишком длинный адрес"),
  toCity: z
    .string()
    .min(2, "Укажите адрес прибытия")
    .max(200, "Слишком длинный адрес"),
  date: z.string().min(1, "Укажите дату"),
  time: z.string().min(1, "Укажите время"),
  seats: z.coerce.number().int().min(1).max(8),
  price: z.coerce.number().min(0),
  comment: z.string().optional(),
  routePolyline: z.string().optional(),
  durationMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
  distanceKm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional()
  ),
});

export const tripSearchSchema = z.object({
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  /** Точная дата (если задана — имеет приоритет над диапазоном) */
  date: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  priceMax: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  seatsMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(8).optional()
  ),
  sortBy: z.enum(["date", "price_asc", "price_desc", "duration"]).optional(),
  alongRoute: z.coerce.boolean().optional(),
});

export const wishSchema = z.object({
  fromCity: z
    .string()
    .min(2, "Укажите адрес отправления")
    .max(200, "Слишком длинный адрес"),
  toCity: z
    .string()
    .min(2, "Укажите адрес прибытия")
    .max(200, "Слишком длинный адрес"),
  date: z.string().min(1, "Укажите дату"),
  time: z.string().min(1, "Укажите время"),
  seats: z.coerce.number().int().min(1).max(8).default(1),
  price: z.coerce.number().min(0, "Укажите цену"),
  comment: z.string().optional(),
});

export const proposalSchema = z.object({
  wishId: z.string().min(1),
  tripId: z.string().optional(),
  price: z.coerce.number().min(0),
  time: z.string().optional(),
  message: z.string().max(500).optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Имя должно быть не менее 2 символов"),
  phone: z
    .string()
    .min(10, "Укажите номер телефона")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Некорректный номер"),
  bio: z.string().max(500).optional(),
  carBrand: z.string().max(50).optional(),
  carModel: z.string().max(50).optional(),
  carColor: z.string().max(40).optional(),
  carPlate: z.string().max(20).optional(),
  carYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1980).max(2100).optional()
  ),
});

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Укажите номер телефона")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Некорректный номер"),
});

export const roleSchema = z.object({
  role: z.enum(["DRIVER", "PASSENGER", "CARGO_CARRIER", "CARGO_SHIPPER"]),
  phone: z
    .string()
    .min(10, "Укажите номер телефона")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Некорректный номер")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Имя должно быть не менее 2 символов"),
  email: z.string().email("Некорректный email"),
  phone: z
    .string()
    .min(10, "Укажите номер телефона")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Некорректный номер"),
  password: z.string().min(6, "Пароль не менее 6 символов"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({
      message: "Подтвердите, что ознакомились с правилами безопасности",
    }),
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Некорректный email"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Некорректный email"),
  code: z
    .string()
    .regex(/^\d{6}$/, "Введите 6-значный код из письма"),
  password: z.string().min(6, "Пароль не менее 6 символов"),
});

export const messageSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().min(1, "Введите сообщение").max(1000),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const cargoTripSchema = z.object({
  fromCity: z
    .string()
    .min(2, "Укажите адрес отправления")
    .max(200, "Слишком длинный адрес"),
  toCity: z
    .string()
    .min(2, "Укажите адрес прибытия")
    .max(200, "Слишком длинный адрес"),
  date: z.string().min(1, "Укажите дату"),
  time: z.string().min(1, "Укажите время"),
  vehicleType: z.string().min(2, "Укажите тип транспорта"),
  maxWeightKg: z.coerce.number().positive("Укажите грузоподъёмность"),
  maxVolumeM3: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  price: z.coerce.number().min(0),
  comment: z.string().optional(),
  routePolyline: z.string().optional(),
});

export const cargoRequestSchema = z.object({
  fromCity: z
    .string()
    .min(2, "Укажите адрес отправления")
    .max(200, "Слишком длинный адрес"),
  toCity: z
    .string()
    .min(2, "Укажите адрес прибытия")
    .max(200, "Слишком длинный адрес"),
  date: z.string().min(1, "Укажите дату передачи"),
  time: z.string().min(1, "Укажите время передачи"),
  title: z.string().min(2, "Опишите груз"),
  weightKg: z.coerce.number().positive("Укажите вес груза"),
  volumeM3: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  price: z.coerce.number().min(0, "Укажите цену"),
  comment: z.string().optional(),
});

export const cargoSearchSchema = z.object({
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  date: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  priceMax: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  sortBy: z.enum(["date", "price_asc", "price_desc", "duration"]).optional(),
  alongRoute: z.coerce.boolean().optional(),
  seatsMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(8).optional()
  ),
});

export type TripFormData = z.infer<typeof tripSchema>;
export type TripSearchData = z.infer<typeof tripSearchSchema>;
export type WishFormData = z.infer<typeof wishSchema>;
export type ProposalFormData = z.infer<typeof proposalSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CargoTripFormData = z.infer<typeof cargoTripSchema>;
export type CargoRequestFormData = z.infer<typeof cargoRequestSchema>;
export type CargoSearchData = z.infer<typeof cargoSearchSchema>;
