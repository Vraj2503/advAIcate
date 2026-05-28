import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { email, token, username } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Verify OTP using Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) {
      console.error('OTP verification error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Set metadata only — no password (handled in /auth/set-password)
    // The DB trigger handles public.users row creation automatically
    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        {
          user_metadata: {
            full_name: username,
            username: username,
            name: username,
          },
        }
      );

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
      }

      // Update the name in public.users (trigger created the row)
      const { error: nameError } = await supabase
        .from('users')
        .update({ name: username || data.user.email?.split('@')[0] || 'User' })
        .eq('id', data.user.id);

      if (nameError) {
        console.error('Error updating user name:', nameError);
      }
    } catch (syncError) {
      console.error('Error during user setup:', syncError);
    }

    return NextResponse.json({ 
      message: 'Email verified and account created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: username || data.user.email?.split('@')[0]
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}