export const BUCKET_FOTOS = "fotos-salas";

export function urlFoto(caminho: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${caminho}`;
}
