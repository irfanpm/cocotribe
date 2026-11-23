-- Delivery address for each booking. Additive: existing orders get an empty address and are
-- otherwise unchanged; older code that does not know the column keeps working.
ALTER TABLE "Order" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
