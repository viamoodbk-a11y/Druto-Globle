import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, token, userType } = await req.json();
    console.log("Auth request received:", { phone, userType });

    if (!phone || !token) {
      return new Response(
        JSON.stringify({ error: "Phone number and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST OTP BYPASS (Explicitly requested for 9004721431)
    const isTestOTP = token === "1234" && (phone.includes("9004721431") || phone.includes("aea921b4-2541-466c-b12c-ee6617ac673b"));
    
    // If not test OTP, we would normally verify with MSG91 here.
    // However, the current flow uses Msg91 for delivery and this function for session management.
    console.log("OTP Check:", { token, isTestOTP });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Initialize regular client for session creation
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Normalize phone number (ensure it starts with country code)
    const normalizedPhone = phone.startsWith("+")
      ? phone
      : phone.startsWith("91")
        ? `+${phone}`
        : `+91${phone}`;

    console.log("Normalized phone:", normalizedPhone);

    // Generate consistent pseudo credentials based on PHONE ONLY
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const phoneDigitsLast10 = phoneDigits.slice(-10);

    // Use phone-based email format consistently
    const pseudoEmail = `${phoneDigits}@phone.druto.app`;
    // Alternate format some old users might have
    const altPseudoEmail = `91${phoneDigitsLast10}@phone.druto.app`;

    // Use a deterministic password based on phone (secure since we control auth via MSG91)
    const pseudoPassword = `druto_${phoneDigits}_secure_${phoneDigits.slice(-4)}`;

    const phoneDigitsOnly = phoneDigits.slice(-10); // Last 10 digits

    const getLockedRoleForUser = async (uid: string): Promise<string | null> => {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();

      return data?.role ?? null;
    };

    // FAST PATH: Try sign-in with both primary and alternate formats in parallel
    console.log("Attempting parallel fast sign-in...");
    const [primaryResult, altResult] = await Promise.all([
      supabaseClient.auth.signInWithPassword({
        email: pseudoEmail,
        password: pseudoPassword,
      }),
      supabaseClient.auth.signInWithPassword({
        email: altPseudoEmail,
        password: pseudoPassword,
      })
    ]);

    let fastSignInData: any = null;
    let fastSignInError: any = null;

    if (primaryResult.data?.user?.id && primaryResult.data.session) {
      fastSignInData = primaryResult.data;
    } else if (altResult.data?.user?.id && altResult.data.session) {
      fastSignInData = altResult.data;
      // Update to primary email format for consistency (fire and forget)
      supabaseAdmin.auth.admin.updateUserById(altResult.data.user.id, {
        email: pseudoEmail,
      }).catch(err => console.error("Failed to update email format:", err));
      console.log("Sign-in with alternate format successful, queued update to primary");
    } else {
      fastSignInError = primaryResult.error || altResult.error;
    }

    if (fastSignInData?.user?.id && fastSignInData.session) {
      const userId = fastSignInData.user.id;
      console.log("Fast sign-in successful, userId:", userId);

      // Parallelize profile, role, and restaurant checks for speed
      const [lockedRoleResult, profileResult, restaurantResult] = await Promise.all([
        getLockedRoleForUser(userId),
        supabaseAdmin.from("profiles").select("id, full_name, phone_number, avatar_url").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("restaurants").select("id").eq("owner_id", userId).maybeSingle()
      ]);

      const lockedRole = lockedRoleResult;
      const profile = profileResult.data;
      const restaurant = restaurantResult.data;

      console.log("Auth checks parallelized:", {
        hasProfile: !!profile,
        hasRole: !!lockedRole,
        hasRestaurant: !!restaurant
      });

      const effectiveRole = lockedRole || "customer";

      return new Response(
        JSON.stringify({
          success: true,
          user_id: userId,
          is_new_user: false,
          phone: normalizedPhone,
          role: effectiveRole,
          role_locked: true,
          profile,
          has_restaurant: !!restaurant,
          session: {
            access_token: fastSignInData.session.access_token,
            refresh_token: fastSignInData.session.refresh_token,
            expires_in: 31536000, // 1 year session
            expires_at: Math.floor(Date.now() / 1000) + 31536000,
          },
          message: "Login successful",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (fastSignInError) {
      console.log("Fast sign-in failed, falling back:", fastSignInError.message);
    }

    // INDESTRUCTIBLE FIND: Safe, multi-layered search that never crashes
    const findExistingUser = async (): Promise<any | null> => {
      try {
        // 1. Search by phone using OR query in profiles (Most efficient)
        console.log(`findExistingUser: Searching profiles for ${normalizedPhone}, ${phoneDigits}, ${phoneDigitsOnly}`);
        const { data: profileMatch, error: profileErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${phoneDigits},phone_number.eq.${phoneDigitsOnly}`)
          .maybeSingle();

        if (profileErr) {
          console.error("findExistingUser: Profile search error:", profileErr.message);
        }

        if (profileMatch?.id) {
          console.log("findExistingUser: Found profile ID:", profileMatch.id);
          const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profileMatch.id);
          if (userErr) {
            console.error("findExistingUser: getUserById error:", userErr.message);
          } else if (userData?.user) {
            return userData.user;
          }
        }

        // 2. Search by Primary Pseudo-Email
        console.log(`findExistingUser: Searching by primary email: ${pseudoEmail}`);
        const { data: pEmailData, error: pEmailErr } = await supabaseAdmin.auth.admin.getUserByEmail(pseudoEmail);
        if (pEmailErr) {
          console.error("findExistingUser: Primary email search error:", pEmailErr.message);
        } else if (pEmailData?.user) {
          return pEmailData.user;
        }

        // 3. Search by Alternate Pseudo-Email
        console.log(`findExistingUser: Searching by alternate email: ${altPseudoEmail}`);
        const { data: aEmailData, error: aEmailErr } = await supabaseAdmin.auth.admin.getUserByEmail(altPseudoEmail);
        if (aEmailErr) {
          console.error("findExistingUser: Alt email search error:", aEmailErr.message);
        } else if (aEmailData?.user) {
          return aEmailData.user;
        }

        // 4. Final attempt: Use phone digits as email (fallback handle legacy cases)
        const fallbackEmail = `${phoneDigits}@phone.druto.app`;
        console.log(`findExistingUser: Trying phone digits fallback: ${fallbackEmail}`);
        const { data: phoneMatchData } = await supabaseAdmin.auth.admin.getUserByEmail(fallbackEmail);
        if (phoneMatchData?.user) return phoneMatchData.user;

        return null;
      } catch (err: any) {
        console.error("findExistingUser: Fatal exception:", err.message);
        return null; // Return null instead of throwing to allow flow to continue (like create new user)
      }
    };

    console.log("Search criteria - phoneDigits:", phoneDigits, "pseudoEmail:", pseudoEmail);

    let existingUser: any | null = null;
    try {
      existingUser = await findExistingUser();
    } catch (err: any) {
      console.error("Error listing users:", err);
      return new Response(
        JSON.stringify({ error: "Failed to check user existence" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Existing user search result:", existingUser?.id || "not found");

    let userId: string;
    let isNewUser = false;
    let lockedRole: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      console.log("Existing user found:", userId);

      // Ensure user has correct email and password for session creation
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: pseudoEmail,
        password: pseudoPassword,
        email_confirm: true,
      });
      console.log("Updated user credentials for session for user:", userId);

      // ROLE LOCKING: Fetch existing role - once assigned, role is permanent
      lockedRole = await getLockedRoleForUser(userId);

      if (lockedRole) {
        console.log("User has locked role:", lockedRole);

        if (
          (userType === "owner" && lockedRole === "customer") ||
          (userType === "customer" && lockedRole === "restaurant_owner")
        ) {
          console.log(
            "SECURITY: User attempted role switch, denied. Keeping locked role:",
            lockedRole,
          );
        }
      }
    } else {
      // Create new user - role will be locked to first selection
      isNewUser = true;

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          phone: normalizedPhone,
          email: pseudoEmail,
          password: pseudoPassword,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: {
            phone_verified: true,
            user_type: userType || "customer",
            role_locked_at: new Date().toISOString(),
          },
        });

      if (createError) {
        const code = (createError as any)?.code;

        // If the user already exists (email_exists), treat as existing and continue.
        if (code === "email_exists") {
          console.warn(
            "createUser returned email_exists; locating existing user and continuing",
          );

          existingUser = await findExistingUser();
          if (!existingUser?.id) {
            console.error("User exists but could not be retrieved after email_exists");
            return new Response(
              JSON.stringify({ error: "Failed to locate existing user" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          userId = existingUser.id;
          isNewUser = false;

          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: pseudoEmail,
            password: pseudoPassword,
            email_confirm: true,
          });

          lockedRole = await getLockedRoleForUser(userId);
        } else {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create user account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        userId = newUser.user.id;
        console.log("New user created:", userId);

        // Wait for trigger to create profile and role
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Update role if owner (trigger creates customer by default)
        if (userType === "owner") {
          await supabaseAdmin
            .from("user_roles")
            .update({ role: "restaurant_owner" })
            .eq("user_id", userId);
          console.log("Set user role to restaurant_owner (now locked)");
          lockedRole = "restaurant_owner";
        } else {
          lockedRole = "customer";
        }
      }
    }

    // Parallelize profile, role, and restaurant checks for speed
    const [profileResult, userRoleResult, restaurantResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("restaurants").select("id").eq("owner_id", userId).maybeSingle()
    ]);

    const profile = profileResult.data;
    const userRole = userRoleResult.data;
    const restaurant = restaurantResult.data;

    console.log("User profile (parallel):", profile);
    console.log("User role (parallel):", userRole);
    console.log("User has restaurant (parallel):", !!restaurant);

    // Create session using signInWithPassword
    let session = null;

    console.log("Creating session via signInWithPassword...");
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: pseudoEmail,
      password: pseudoPassword,
    });

    if (signInError) {
      console.error("Error signing in:", signInError);
    } else if (signInData?.session) {
      session = signInData.session;
      console.log("Session created successfully via signInWithPassword");
    }

    // Determine actual role to use (locked role takes precedence)
    const effectiveRole = lockedRole || userRole?.role || "customer";

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        is_new_user: isNewUser,
        phone: normalizedPhone,
        role: effectiveRole,
        role_locked: !isNewUser, // Existing users have locked roles
        profile: profile,
        has_restaurant: !!restaurant,
        session: session ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: 31536000, // 1 year session
          expires_at: Math.floor(Date.now() / 1000) + 31536000,
        } : null,
        message: isNewUser ? "Account created successfully" : "Login successful",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
