-- PfotenNetz Database Migration 067: Urlaubspflege-Ort und Nachbarschafts-Tauschbörse

-- A vacation booking can either take place at the pet owner's home (visits)
-- or at the helper's home (temporary stay). The address remains optional and
-- is only shared with the booking participants.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS care_location TEXT NOT NULL DEFAULT 'at_owner_home';

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_care_location_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_care_location_check
  CHECK (care_location IN ('at_owner_home', 'at_helper_home'));

CREATE TYPE public.marketplace_listing_kind AS ENUM ('giveaway', 'swap', 'sell', 'wanted');
CREATE TYPE public.marketplace_listing_status AS ENUM ('active', 'reserved', 'completed', 'withdrawn');

CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.marketplace_listing_kind NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  condition TEXT,
  price_eur_cents INTEGER,
  exchange_for TEXT,
  location_area TEXT,
  status public.marketplace_listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_title_length CHECK (char_length(title) BETWEEN 3 AND 100),
  CONSTRAINT marketplace_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT marketplace_price CHECK (price_eur_cents IS NULL OR price_eur_cents >= 0)
);

CREATE INDEX marketplace_listings_active_idx
  ON public.marketplace_listings(status, kind, created_at DESC);
CREATE INDEX marketplace_listings_category_idx
  ON public.marketplace_listings(category);

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read active marketplace listings"
  ON public.marketplace_listings FOR SELECT TO authenticated
  USING (status <> 'withdrawn' OR owner_id = auth.uid());

CREATE POLICY "Users create own marketplace listings"
  ON public.marketplace_listings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users manage own marketplace listings"
  ON public.marketplace_listings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users delete own marketplace listings"
  ON public.marketplace_listings FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Contact stays inside PfotenNetz. It deliberately does not expose email or
-- phone numbers and can later be connected to notifications/chat.
CREATE TABLE public.marketplace_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, requester_id)
);

CREATE INDEX marketplace_inquiries_listing_idx ON public.marketplace_inquiries(listing_id, created_at DESC);

CREATE TRIGGER update_marketplace_inquiries_updated_at
  BEFORE UPDATE ON public.marketplace_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.prevent_marketplace_inquiry_identity_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_id <> OLD.listing_id OR NEW.requester_id <> OLD.requester_id THEN
    RAISE EXCEPTION 'Marketplace inquiry identity cannot change';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER protect_marketplace_inquiry_identity
  BEFORE UPDATE ON public.marketplace_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_marketplace_inquiry_identity_change();

ALTER TABLE public.marketplace_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace participants read inquiries"
  ON public.marketplace_inquiries FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_listings listing
      WHERE listing.id = marketplace_inquiries.listing_id
        AND listing.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users create marketplace inquiries"
  ON public.marketplace_inquiries FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketplace_listings listing
      WHERE listing.id = marketplace_inquiries.listing_id
        AND listing.owner_id <> auth.uid()
        AND listing.status = 'active'
    )
  );

CREATE POLICY "Inquiry participants update inquiries"
  ON public.marketplace_inquiries FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_listings listing
      WHERE listing.id = marketplace_inquiries.listing_id
        AND listing.owner_id = auth.uid()
    )
  );
