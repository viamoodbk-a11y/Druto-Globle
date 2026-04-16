-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'restaurant_owner', 'customer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'cafe',
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  opening_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rewards table (per restaurant reward configurations)
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stamps_required INTEGER NOT NULL DEFAULT 10,
  reward_image_url TEXT,
  expiry_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create loyalty_cards table (user progress at each restaurant)
CREATE TABLE public.loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  current_stamps INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

-- Create scans table (individual scan records)
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_verified BOOLEAN DEFAULT false,
  staff_approved BOOLEAN DEFAULT false
);

-- Create claimed_rewards table
CREATE TABLE public.claimed_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  is_redeemed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claimed_rewards ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Restaurants policies
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage own restaurants" ON public.restaurants
  FOR ALL USING (auth.uid() = owner_id);

-- Rewards policies
CREATE POLICY "Anyone can view active rewards" ON public.rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Restaurant owners can manage rewards" ON public.rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = rewards.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Loyalty cards policies
CREATE POLICY "Users can view own loyalty cards" ON public.loyalty_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty cards" ON public.loyalty_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty cards" ON public.loyalty_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can view their customers cards" ON public.loyalty_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = loyalty_cards.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Scans policies
CREATE POLICY "Users can view own scans" ON public.scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON public.scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can view their scans" ON public.scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = scans.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Claimed rewards policies
CREATE POLICY "Users can view own claimed rewards" ON public.claimed_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claimed rewards" ON public.claimed_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claimed rewards" ON public.claimed_rewards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can view claimed rewards" ON public.claimed_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = claimed_rewards.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_cards_updated_at
  BEFORE UPDATE ON public.loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Default role is customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();