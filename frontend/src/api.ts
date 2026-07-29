import { supabase } from './supabase';

export type User = {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  member_id: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points_balance: number;
  lifetime_points: number;
  joined_at: string;
  suspended?: boolean;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: string;
  image_url: string;
  active: boolean;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  title: string;
  description: string;
  reward_id?: string | null;
  redemption_code?: string | null;
  used?: boolean;
  used_at?: string | null;
  created_at: string;
  by_admin?: boolean;
  member_name?: string;
  member_id?: string;
};

export type AdminStats = {
  total_members: number;
  suspended: number;
  points_issued_today: number;
  visits_today: number;
  redemptions_today: number;
  week_earn_total: number;
  week_redeem_total: number;
  tiers: { Silver: number; Gold: number; Platinum: number };
  recent: Transaction[];
};

export const api = {
  requestOtp: async (email: string, name?: string) => {
    // Demo Mode: Bypasses SMTP rate limits. No actual email is sent.
    // The user can enter any 6-digit OTP code to continue (e.g. 123456).
    return { ok: true, dev_otp: '123456', message: 'Demo OTP is 123456' };
  },
  
  verifyOtp: async (email: string, otp: string, name?: string) => {
    // Demo Mode: Uses email/password authentication under the hood to create a real session.
    const password = `DemoPassword123!`;
    
    // 1. Try to sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
      },
    });

    let session = signUpData.session;
    let authUser = signUpData.user;

    // 2. If user already exists, sign them in
    if (signUpError && signUpError.message.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      session = signInData.session;
      authUser = signInData.user;
    } else if (signUpError) {
      throw signUpError;
    }

    if (!session || !authUser) {
      throw new Error('Please ensure "Confirm email" is turned OFF in your Supabase Auth Providers -> Email settings, as it is required to auto-confirm demo users.');
    }

    // 3. Fetch public profile (created by trigger) or fallback insert
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
      
    if (profileError) throw profileError;

    let user = userProfile;
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email,
          name: name || 'Golfer',
          member_id: 'PG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          points_balance: 250,
          lifetime_points: 250,
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      user = newUser;
    }
    
    return { token: session.access_token, user: user as User };
  },
  
  me: async (token: string) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('Not logged in');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (userError) throw userError;
    return user as User;
  },
  
  updateName: async (token: string, name: string) => {
    const { data: authData } = await supabase.auth.getUser(token);
    const { data: user, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', authData.user!.id)
      .select()
      .single();
    if (error) throw error;
    return user as User;
  },
  
  upgradeTier: async (token: string, targetTier: 'Silver' | 'Gold' | 'Platinum') => {
    const { data: authData } = await supabase.auth.getUser(token);
    const { data: user, error } = await supabase
      .from('users')
      .update({ tier: targetTier })
      .eq('id', authData.user!.id)
      .select()
      .single();
    if (error) throw error;
    return user as User;
  },
  
  rewards: async (category?: string, token?: string) => {
    let query = supabase.from('rewards').select('*').eq('active', true);
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Reward[];
  },
  
  reward: async (id: string, token?: string) => {
    const { data, error } = await supabase.from('rewards').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Reward;
  },
  
  redeem: async (token: string, reward_id: string) => {
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData.user) throw new Error('Not logged in');
    
    // Fetch reward
    const { data: reward } = await supabase.from('rewards').select('*').eq('id', reward_id).single();
    if (!reward) throw new Error('Reward not found');
    
    // Fetch user
    const { data: user } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
    
    if (user.points_balance < reward.points_cost) {
      throw new Error('Not enough points');
    }
    
    // Deduct points
    const newBalance = user.points_balance - reward.points_cost;
    await supabase.from('users').update({ points_balance: newBalance }).eq('id', user.id);
    
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Insert transaction
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'redeem',
      points: -reward.points_cost,
      title: `Redeemed: ${reward.title}`,
      description: `Redemption Code: ${code}`,
      reward_id: reward.id,
      redemption_code: code,
    }).select().single();
    
    if (txError) throw txError;
    
    return {
      ok: true,
      redemption_code: code,
      new_balance: newBalance,
      reward,
      transaction
    };
  },
  
  transactions: async (token: string) => {
    const { data: authData } = await supabase.auth.getUser(token);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', authData.user!.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },
  
  addPoints: async (token: string, points: number, title?: string) => {
    const { data: authData } = await supabase.auth.getUser(token);
    const { data: user } = await supabase.from('users').select('*').eq('id', authData.user!.id).single();
    
    const newBalance = user.points_balance + points;
    const newLifetime = user.lifetime_points + points;
    
    let tier = user.tier;
    if (newLifetime >= 5000) tier = 'Platinum';
    else if (newLifetime >= 1000) tier = 'Gold';
    
    await supabase.from('users').update({
      points_balance: newBalance,
      lifetime_points: newLifetime,
      tier,
    }).eq('id', user.id);
    
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'earn',
      points,
      title: title || 'Visit at PlayGolf',
    }).select().single();
    
    if (txError) throw txError;
    
    return { ok: true, new_balance: newBalance, lifetime_points: newLifetime, tier, transaction };
  },
  
  logout: async (token: string) => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { ok: true };
  },
};

