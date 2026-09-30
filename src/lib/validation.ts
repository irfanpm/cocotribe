import { z } from "zod";
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()+-]/g, ""))
  .pipe(z.string().regex(/^(?:91)?[6-9]\d{9}$/))
  .transform((v) => (v.length === 10 ? `91${v}` : v));
export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  productId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(1000),
  expectedUnitPrice: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().min(1).max(100),
  notes: z.string().trim().max(1000).default(""),
  method: z.enum(["DELIVERY", "RAZORPAY"]),
  language: z.enum(["en", "ml", "ta", "hi"]),
  requestKey: z.string().uuid(),
});
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
});
export const productSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  nameEn: z.string().min(1).max(100),
  nameMl: z.string().min(1).max(150),
  descriptionEn: z.string().min(1).max(2000),
  descriptionMl: z.string().min(1).max(3000),
  price: z.number().int().min(100).max(10000000),
  image: z.string().regex(/^\/images\/[a-zA-Z0-9_.-]+$/),
  stock: z.number().int().min(0).max(10000000),
  active: z.boolean(),
});
export const slotSchema = z.object({
  label: z.string().min(1).max(60),
  startMinute: z.number().int().min(0).max(1439),
  capacity: z.number().int().min(1).max(10000),
  active: z.boolean(),
});
export const faqSchema = z.object({
  questionEn: z.string().min(1).max(300),
  questionMl: z.string().min(1).max(500),
  answerEn: z.string().min(1).max(3000),
  answerMl: z.string().min(1).max(4000),
  position: z.number().int().min(0),
  active: z.boolean(),
});
export const settingsSchema = z.object({
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z.union([z.email(), z.literal("")]),
  addressEn: z.string().min(1).max(500),
  addressMl: z.string().min(1).max(800),
  hoursEn: z.string().min(1).max(300),
  hoursMl: z.string().min(1).max(500),
  heroEn: z.string().min(1).max(200),
  heroMl: z.string().min(1).max(300),
  aboutEn: z.string().min(1).max(3000),
  aboutMl: z.string().min(1).max(4000),
  leadHours: z.number().int().min(1).max(168),
  maxDays: z.number().int().min(1).max(365),
  deliveryEnabled: z.boolean(),
});
export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validBookingTime(
  date: string,
  startMinute: number,
  leadHours: number,
  maxDays: number,
  now = new Date(),
) {
  const at = new Date(`${date}T00:00:00+05:30`);
  if (!Number.isFinite(at.getTime()) || indiaDate(at) !== date) return false;
  at.setTime(at.getTime() + startMinute * 60000);
  return (
    at.getTime() >= now.getTime() + leadHours * 3600000 &&
    date <= indiaDate(new Date(now.getTime() + maxDays * 86400000))
  );
}
