import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
    const { email, token, username, password } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
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

    try {
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user with password in Supabase Auth
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        {
          password: password, // Supabase will hash this automatically
          user_metadata: { 
            full_name: username,
            username: username 
          }
        }
      );

      if (updateError) {
        console.error('Error updating user with password:', updateError);
        return NextResponse.json({ error: 'Failed to set password' }, { status: 400 });
      }

      // Sync to custom users table with hashed password
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: username || data.user.email?.split('@')[0] || 'User',
          email: data.user.email!,
          password: hashedPassword, // Store hashed password in custom table
          image: null,
          provider: 'email',
          email_verified: data.user.email_confirmed_at,
          created_at: data.user.created_at || new Date().toISOString(),
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (dbError) {
        console.error('Error syncing to users table:', dbError);
      } else {
        console.log('Successfully synced user to custom table');
      }

    } catch (syncError) {
      console.error('Error during user sync:', syncError);
    }

    return NextResponse.json({ 
      message: 'Email verified, password set, and account created successfully',
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