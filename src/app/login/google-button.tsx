'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function GoogleButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-primary w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createClient().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }}
    >
      Continue with Google
    </button>
  );
}
