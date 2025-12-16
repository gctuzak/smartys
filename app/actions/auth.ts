'use server'

import { supabase } from "@/lib/supabase";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Lütfen tüm alanları doldurunuz." };
  }

  try {
    // 1. Fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return { error: "Kullanıcı bulunamadı." };
    }

    // 2. Verify password
    let isValid = false;
    
    // Handle cases where password column might be empty (defaulting to 123456 logic)
    // or plain text, or hashed.
    const dbPassword = user.password;

    if (!dbPassword) {
        // Default password fallback
        if (password === '123456') {
            isValid = true;
            // Auto-migrate to hash
            const hash = await bcrypt.hash(password, 10);
            await supabase.from('users').update({ password: hash }).eq('id', user.id);
        }
    } else {
        // Check if it looks like a bcrypt hash
        const isHash = dbPassword.startsWith('$2');
        if (isHash) {
            isValid = await bcrypt.compare(password, dbPassword);
        } else {
            // Plain text check
            isValid = dbPassword === password;
            if (isValid) {
                 // Auto-migrate to hash
                 const hash = await bcrypt.hash(password, 10);
                 await supabase.from('users').update({ password: hash }).eq('id', user.id);
            }
        }
    }

    if (!isValid) {
      return { error: "Hatalı şifre." };
    }

    // 3. Create session
    await createSession(user.id, user.role || 'representative');

  } catch (err) {
    console.error("Login error:", err);
    return { error: "Bir hata oluştu." };
  }
  
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function changePasswordAction(prevState: any, formData: FormData) {
    const session = await getSession();
    if (!session) return { error: "Oturum bulunamadı." };

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
        return { error: "Yeni şifreler eşleşmiyor." };
    }

    if (!newPassword || newPassword.length < 6) {
        return { error: "Yeni şifre en az 6 karakter olmalıdır." };
    }

    // Verify current password
    const { data: user } = await supabase
        .from("users")
        .select("password")
        .eq("id", session.userId)
        .single();
    
    if (!user) return { error: "Kullanıcı bulunamadı." };

    let isValid = false;
    const dbPassword = user.password;

    if (!dbPassword) {
        isValid = currentPassword === '123456';
    } else if (dbPassword.startsWith('$2')) {
        isValid = await bcrypt.compare(currentPassword, dbPassword);
    } else {
        isValid = dbPassword === currentPassword;
    }

    if (!isValid) {
        return { error: "Mevcut şifre hatalı." };
    }

    // Update
    const hash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
        .from("users")
        .update({ password: hash })
        .eq("id", session.userId);

    if (error) return { error: "Şifre güncellenemedi." };

    revalidatePath("/profile");
    return { success: "Şifre başarıyla güncellendi." };
}
