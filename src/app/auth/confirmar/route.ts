import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

// Destino do link enviado por e-mail (troca de senha). Aceita os dois formatos
// do Supabase: ?code=... (PKCE) ou ?token_hash=...&type=...
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const proximo = searchParams.get("proximo") ?? "/painel";
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/painel";
  const supabase = await criarClienteServidor();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("link inválido") };

  if (error) return NextResponse.redirect(`${origin}/esqueci?expirado=1`);
  return NextResponse.redirect(`${origin}${destino}`);
}