// Helper to verify admin token with Supabase auth
const verifyAdmin = async (token: string) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || data.user.email !== 'admin@playgolf.com') {
    throw new Error('Unauthorized');
  }
};

// Real Admin API backed by Supabase
export const adminApi = {
  login: async (pin: string) => {
    if (pin === '123456') {
      const email = 'admin@playgolf.com';
      const password = 'AdminPassword123!';
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { ok: true, admin_token: data.session.access_token };
      } catch (err: any) {
        if (err.status === 400 || err.message?.includes('Invalid login credentials') || err.message?.includes('Email not confirmed')) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: 'Staff Admin' } }
          });
          if (error) throw error;
          return { ok: true, admin_token: data.session!.access_token };
        }
        throw err;
      }
    }
    throw new Error('Invalid staff PIN');
  },
  
  logout: async (token: string) => {
    await supabase.auth.signOut();
    return { ok: true };
  },
  
  me: async (token: string) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user || data.user.email !== 'admin@playgolf.com') {
      throw new Error('Invalid token');
    }
    return { ok: true, role: 'staff' };
  },
  
  stats: async (token: string): Promise<AdminStats> => {
    await verifyAdmin(token);
    
    // Fetch all users to compute totals and tier breakdown
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('tier, suspended');
    if (usersError) throw usersError;
    
    const total_members = users?.length || 0;
    const suspended = users?.filter(u => u.suspended).length || 0;
    const tiers = {
      Silver: users?.filter(u => u.tier === 'Silver').length || 0,
      Gold: users?.filter(u => u.tier === 'Gold').length || 0,
      Platinum: users?.filter(u => u.tier === 'Platinum').length || 0,
    };
    
    // Fetch transactions from the last 7 days to aggregate
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: txns, error: txnsError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', sevenDaysAgo);
    if (txnsError) throw txnsError;
    
    const todayStr = new Date().toISOString().substring(0, 10);
    
    let points_issued_today = 0;
    let visits_today = 0;
    let redemptions_today = 0;
    let week_earn_total = 0;
    let week_redeem_total = 0;
    
    (txns || []).forEach(t => {
      const isToday = t.created_at.startsWith(todayStr);
      if (t.type === 'earn') {
        week_earn_total += t.points;
        if (isToday) {
          points_issued_today += t.points;
          visits_today += 1;
        }
      } else if (t.type === 'redeem') {
        week_redeem_total += Math.abs(t.points);
        if (isToday) {
          redemptions_today += 1;
        }
      } else if (t.type === 'adjust') {
        if (t.points > 0) {
          week_earn_total += t.points;
          if (isToday) {
            points_issued_today += t.points;
          }
        } else {
          week_redeem_total += Math.abs(t.points);
        }
      }
    });
    
    // Fetch recent 10 transactions with user details joined
    const { data: recent, error: recentError } = await supabase
      .from('transactions')
      .select('*, users(name, member_id)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (recentError) throw recentError;
    
    const mappedRecent: Transaction[] = (recent || []).map(t => ({
      ...t,
      member_name: (t.users as any)?.name || 'Golfer',
      member_id: (t.users as any)?.member_id || '',
    }));
    
    return {
      total_members,
      suspended,
      points_issued_today,
      visits_today,
      redemptions_today,
      week_earn_total,
      week_redeem_total,
      tiers,
      recent: mappedRecent,
    };
  },
  
  creditPoints: async (token: string, member_id: string, points: number) => {
    await verifyAdmin(token);
    
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('member_id', member_id.toUpperCase())
      .single();
    if (findError || !user) throw new Error('Member not found');
    
    const newBalance = user.points_balance + points;
    const newLifetime = user.lifetime_points + points;
    let tier = user.tier;
    if (newLifetime >= 5000) tier = 'Platinum';
    else if (newLifetime >= 1000) tier = 'Gold';
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ points_balance: newBalance, lifetime_points: newLifetime, tier })
      .eq('id', user.id)
      .select()
      .single();
    if (updateError) throw updateError;
    
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'earn',
      points: points,
      title: 'Visit credited by staff',
      by_admin: true,
    });
    if (txError) throw txError;
    
    return { ok: true, user: updatedUser as User };
  },
  
  verifyRedemption: async (token: string, redemption_code: string) => {
    await verifyAdmin(token);
    
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('*, users(*)')
      .eq('redemption_code', redemption_code.toUpperCase())
      .single();
    if (txnError || !txn) throw new Error('Redemption code not found');
    
    const user = txn.users;
    
    if (txn.used) {
      return {
        already_used: true,
        member: user,
        transaction: txn,
      };
    }
    
    const { data: updatedTxn, error: updateError } = await supabase
      .from('transactions')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', txn.id)
      .select()
      .single();
    if (updateError) throw updateError;
    
    return {
      already_used: false,
      member: user,
      transaction: updatedTxn,
    };
  },
  
  listMembers: async (token: string, query?: string) => {
    await verifyAdmin(token);
    
    let req = supabase.from('users').select('*');
    if (query) {
      req = req.or(`name.ilike.%${query}%,email.ilike.%${query}%,member_id.ilike.%${query}%`);
    }
    const { data, error } = await req.order('joined_at', { ascending: false });
    if (error) throw error;
    return (data || []) as User[];
  },
  
  getMember: async (token: string, id: string) => {
    await verifyAdmin(token);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (userError) throw userError;
    
    const { data: txns, error: txnsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    if (txnsError) throw txnsError;
    
    return { user: user as User, transactions: (txns || []) as Transaction[] };
  },
  
  updateMember: async (token: string, id: string, updates: Partial<User>) => {
    await verifyAdmin(token);
    
    // Get current user first to compute points difference and log adjustments
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !user) throw new Error('Member not found');
    
    let finalUpdates = { ...updates };
    let pointsDiff = 0;
    
    if (updates.points_balance !== undefined) {
      pointsDiff = updates.points_balance - user.points_balance;
      if (pointsDiff !== 0) {
        const newLifetime = user.lifetime_points + (pointsDiff > 0 ? pointsDiff : 0);
        let tier = user.tier;
        if (newLifetime >= 5000) tier = 'Platinum';
        else if (newLifetime >= 1000) tier = 'Gold';
        else tier = 'Silver';
        
        finalUpdates = {
          ...finalUpdates,
          lifetime_points: newLifetime,
          tier,
        };
      }
    }
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;
    
    // Log point adjustment transaction if balance changed
    if (pointsDiff !== 0) {
      await supabase.from('transactions').insert({
        user_id: id,
        type: 'adjust',
        points: pointsDiff,
        title: 'Points adjusted by staff',
        by_admin: true,
      });
    }
    
    return updatedUser as User;
  },
  
  listRewards: async (token: string) => {
    await verifyAdmin(token);
    
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('title', { ascending: true });
    if (error) throw error;
    return (data || []) as Reward[];
  },
  
  createReward: async (token: string, reward: Omit<Reward, 'id'>) => {
    await verifyAdmin(token);
    
    const { data, error } = await supabase
      .from('rewards')
      .insert(reward)
      .select()
      .single();
    if (error) throw error;
    return data as Reward;
  },
  
  updateReward: async (token: string, id: string, updates: Partial<Reward>) => {
    await verifyAdmin(token);
    
    const { data, error } = await supabase
      .from('rewards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Reward;
  },
  
  deleteReward: async (token: string, id: string) => {
    await verifyAdmin(token);
    
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
};
